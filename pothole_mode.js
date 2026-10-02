/**
 * ==========================================================
 * POTHOLE CHESS MODE — TABLETOP PLUGIN FOR JS CHESS
 * ==========================================================
 * Core Rules: R1 - R11
 * Every pothole has an owner, lasts exactly two turns (owner's,
 * then opponent's), and is removed by the opponent at the end of their turn.
 * A king on a pothole is frozen instead of lost, preserving standard checkmate.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PotholeMode = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  // Rule configuration constants
  const POTHOLE_CONFIG = {
    DIE_SIDES: 8,
    PLACE_ON: "even", // "even" (2,4,6,8) | "always" (every turn)
    FILE_MAP: { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h' },
    ROLL_ORDER: ["rank", "file"],
    ANIMATION_DURATION_MS: 600,
    AUTO_ADVANCE_DELAY_MS: 1600
  };

  const PotholeMode = {
    name: 'pothole',
    displayName: 'Pothole Chess',
    config: POTHOLE_CONFIG,

    // Injectable RNG (default Math.random) for deterministic tests and replays
    _rng: Math.random,
    setRng: function (fn) {
      this._rng = typeof fn === 'function' ? fn : Math.random;
    },
    rollD8: function () {
      return Math.floor(this._rng() * POTHOLE_CONFIG.DIE_SIDES) + 1;
    },

    state: {
      active: false,
      potholes: [], // Array of { square: 'e4', cellId: '5_4', owner: 'w'|'b' } (max 2 entries)
      lastRoll: null, // { player: 'w'|'b', gate: n, rank: n|null, file: n|null, placed: bool, square: string|null, cellId: string|null, fell: pieceOrNull }
      isRolling: false,
      rollTimer: null,
      turnCount: 0,
      rollHistory: []
    },

    // ----------------------------------------------------------
    // LIFECYCLE & PLUGIN REGISTRATION
    // ----------------------------------------------------------
    init: function () {
      this.resetState();
      this.bindEvents();
    },

    onActivate: function () {
      this.state.active = true;
      if (typeof $ !== 'undefined') {
        $('body').addClass('mode-pothole');
      }
      this.renderUI();
      // If fresh game, trigger turn start for White
      if (typeof main !== 'undefined' && main.variables && !main.variables.gameOver) {
        if (this.state.potholes.length === 0 && (!this.state.lastRoll || main.variables.moveHistory.length === 0)) {
          this.onTurnStart('w');
        }
      }

      let tutorialPromptSeen = false;
      try {
        tutorialPromptSeen = (typeof localStorage !== 'undefined') && localStorage.getItem('chess_pothole_tutorial_prompt_seen') === 'true';
      } catch (e) {}

      if (!tutorialPromptSeen && typeof $ !== 'undefined') {
        setTimeout(() => {
          if (PotholeMode.state.active) {
            PotholeMode.showTutorialPrompt();
          }
        }, 400);
      }
    },

    onDeactivate: function () {
      this.state.active = false;
      this.state.isRolling = false;
      if (this.state.rollTimer) {
        clearTimeout(this.state.rollTimer);
        this.state.rollTimer = null;
      }
      this.hideDiceUI();
      if (this.tutorial && this.tutorial.active) {
        this.tutorial.finish();
      }
      if (typeof $ !== 'undefined') {
        $('body').removeClass('mode-pothole');
        $('.pothole-marker').remove();
        $('.gamecell').removeClass('has-pothole has-frozen-king');
        $('.frozen-king-badge').remove();
        $('#pothole-status-panel').hide();
        $('#pothole-tutorial-prompt').remove();
        $('#pothole-tutorial-overlay').css('display', 'none');
      }
    },

    resetState: function () {
      if (this.state.rollTimer) {
        clearTimeout(this.state.rollTimer);
        this.state.rollTimer = null;
      }
      this.state.potholes = [];
      this.state.lastRoll = null;
      this.state.isRolling = false;
      this.state.turnCount = 0;
      this.state.rollHistory = [];
      this.hideDiceUI();
    },

    onReset: function () {
      this.resetState();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // ENGINE QUERIES (Used by script.js for move generation & check)
    // ----------------------------------------------------------

    /**
     * R7: Is a given square an active pothole?
     * @param {string} cellId - e.g. "5_4"
     * @returns {boolean}
     */
    isPothole: function (cellId) {
      if (!this.state.active) return false;
      return this.state.potholes.some(p => p.cellId === cellId);
    },

    /**
     * R9: Is the King of the given color standing on a pothole?
     * @param {string} color - 'w' | 'b'
     * @returns {boolean}
     */
    isKingFrozen: function (color) {
      if (!this.state.active) return false;
      if (typeof main === 'undefined' || !main.methods || !main.variables) return false;
      let kingKey = color + '_king';
      let kingObj = main.variables.pieces[kingKey];
      if (!kingObj || kingObj.captured || !kingObj.position) return false;
      return this.isPothole(kingObj.position);
    },

    /**
     * Prevents board interaction while dice is rolling
     */
    isActionBlocked: function () {
      return this.state.active && this.state.isRolling;
    },

    /**
     * R7 / R9: Filter legal moves to prevent landing on potholes or moving frozen king
     */
    filterLegalMoves: function (pieceKey, moves) {
      if (!this.state.active) return moves;
      if (this.state.isRolling) return [];

      let color = (typeof main !== 'undefined' && main.methods) ? main.methods.pieceColor(pieceKey) : pieceKey.charAt(0);
      let type = (typeof main !== 'undefined' && main.methods) ? main.methods.pieceTypeOf(pieceKey) : '';

      // R9: Frozen king cannot move at all
      if (type === 'king' && this.isKingFrozen(color)) {
        return [];
      }

      // R7: No piece may land on an active pothole
      return moves.filter(moveToken => {
        let targetId = moveToken.indexOf('_') !== -1 ? moveToken.split('_').slice(0, 2).join('_') : moveToken;
        return !this.isPothole(targetId);
      });
    },

    // ----------------------------------------------------------
    // TURN LIFECYCLE & POTHOLE MECHANICS
    // ----------------------------------------------------------

    /**
     * startTurn(player):
     * R2 / R3 / R6 / R8
     * Roll gate -> if even, roll rank and file -> placePothole -> resolve -> check game status
     */
    onTurnStart: function (player, optRollOverrides) {
      if (!this.state.active) return;
      if (typeof main !== 'undefined' && main.variables && main.variables.gameOver) return;

      this.state.isRolling = true;
      this.state.turnCount++;

      // Automated/Override mode (used in test suite or simulation)
      if (optRollOverrides) {
        let gate = (optRollOverrides.gate !== undefined)
          ? optRollOverrides.gate
          : this.rollD8();

        let shouldPlace = false;
        if (POTHOLE_CONFIG.PLACE_ON === "always") {
          shouldPlace = true;
        } else {
          shouldPlace = (gate % 2 === 0);
        }

        let rollRecord = {
          turn: this.state.turnCount,
          player: player,
          gate: gate,
          rank: null,
          file: null,
          placed: false,
          square: null,
          cellId: null,
          fell: null,
          isOverlap: false,
          frozenKing: false
        };

        if (shouldPlace) {
          let rank = (optRollOverrides.rank !== undefined)
            ? optRollOverrides.rank
            : this.rollD8();
          let file = (optRollOverrides.file !== undefined)
            ? optRollOverrides.file
            : this.rollD8();

          let fileLetter = POTHOLE_CONFIG.FILE_MAP[file] || 'a';
          let square = fileLetter + rank;
          let cellId = file + '_' + rank;

          rollRecord.rank = rank;
          rollRecord.file = file;
          rollRecord.placed = true;
          rollRecord.square = square;
          rollRecord.cellId = cellId;

          let result = this.placePothole(cellId, square, player);
          rollRecord.fell = result.fell;
          rollRecord.isOverlap = result.isOverlap;
          rollRecord.frozenKing = result.frozenKing;
        }

        this.state.lastRoll = rollRecord;
        this.state.rollHistory.push(rollRecord);
        this.recordPotholeEventInHistory(rollRecord);
        this.state.isRolling = false;
        this.renderUI();
        this.evaluatePostRollGameStatus(player);
        return;
      }

      // If running headless without DOM
      if (typeof $ === 'undefined' || typeof document === 'undefined' || !$('#board-wrapper').length) {
        let gate = this.rollD8();
        let shouldPlace = (POTHOLE_CONFIG.PLACE_ON === "always") || (gate % 2 === 0);
        let rollRecord = {
          turn: this.state.turnCount,
          player: player,
          gate: gate,
          rank: null,
          file: null,
          placed: false,
          square: null,
          cellId: null,
          fell: null,
          isOverlap: false,
          frozenKing: false
        };
        if (shouldPlace) {
          let rank = this.rollD8();
          let file = this.rollD8();
          let fileLetter = POTHOLE_CONFIG.FILE_MAP[file] || 'a';
          let square = fileLetter + rank;
          let cellId = file + '_' + rank;
          rollRecord.rank = rank;
          rollRecord.file = file;
          rollRecord.placed = true;
          rollRecord.square = square;
          rollRecord.cellId = cellId;
          let result = this.placePothole(cellId, square, player);
          rollRecord.fell = result.fell;
          rollRecord.isOverlap = result.isOverlap;
          rollRecord.frozenKing = result.frozenKing;
        }
        this.state.lastRoll = rollRecord;
        this.state.rollHistory.push(rollRecord);
        this.recordPotholeEventInHistory(rollRecord);
        this.state.isRolling = false;
        this.renderUI();
        this.evaluatePostRollGameStatus(player);
        return;
      }

      // Human Interactive Dice Roll
      this.showInteractiveDicePrompt(player);
    },

    /**
     * R4 / R6 / R8 / R9
     * Place pothole on cellId and resolve piece fall / overlap
     */
    placePothole: function (cellId, square, player) {
      let existingIdx = this.state.potholes.findIndex(p => p.cellId === cellId);
      let isOverlap = (existingIdx !== -1);
      let fellPiece = null;
      let frozenKing = false;

      if (isOverlap) {
        // R8: Rolling onto an active pothole transfers ownership and restarts 2-turn lifetime
        this.state.potholes[existingIdx].owner = player;
      } else {
        // Add new pothole (at most 2 potholes exist at once)
        this.state.potholes.push({
          square: square,
          cellId: cellId,
          owner: player
        });
      }

      // Check piece on square
      let board = (typeof main !== 'undefined' && main.methods) ? main.methods.getBoard() : {};
      let pieceKey = board[cellId];

      if (pieceKey && pieceKey !== 'null') {
        let type = main.methods.pieceTypeOf(pieceKey);
        let color = main.methods.pieceColor(pieceKey);
        let pieceObj = main.variables.pieces[pieceKey];

        if (type === 'king') {
          // R9: A KING NEVER FALLS. It stays and becomes frozen.
          frozenKing = true;
        } else {
          // R6: Non-king piece falls through the board and is removed from the game!
          fellPiece = {
            key: pieceKey,
            type: type,
            color: color,
            square: square,
            cellId: cellId,
            name: pieceKey
          };

          if (pieceObj) {
            pieceObj.captured = true;
            pieceObj.position = null;
          }

          // R1+R6: If the fallen pawn was the en-passant target, the EP capture
          // no longer has anything to capture — clear it immediately.
          if (
            type === 'pawn' &&
            typeof main !== 'undefined' &&
            main.variables &&
            main.variables.enPassantTarget &&
            main.variables.enPassantTarget.pawnCell === cellId
          ) {
            main.variables.enPassantTarget = null;
          }

          if (typeof $ !== 'undefined') {
            let $cell = $('#' + cellId);
            $cell.attr('chess', 'null');
            let $piece = $cell.find('.chess-piece');
            if ($piece.addClass) $piece.addClass('piece-falling');
            setTimeout(() => {
              $cell.html('&nbsp;');
              if (main.methods && main.methods.gamesetup) {
                main.methods.gamesetup();
              }
              if (main.methods && main.methods.updateVisualHighlights) {
                main.methods.updateVisualHighlights();
              }
            }, 300);
          }
        }
      }

      return { fell: fellPiece, isOverlap: isOverlap, frozenKing: frozenKing };
    },

    /**
     * endTurn(player):
     * R5: Lifetime: at the END of each player's turn (after their move completes),
     * remove every pothole owned by their OPPONENT.
     * Own potholes stay for the opponent's turn.
     */
    onTurnEnd: function (previousColor, nextColor) {
      if (!this.state.active) return;

      // The player who just moved is previousColor.
      // Remove all potholes owned by their OPPONENT (nextColor).
      let oppColor = nextColor;
      this.state.potholes = this.state.potholes.filter(p => p.owner !== oppColor);

      this.renderUI();
    },

    /**
     * Check if game over / checkmate / stalemate occurred as a direct result of pothole resolution
     */
    evaluatePostRollGameStatus: function (player) {
      if (typeof main === 'undefined' || !main.methods || !main.variables) return;
      if (main.variables.gameOver) return;

      let inCheck = main.methods.isInCheck(player);
      let hasMoves = main.methods.hasAnyLegalMoves(player);

      main.methods.updateVisualHighlights();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();

      if (inCheck && !hasMoves) {
        main.variables.gameOver = true;
        if (typeof ClockManager !== 'undefined') ClockManager.stop();
        let winner = player === 'w' ? 'Black' : 'White';
        $('#turn').addClass('turnhighlight').text('Checkmate! ' + winner + ' wins!');
        if (typeof BoardStatusOverlay !== 'undefined') {
          BoardStatusOverlay.show('Checkmate!', `${winner} wins by checkmate`, { isGameOver: true });
        }
        $('#rematch-btn').addClass('highlight-rematch');
        if (typeof AudioManager !== 'undefined') AudioManager.playGameOver();
      } else if (!inCheck && !hasMoves) {
        main.variables.gameOver = true;
        if (typeof ClockManager !== 'undefined') ClockManager.stop();
        $('#turn').addClass('turnhighlight').text("Stalemate! It's a draw.");
        if (typeof BoardStatusOverlay !== 'undefined') {
          BoardStatusOverlay.show('Stalemate', "Draw by stalemate", { isGameOver: true });
        }
        $('#rematch-btn').addClass('highlight-rematch');
        if (typeof AudioManager !== 'undefined') AudioManager.playGameOver();
      } else if (inCheck) {
        $('#turn').removeClass('turnhighlight').text((player === 'w' ? "White" : "Black") + "'s turn \u2014 Check!");
        if (typeof BoardStatusOverlay !== 'undefined') {
          BoardStatusOverlay.show('Check', `${player === 'w' ? 'White' : 'Black'} King is under attack`, { transient: true, durationMs: 1500 });
        }
        if (typeof AudioManager !== 'undefined') AudioManager.playCheck();
      }
    },

    /**
     * UI Requirement 6: Add pothole events to move history
     */
    recordPotholeEventInHistory: function (roll) {
      if (typeof main === 'undefined' || !main.variables || !main.variables.moveHistory) return;
      // Attached to last or upcoming move
      let text = '';
      let pName = roll.player === 'w' ? 'White' : 'Black';
      if (!roll.placed) {
        text = `d8: ${roll.gate} (no pothole)`;
      } else {
        text = `d8: ${roll.square}`;
        if (roll.fell) {
          text += ` (${roll.fell.color === 'w' ? 'W' : 'B'} ${roll.fell.type} lost)`;
        } else if (roll.frozenKing) {
          text += ` (King frozen)`;
        }
      }
      roll.summaryText = text;
    },

    // ----------------------------------------------------------
    // STATE SNAPSHOTS (For Undo / Redo)
    // ----------------------------------------------------------
    createSnapshot: function () {
      return {
        potholes: JSON.parse(JSON.stringify(this.state.potholes)),
        lastRoll: this.state.lastRoll ? JSON.parse(JSON.stringify(this.state.lastRoll)) : null,
        turnCount: this.state.turnCount,
        rollHistory: JSON.parse(JSON.stringify(this.state.rollHistory))
      };
    },

    restoreSnapshot: function (snap) {
      if (!snap) return;
      this.state.potholes = snap.potholes ? JSON.parse(JSON.stringify(snap.potholes)) : [];
      this.state.lastRoll = snap.lastRoll ? JSON.parse(JSON.stringify(snap.lastRoll)) : null;
      this.state.turnCount = snap.turnCount || 0;
      this.state.rollHistory = snap.rollHistory ? JSON.parse(JSON.stringify(snap.rollHistory)) : [];
      this.state.isRolling = false;
      this.hideDiceUI();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // UI RENDERING & VISUAL COMPONENTS
    // ----------------------------------------------------------

    /**
     * Render potholes on board, frozen king indicators, and status strip
     */
    renderUI: function () {
      if (typeof $ === 'undefined' || !this.state.active) return;

      // 1. Clean previous pothole elements
      $('.pothole-marker').remove();
      $('.gamecell').removeClass('has-pothole has-frozen-king');
      $('.frozen-king-badge').remove();

      // 2. Render active potholes
      this.state.potholes.forEach(p => {
        let $cell = $('#' + p.cellId);
        if ($cell.length) {
          $cell.addClass('has-pothole');
          let ownerName = p.owner === 'w' ? 'White' : 'Black';
          let oppName = p.owner === 'w' ? 'Black' : 'White';
          let markerHtml = `
            <div class="pothole-marker pothole-${p.owner}"
                 title="${ownerName} pothole at ${p.square}, removed at the end of ${oppName}'s turn"
                 aria-label="${ownerName} pothole at ${p.square}">
              <div class="pothole-hole"></div>
              <div class="pothole-ring"></div>
              <span class="pothole-badge">${p.owner.toUpperCase()}</span>
            </div>`;
          $cell.append(markerHtml);
        }
      });

      // 3. Render Frozen King badges
      ['w', 'b'].forEach(color => {
        if (this.isKingFrozen(color)) {
          let kingObj = main.variables.pieces[color + '_king'];
          if (kingObj && kingObj.position) {
            let $cell = $('#' + kingObj.position);
            $cell.addClass('has-frozen-king');
            let lockHtml = `
              <div class="frozen-king-badge" title="King frozen until the pothole is removed (R9)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>`;
            $cell.append(lockHtml);
          }
        }
      });

      // 4. Update Pothole Status Legend Card
      this.renderStatusStrip();
    },

    renderStatusStrip: function () {
      let $panel = $('#pothole-status-panel');
      if (!$panel.length) {
        // Inject status card into left action sidebar if absent
        let panelHtml = `
          <div id="pothole-status-panel" class="sidebar-panel pothole-status-panel" style="display:none;">
            <div class="panel-header">
              <span class="panel-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
                </svg>
              </span>
              <span class="panel-title">Pothole Hazard Tracker</span>
            </div>
            <div class="pothole-status-body">
              <div id="pothole-active-list" class="pothole-active-list"></div>
            </div>
          </div>`;
        $('#action-sidebar').append(panelHtml);
        $panel = $('#pothole-status-panel');
      }

      $panel.css('display', 'block');
      let $list = $('#pothole-active-list');

      if (this.state.potholes.length === 0) {
        $list.html('<div class="pothole-empty-text">No active potholes on the board.</div>');
      } else {
        let itemsHtml = '';
        this.state.potholes.forEach(p => {
          let ownerLabel = p.owner === 'w' ? 'White' : 'Black';
          let oppLabel = p.owner === 'w' ? 'Black' : 'White';
          itemsHtml += `
            <div class="pothole-item pothole-item-${p.owner}">
              <span class="pothole-chip chip-${p.owner}">${p.owner.toUpperCase()}</span>
              <span class="pothole-coords">${p.square}</span>
              <span class="pothole-expiry">Expires after ${oppLabel}'s move</span>
            </div>`;
        });
        $list.html(itemsHtml);
      }
    },

    /**
     * Phase-1 UI: Player rolls the single gate d8 to check for a hazard
     */
    showInteractiveDicePrompt: function (player) {
      if (typeof $ === 'undefined' || typeof document === 'undefined') {
        this.state.isRolling = false;
        return;
      }

      // Build panel HTML if it doesn't exist yet
      let $container = $('#pothole-dice-panel');
      if (!$container.length) {
        let panelHtml = `
          <div id="pothole-dice-panel" class="pothole-dice-overlay" style="display:none;" role="dialog" aria-modal="true" tabindex="-1">
            <div class="pothole-dice-card" id="pothole-dice-card">
              <div class="pothole-dice-header">
                <span class="pothole-dice-player" id="pothole-dice-player">White's Turn</span>
                <span class="pothole-dice-tag" id="pothole-dice-phase-tag">Phase 1 of 1 — Hazard Check</span>
              </div>

              <!-- Phase 1: single gate die -->
              <div class="pothole-dice-phase" id="pothole-phase1">
                <div class="pothole-dice-stage">
                  <div class="pothole-d8-die ready-to-roll" id="pothole-gate-die" title="Click die to roll">
                    <svg class="d8-svg" viewBox="0 0 100 100">
                      <polygon points="50,5 92,28 50,50" class="d8-face d8-face-top" />
                      <polygon points="50,5 8,28 50,50" class="d8-face d8-face-left" />
                      <polygon points="8,28 50,50 50,95" class="d8-face d8-face-bottom-left" />
                      <polygon points="92,28 50,50 50,95" class="d8-face d8-face-bottom-right" />
                      <text x="50" y="58" class="d8-number" id="pothole-gate-number">🎲</text>
                    </svg>
                  </div>
                </div>
                <div class="pothole-dice-result" id="pothole-dice-result">Roll the d8 to check for hazards!</div>
                <div class="pothole-dice-subresult" id="pothole-dice-subresult">Even (2,4,6,8) spawns a pothole &bull; Odd (1,3,5,7) safe</div>
                <div class="pothole-dice-actions">
                  <button id="pothole-roll-gate-btn" class="pothole-btn-roll">🎲 Roll Hazard Die</button>
                  <div class="pothole-dice-keyhint" id="pothole-dice-keyhint">click die, button, or press Space / Enter</div>
                </div>
              </div>

              <!-- Phase 2: two location dice (hidden until even gate) -->
              <div class="pothole-dice-phase" id="pothole-phase2" style="display:none;">
                <div class="pothole-dice-stage pothole-two-dice-stage">
                  <div class="pothole-location-die-wrap">
                    <div class="pothole-die-label">Rank</div>
                    <div class="pothole-d8-die ready-to-roll" id="pothole-rank-die" title="Click to roll both">
                      <svg class="d8-svg" viewBox="0 0 100 100">
                        <polygon points="50,5 92,28 50,50" class="d8-face d8-face-top" />
                        <polygon points="50,5 8,28 50,50" class="d8-face d8-face-left" />
                        <polygon points="8,28 50,50 50,95" class="d8-face d8-face-bottom-left" />
                        <polygon points="92,28 50,50 50,95" class="d8-face d8-face-bottom-right" />
                        <text x="50" y="58" class="d8-number" id="pothole-rank-number">🎲</text>
                      </svg>
                    </div>
                  </div>
                  <div class="pothole-dice-sep">×</div>
                  <div class="pothole-location-die-wrap">
                    <div class="pothole-die-label">File</div>
                    <div class="pothole-d8-die ready-to-roll" id="pothole-file-die" title="Click to roll both">
                      <svg class="d8-svg" viewBox="0 0 100 100">
                        <polygon points="50,5 92,28 50,50" class="d8-face d8-face-top" />
                        <polygon points="50,5 8,28 50,50" class="d8-face d8-face-left" />
                        <polygon points="8,28 50,50 50,95" class="d8-face d8-face-bottom-left" />
                        <polygon points="92,28 50,50 50,95" class="d8-face d8-face-bottom-right" />
                        <text x="50" y="58" class="d8-number" id="pothole-file-number">🎲</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="pothole-dice-result" id="pothole-location-result">Roll both dice to find the hazard square!</div>
                <div class="pothole-dice-subresult" id="pothole-location-subresult">Rank 1–8 (row) &bull; File 1–8 (a–h column)</div>
                <div class="pothole-dice-actions">
                  <button id="pothole-roll-location-btn" class="pothole-btn-roll">🎲 Roll Location Dice</button>
                  <button id="pothole-continue-btn" class="pothole-btn-continue" style="display:none;">Make Your Move ▶</button>
                  <div class="pothole-dice-keyhint" id="pothole-dice-keyhint2">click dice, button, or press Space / Enter</div>
                </div>
              </div>

            </div>
          </div>`;
        $('#board-wrapper').append(panelHtml);
        $container = $('#pothole-dice-panel');
      }

      // Reset to Phase 1
      let playerName = player === 'w' ? 'White' : 'Black';
      $('#pothole-dice-player').text(`${playerName}'s Turn`);
      $('#pothole-dice-phase-tag').text('Phase 1 of 1 — Hazard Check');
      $('#pothole-phase1').show();
      $('#pothole-phase2').hide();

      $('#pothole-gate-die').removeClass('rolling landed').addClass('ready-to-roll');
      $('#pothole-gate-number').text('🎲');
      $('#pothole-dice-result').text(`Your turn, ${playerName}! Roll the hazard die.`);
      $('#pothole-dice-subresult').show().html('Even (2,4,6,8) spawns a pothole &bull; Odd (1,3,5,7) safe');
      $('#pothole-roll-gate-btn').show().prop('disabled', false);
      $('#pothole-dice-keyhint').show().text('click die, button, or press Space / Enter');

      if ($container.fadeIn) {
        $container.fadeIn(150);
      } else {
        $container.show();
      }

      let phase1Done = false;
      const doGateRoll = () => {
        if (phase1Done) return;
        phase1Done = true;
        this.executeGateRoll(player);
      };

      $('#pothole-roll-gate-btn').off('click').on('click', doGateRoll);
      $('#pothole-gate-die').off('click').on('click', doGateRoll);

      $(document).off('keydown.potholeRoll').on('keydown.potholeRoll', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if ($('#pothole-phase1').is(':visible') && !phase1Done) {
            doGateRoll();
          } else if ($('#pothole-phase2').is(':visible') && !$('#pothole-continue-btn').is(':visible')) {
            // waiting for location roll
            $('#pothole-roll-location-btn').trigger('click');
          } else if ($('#pothole-continue-btn').is(':visible')) {
            $('#pothole-continue-btn').trigger('click');
          }
        }
      });
    },

    /**
     * Phase 1 execution: Animate the gate die. If even → switch to Phase 2. If odd → finish.
     */
    executeGateRoll: function (player) {
      $('#pothole-roll-gate-btn').hide();
      $('#pothole-dice-keyhint').hide();
      $('#pothole-gate-die').removeClass('ready-to-roll landed').addClass('rolling');
      $('#pothole-gate-number').text('?');
      $('#pothole-dice-result').text('Rolling hazard die...');
      $('#pothole-dice-subresult').text('Checking for pothole hazards...');

      if (typeof AudioManager !== 'undefined' && AudioManager.playTone) {
        AudioManager.playTone(420, 'triangle', 0.08);
      }

      // Roll the gate die
      let gate = this.rollD8();
      let shouldPlace = (POTHOLE_CONFIG.PLACE_ON === 'always') || (gate % 2 === 0);
      let playerName = player === 'w' ? 'White' : 'Black';

      let cycles = 8, cycle = 0;
      let interval = setInterval(() => {
        cycle++;
        $('#pothole-gate-number').text(Math.floor(Math.random() * 8) + 1);
        if (typeof AudioManager !== 'undefined' && AudioManager.playTone && cycle % 2 === 0) {
          AudioManager.playTone(300 + cycle * 18, 'sine', 0.04);
        }

        if (cycle >= cycles) {
          clearInterval(interval);
          $('#pothole-gate-die').removeClass('rolling').addClass('landed');
          $('#pothole-gate-number').text(gate);

          if (typeof AudioManager !== 'undefined' && AudioManager.playTone) {
            AudioManager.playTone(shouldPlace ? 220 : 520, 'triangle', 0.12);
          }

          if (shouldPlace) {
            // Even → need location roll
            setTimeout(() => {
              $('#pothole-dice-result').text(`Rolled ${gate} — Even! A pothole will be placed.`);
              $('#pothole-dice-subresult').text('Now roll two dice to determine the hazard square.');
              setTimeout(() => {
                this.showPhase2(player, gate);
              }, 600);
            }, 200);
          } else {
            // Odd → no pothole, finish turn
            $('#pothole-dice-result').text(`${playerName} rolled ${gate} — Odd! No pothole this turn.`);
            $('#pothole-dice-subresult').text('Safe! Make your chess move.');

            let rollRecord = {
              turn: this.state.turnCount,
              player: player,
              gate: gate,
              rank: null,
              file: null,
              placed: false,
              square: null,
              cellId: null,
              fell: null,
              isOverlap: false,
              frozenKing: false
            };
            this.state.lastRoll = rollRecord;
            this.state.rollHistory.push(rollRecord);
            this.recordPotholeEventInHistory(rollRecord);

            // Show continue in phase1 area
            $('#pothole-roll-gate-btn').hide();
            let $cont = $('<button id="pothole-continue-btn-p1" class="pothole-btn-continue">Make Your Move ▶</button>');
            $('#pothole-phase1 .pothole-dice-actions').append($cont);
            $('#pothole-dice-keyhint').show().text('or press Space / Enter');

            const finish = () => {
              $(document).off('keydown.potholeRoll');
              this.finishDiceStep(() => {
                this.state.isRolling = false;
                this.renderUI();
                this.evaluatePostRollGameStatus(player);
              });
            };
            $cont.on('click', finish);
          }
        }
      }, 70);
    },

    /**
     * Phase 2: Show two dice (rank + file) for the player to roll simultaneously
     */
    showPhase2: function (player, gate) {
      let playerName = player === 'w' ? 'White' : 'Black';

      $('#pothole-phase1').hide();
      $('#pothole-dice-phase-tag').text('Phase 2 of 2 — Hazard Location');
      $('#pothole-phase2').show();

      $('#pothole-rank-die').removeClass('rolling landed').addClass('ready-to-roll');
      $('#pothole-file-die').removeClass('rolling landed').addClass('ready-to-roll');
      $('#pothole-rank-number').text('🎲');
      $('#pothole-file-number').text('🎲');
      $('#pothole-location-result').text(`Gate ${gate} (Even) — Roll to find the hazard square!`);
      $('#pothole-location-subresult').html('Rank die (row 1–8) &bull; File die (col a–h) — both at once!');
      $('#pothole-roll-location-btn').show().prop('disabled', false);
      $('#pothole-continue-btn').hide();
      $('#pothole-dice-keyhint2').show().text('click dice, button, or press Space / Enter');

      let locationRolled = false;
      const doLocationRoll = () => {
        if (locationRolled) return;
        locationRolled = true;
        this.executeLocationRoll(player, gate);
      };

      $('#pothole-roll-location-btn').off('click').on('click', doLocationRoll);
      $('#pothole-rank-die').off('click').on('click', doLocationRoll);
      $('#pothole-file-die').off('click').on('click', doLocationRoll);
    },

    /**
     * Phase 2 execution: Animate both dice simultaneously, resolve pothole, show result
     */
    executeLocationRoll: function (player, gate) {
      $('#pothole-roll-location-btn').hide();
      $('#pothole-dice-keyhint2').hide();

      $('#pothole-rank-die').removeClass('ready-to-roll landed').addClass('rolling');
      $('#pothole-file-die').removeClass('ready-to-roll landed').addClass('rolling');
      $('#pothole-rank-number').text('?');
      $('#pothole-file-number').text('?');
      $('#pothole-location-result').text('Rolling location dice...');
      $('#pothole-location-subresult').text('Choosing rank and file simultaneously...');

      if (typeof AudioManager !== 'undefined' && AudioManager.playTone) {
        AudioManager.playTone(380, 'triangle', 0.08);
      }

      // Roll both dice
      let rank = this.rollD8();
      let file = this.rollD8();
      let fileLetter = POTHOLE_CONFIG.FILE_MAP[file] || 'a';
      let square = fileLetter + rank;
      let cellId = file + '_' + rank;
      let playerName = player === 'w' ? 'White' : 'Black';

      // Build roll record
      let rollRecord = {
        turn: this.state.turnCount,
        player: player,
        gate: gate,
        rank: rank,
        file: file,
        placed: true,
        square: square,
        cellId: cellId,
        fell: null,
        isOverlap: false,
        frozenKing: false
      };

      // Place the pothole
      let result = this.placePothole(cellId, square, player);
      rollRecord.fell = result.fell;
      rollRecord.isOverlap = result.isOverlap;
      rollRecord.frozenKing = result.frozenKing;

      this.state.lastRoll = rollRecord;
      this.state.rollHistory.push(rollRecord);
      this.recordPotholeEventInHistory(rollRecord);

      // Animate both dice simultaneously
      let cycles = 8, cycle = 0;
      let interval = setInterval(() => {
        cycle++;
        $('#pothole-rank-number').text(Math.floor(Math.random() * 8) + 1);
        $('#pothole-file-number').text(Math.floor(Math.random() * 8) + 1);
        if (typeof AudioManager !== 'undefined' && AudioManager.playTone && cycle % 2 === 0) {
          AudioManager.playTone(280 + cycle * 20, 'sine', 0.04);
        }

        if (cycle >= cycles) {
          clearInterval(interval);
          $('#pothole-rank-die').removeClass('rolling').addClass('landed');
          $('#pothole-file-die').removeClass('rolling').addClass('landed');
          $('#pothole-rank-number').text(rank);
          $('#pothole-file-number').text(file);

          if (typeof AudioManager !== 'undefined' && AudioManager.playTone) {
            AudioManager.playTone(260, 'triangle', 0.14);
          }

          // Build result text
          let mainText = `${playerName} placed a pothole on ${square}!`;
          let subText = `Rank ${rank}, File ${fileLetter.toUpperCase()} (${square})`;
          if (rollRecord.fell) {
            subText += ` — ${rollRecord.fell.color === 'w' ? 'White' : 'Black'} ${rollRecord.fell.type} fell through the board!`;
          } else if (rollRecord.frozenKing) {
            subText += ` — ${playerName}'s King is frozen!`;
          } else if (rollRecord.isOverlap) {
            subText += ` — Transferred existing pothole to ${playerName}!`;
          } else {
            subText += ` — Square is now impassable.`;
          }

          $('#pothole-location-result').text(mainText);
          $('#pothole-location-subresult').show().text(subText);
          this.renderUI();

          $('#pothole-continue-btn').show();
          $('#pothole-dice-keyhint2').show().text('or press Space / Enter');

          $('#pothole-continue-btn').off('click').on('click', () => {
            $(document).off('keydown.potholeRoll');
            this.finishDiceStep(() => {
              this.state.isRolling = false;
              this.renderUI();
              this.evaluatePostRollGameStatus(player);
            });
          });
        }
      }, 70);
    },

    /**
     * Legacy executeManualRoll kept for compatibility — not used in interactive mode any more
     */
    executeManualRoll: function (player) {
      this.showInteractiveDicePrompt(player);
    },

    /**
     * UI Requirement 2 (Legacy / Wrapper): Show animated dice step
     */
    showDiceRollUI: function (roll, onComplete) {
      if (typeof $ === 'undefined' || typeof document === 'undefined') {
        if (onComplete) onComplete();
        return;
      }
      if (onComplete) onComplete();
    },

    finishDiceStep: function (onComplete) {
      // Remove any Phase-1 continue button that was dynamically added
      $('#pothole-continue-btn-p1').remove();
      this.hideDiceUI();
      if (onComplete) onComplete();
    },

    hideDiceUI: function () {
      if (typeof $ !== 'undefined') {
        $(document).off('keydown.potholeRoll');
        let $el = $('#pothole-dice-panel');
        if ($el.fadeOut) {
          $el.fadeOut(150);
        } else {
          $el.hide();
        }
      }
    },

    /**
     * Sinking animation when piece falls through (R6)
     */
    animatePieceFalling: function (cellId) {
      if (typeof $ === 'undefined') return;
      let $cell = $('#' + cellId);
      let $piece = $cell.find('.chess-piece');
      if ($piece.length) {
        $piece.addClass('piece-falling');
      }
    },

    // ----------------------------------------------------------
    // POTHOLE TUTORIAL PROMPT (Brutalist Card Style)
    // ----------------------------------------------------------
    showTutorialPrompt: function () {
      if (typeof $ === 'undefined' || typeof document === 'undefined') return;
      if ($('#pothole-tutorial-prompt').length) return;
      const promptHtml = `
        <div id="pothole-tutorial-prompt" class="brutalist-card">
          <div class="brutalist-card__header">
            <div class="brutalist-card__icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px; height:20px;">
                <circle cx="12" cy="12" r="9" fill="none" stroke="#1c1b1a" stroke-width="2.2"/>
                <circle cx="12" cy="12" r="3.5" fill="#1c1b1a"/>
              </svg>
            </div>
            <div class="brutalist-card__alert">POTHOLE CHESS</div>
          </div>
          <div class="brutalist-card__message">
            New to Pothole Chess? Would you like a quick interactive tutorial to learn the hazard mechanics?
          </div>
          <div class="brutalist-card__actions">
            <label class="brutalist-card__dont-show">
              <input type="checkbox" id="pothole-tutorial-dont-show"> Don't remind me again
            </label>
            <button class="brutalist-card__button brutalist-card__button--yes pothole-tutorial-yes">Yes, show me!</button>
            <button class="brutalist-card__button brutalist-card__button--no pothole-tutorial-no">No thanks</button>
          </div>
        </div>`;
      const $prompt = $(promptHtml);
      if ($('body') && typeof $('body').append === 'function') {
        $('body').append($prompt);
      }
      if ($prompt && typeof $prompt.find === 'function') {
        $prompt.find('.pothole-tutorial-yes').on('click', () => {
          if (PotholeMode.tutorial && typeof PotholeMode.tutorial.start === 'function') {
            PotholeMode.tutorial.start(true);
          }
          PotholeMode._handleTutorialDismiss($prompt);
        });
        $prompt.find('.pothole-tutorial-no').on('click', () => {
          PotholeMode._handleTutorialDismiss($prompt);
        });
      }
    },

    _handleTutorialDismiss: function ($el) {
      const dontShow = $el.find('#pothole-tutorial-dont-show').is(':checked');
      if (dontShow) {
        try { localStorage.setItem('chess_pothole_tutorial_prompt_seen', 'true'); } catch (e) {}
      }
      $el.remove();
    },

    // ----------------------------------------------------------
    // "HOW IT WORKS" RULES MODAL (UI Requirement 1)
    // ----------------------------------------------------------
    openRulesModal: function () {
      if (typeof $ === 'undefined') return;
      let $modal = $('#pothole-rules-modal');
      if (!$modal.length) {
        let modalHtml = `
          <div id="pothole-rules-modal" class="modal-overlay" style="display:none;">
            <div class="modal-content pothole-modal-content">
              <div class="pothole-modal-header">
                <div class="pothole-modal-title">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/>
                    <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
                  </svg>
                  <span>Pothole Chess — How It Works (R1–R11)</span>
                </div>
                <div class="help-header-actions">
                  <button id="restart-pothole-tutorial-btn" class="action-btn tutorial-replay-btn" title="Launch Interactive Guided Tour">
                    <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                    <span>Replay Tutorial</span>
                  </button>
                  <button class="modal-close-icon" id="close-pothole-rules">&times;</button>
                </div>
              </div>
              <div class="pothole-rules-body">
                <div class="pothole-rule-item">
                  <strong>R1: Classical Foundation</strong>
                  <p>Standard FIDE chess rules apply underneath. White moves first.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R2: The d8 Gate Roll</strong>
                  <p>At the start of your turn, roll an 8-sided die. Even (2, 4, 6, 8) opens a pothole. Odd (1, 3, 5, 7) places nothing.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R3: Square Selection</strong>
                  <p>Roll twice more: 1st roll = Rank (1–8), 2nd roll = File (1=a to 8=h).</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R4 & R5: Two-Turn Lifetime</strong>
                  <p>Every pothole belongs to the roller. At the END of each player's turn, all potholes owned by their OPPONENT are removed. Potholes live for exactly 2 turns. At most two potholes exist at once.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R6: Swallowed Pieces</strong>
                  <p>Any non-king piece standing on the target square falls through the board and is removed immediately (friendly or enemy).</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R7: Path & Attack Blocking</strong>
                  <p>No piece may land on or pass through a pothole. Knights can jump over, but cannot land. Attack rays from sliding pieces are blocked by potholes.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R8: Overlap Transfers</strong>
                  <p>Rolling onto an active pothole transfers ownership to the new roller and restarts its 2-turn lifetime.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R9: Frozen King (Never Falls)</strong>
                  <p>A King never falls through! If rolled on, the King is <em>frozen</em> and cannot step, capture, or castle while the pothole remains.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R10: True Checkmate</strong>
                  <p>Game ends only by normal checkmate. A frozen King can be checked by an enemy with a clear line, and must be defended or checkmate is declared.</p>
                </div>
                <div class="pothole-rule-item">
                  <strong>R11: Stalemate</strong>
                  <p>Standard stalemate applies if a player has no legal moves while not in check.</p>
                </div>
              </div>
              <button class="action-btn" id="close-pothole-rules-btn" style="margin-top:16px; width:100%;">Understood</button>
            </div>
          </div>`;
        $('body').append(modalHtml);
        $modal = $('#pothole-rules-modal');
      }
      $modal.css('display', 'flex');
    },

    closeRulesModal: function () {
      if (typeof $ !== 'undefined') {
        $('#pothole-rules-modal').css('display', 'none');
      }
    },

    // ----------------------------------------------------------
    // INTERACTIVE ONBOARDING TUTORIAL CONTROLLER
    // ----------------------------------------------------------
    tutorial: {
      active: false,
      currentStep: 0,
      steps: [
        {
          target: '#board-stage',
          title: 'Welcome to Pothole Chess',
          desc: 'Pothole Chess plays by standard FIDE rules, but before every move a d8 is rolled — on an even result (~50% of turns) a hazardous pothole spawns on the board, swallowing pieces, blocking paths, and freezing kings!',
          placement: 'center'
        },
        {
          target: '#board-wrapper',
          title: 'The Turn Start d8 Hazard Roll (R2)',
          desc: 'Before making your move, an 8-sided die (d8) rolls automatically. Rolling an EVEN number (2, 4, 6, 8) triggers a pothole. ODD (1, 3, 5, 7) means a normal turn.',
          placement: 'center'
        },
        {
          target: '#board-wrapper',
          title: 'Target Coordinates (R3)',
          desc: 'When an even number is rolled, two subsequent rolls determine the square: 1st roll = Rank (1–8), 2nd roll = File (1=a through 8=h).',
          placement: 'center'
        },
        {
          target: '#pothole-status-panel',
          title: 'Two-Turn Lifetime (R4 & R5)',
          desc: 'Every pothole is owned by the roller. At the END of your turn, all potholes owned by your opponent are removed! Each pothole lasts exactly 2 turns.',
          placement: 'left'
        },
        {
          target: '#board-stage',
          title: 'Swallowed Pieces & Blocked Rays (R6 & R7)',
          desc: 'Non-king pieces on the square fall through the board and are removed! Potholes block landing, sliding pieces, pawn pushes, and enemy attack rays (intercepting check). Knights can jump over.',
          placement: 'center'
        },
        {
          target: '#board-stage',
          title: 'A King Never Falls — King Freeze (R9)',
          desc: 'A King standing on a pothole is NEVER lost—instead, the King is frozen with 0 moves until the pothole vanishes. Other friendly pieces can move normally.',
          placement: 'center'
        },
        {
          target: '#turn',
          title: 'Checkmate Victory (R10 & R11)',
          desc: 'The only victory condition is authentic checkmate! A frozen King can be checked and must be defended, or it is mate. Stalemate applies if no legal moves remain.',
          placement: 'bottom'
        }
      ],

      start: function (force) {
        if (typeof $ === 'undefined') return;
        if (!force) {
          try {
            if (localStorage.getItem('chess_pothole_tutorial_seen') === 'true') return;
          } catch (e) {}
        }

        // Ensure Pothole mode is active
        if (typeof GameModeManager !== 'undefined' && GameModeManager.activeMode !== 'pothole') {
          GameModeManager.setMode('pothole');
        }

        this.active = true;
        this.currentStep = 0;
        $('#pothole-tutorial-overlay').css('display', 'block');
        this.renderStep(0);
      },

      renderStep: function (idx) {
        if (idx < 0 || idx >= this.steps.length) return;
        this.currentStep = idx;
        let step = this.steps[idx];

        $('#pothole-tutorial-step-tag').text(`Step ${idx + 1} of ${this.steps.length}`);
        $('#pothole-tutorial-step-title').text(step.title);
        $('#pothole-tutorial-step-desc').text(step.desc);

        // Progress dots
        let dotsHtml = '';
        for (let i = 0; i < this.steps.length; i++) {
          dotsHtml += `<div class="tutorial-dot${i === idx ? ' active' : ''}"></div>`;
        }
        $('#pothole-tutorial-dots').html(dotsHtml);

        // Nav buttons
        $('#pothole-tutorial-prev-btn').prop('disabled', idx === 0);
        $('#pothole-tutorial-next-btn').text(idx === this.steps.length - 1 ? 'Finish' : 'Next ▶');

        // Position spotlight & box
        let $target = $(step.target);
        if ($target.length && $target.is(':visible')) {
          let targetEl = $target[0];
          if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
            let rect = targetEl.getBoundingClientRect();
            let pad = 8;
            $('#pothole-tutorial-overlay').removeClass('no-spotlight');
            $('#pothole-tutorial-spotlight').css({
              display: 'block',
              top: (rect.top - pad) + 'px',
              left: (rect.left - pad) + 'px',
              width: (rect.width + pad * 2) + 'px',
              height: (rect.height + pad * 2) + 'px'
            });

            let boxWidth = 320;
            let boxHeight = 180;
            let boxTop = rect.top;
            let boxLeft = rect.left + rect.width + 16;

            if (step.placement === 'left') {
              boxLeft = rect.left - boxWidth - 16;
              boxTop = rect.top;
            } else if (step.placement === 'top') {
              boxTop = rect.top - boxHeight - 16;
              boxLeft = rect.left + (rect.width / 2) - (boxWidth / 2);
            } else if (step.placement === 'bottom') {
              boxTop = rect.bottom + 16;
              boxLeft = rect.left + (rect.width / 2) - (boxWidth / 2);
            } else if (step.placement === 'center') {
              boxTop = rect.top + (rect.height / 2) - (boxHeight / 2);
              boxLeft = rect.left + (rect.width / 2) - (boxWidth / 2);
            }

            if (typeof window !== 'undefined') {
              let maxLeft = window.innerWidth - boxWidth - 16;
              let maxTop = window.innerHeight - boxHeight - 16;
              boxLeft = Math.max(16, Math.min(boxLeft, maxLeft));
              boxTop = Math.max(16, Math.min(boxTop, maxTop));
            }

            $('#pothole-tutorial-box').css({
              top: boxTop + 'px',
              left: boxLeft + 'px',
              transform: 'none'
            });
            return;
          }
        }

        // Fallback center
        $('#pothole-tutorial-overlay').addClass('no-spotlight');
        $('#pothole-tutorial-spotlight').css('display', 'none');
        $('#pothole-tutorial-box').css({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
      },

      next: function () {
        if (this.currentStep < this.steps.length - 1) {
          this.renderStep(this.currentStep + 1);
        } else {
          this.finish();
        }
      },

      prev: function () {
        if (this.currentStep > 0) {
          this.renderStep(this.currentStep - 1);
        }
      },

      skip: function () {
        this.finish();
      },

      finish: function () {
        this.active = false;
        if (typeof $ !== 'undefined') {
          $('#pothole-tutorial-overlay').css('display', 'none').removeClass('no-spotlight');
        }
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chess_pothole_tutorial_seen', 'true');
          }
        } catch (e) {}
      }
    },

    bindEvents: function () {
      if (typeof $ === 'undefined') return;

      $(document).on('click', '#pothole-rules-trigger, #help-pothole-btn', (e) => {
        e.stopPropagation();
        this.openRulesModal();
      });

      $(document).on('click', '#close-pothole-rules, #close-pothole-rules-btn', () => {
        this.closeRulesModal();
      });

      $(document).on('click', '#pothole-rules-modal', (e) => {
        if ($(e.target).is('#pothole-rules-modal')) {
          this.closeRulesModal();
        }
      });

      // Tutorial triggers & navigation
      $(document).on('click', '#restart-pothole-tutorial-btn', () => {
        this.closeRulesModal();
        this.tutorial.start(true);
      });

      $(document).on('click', '#pothole-tutorial-next-btn', () => {
        this.tutorial.next();
      });

      $(document).on('click', '#pothole-tutorial-prev-btn', () => {
        this.tutorial.prev();
      });

      $(document).on('click', '#pothole-tutorial-skip-btn', () => {
        this.tutorial.skip();
      });
    }
  };

  return PotholeMode;
});

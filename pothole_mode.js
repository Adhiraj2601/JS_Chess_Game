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
    },

    onDeactivate: function () {
      this.state.active = false;
      this.state.isRolling = false;
      if (this.state.rollTimer) {
        clearTimeout(this.state.rollTimer);
        this.state.rollTimer = null;
      }
      this.hideDiceUI();
      if (typeof $ !== 'undefined') {
        $('body').removeClass('mode-pothole');
        $('.pothole-marker').remove();
        $('.gamecell').removeClass('has-pothole has-frozen-king');
        $('.frozen-king-badge').remove();
        $('#pothole-status-panel').hide();
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

      // R2: Roll d8 gate
      let gate = (optRollOverrides && optRollOverrides.gate !== undefined)
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
        // R3: Roll rank (1-8) and file (1-8)
        let rank = (optRollOverrides && optRollOverrides.rank !== undefined)
          ? optRollOverrides.rank
          : this.rollD8();
        let file = (optRollOverrides && optRollOverrides.file !== undefined)
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

        // Place and resolve
        let result = this.placePothole(cellId, square, player);
        rollRecord.fell = result.fell;
        rollRecord.isOverlap = result.isOverlap;
        rollRecord.frozenKing = result.frozenKing;
      }

      this.state.lastRoll = rollRecord;
      this.state.rollHistory.push(rollRecord);
      this.recordPotholeEventInHistory(rollRecord);
      this.renderUI();

      // Show dice animation and UI
      this.showDiceRollUI(rollRecord, () => {
        this.state.isRolling = false;
        this.renderUI();
        this.evaluatePostRollGameStatus(player);
      });
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
     * UI Requirement 2: Show animated dice step at the start of each turn
     */
    showDiceRollUI: function (roll, onComplete) {
      if (typeof $ === 'undefined' || typeof document === 'undefined') {
        if (onComplete) onComplete();
        return;
      }

      let $container = $('#pothole-dice-panel');
      if (!$container.length) {
        let diceModalHtml = `
          <div id="pothole-dice-panel" class="pothole-dice-overlay" style="display:none;" role="dialog" aria-modal="true">
            <div class="pothole-dice-card">
              <div class="pothole-dice-header">
                <span class="pothole-dice-player" id="pothole-dice-player">White's Turn</span>
                <span class="pothole-dice-tag">d8 Hazard Roll</span>
              </div>
              <div class="pothole-dice-stage">
                <div class="pothole-d8-die" id="pothole-d8-die">
                  <svg class="d8-svg" viewBox="0 0 100 100">
                    <polygon points="50,5 92,28 50,50" class="d8-face d8-face-top" />
                    <polygon points="50,5 8,28 50,50" class="d8-face d8-face-left" />
                    <polygon points="8,28 50,50 50,95" class="d8-face d8-face-bottom-left" />
                    <polygon points="92,28 50,50 50,95" class="d8-face d8-face-bottom-right" />
                    <text x="50" y="58" class="d8-number" id="pothole-d8-number">?</text>
                  </svg>
                </div>
              </div>
              <div class="pothole-dice-result" id="pothole-dice-result">
                Rolling d8...
              </div>
              <div class="pothole-dice-subresult" id="pothole-dice-subresult" style="display:none;"></div>
              <div class="pothole-dice-actions">
                <button id="pothole-continue-btn" class="pothole-btn-continue" style="display:none;">Continue ▶</button>
              </div>
            </div>
          </div>`;
        $('#board-wrapper').append(diceModalHtml);
        $container = $('#pothole-dice-panel');
      }

      let playerName = roll.player === 'w' ? 'White' : 'Black';
      $('#pothole-dice-player').text(`${playerName}'s Turn`);
      $('#pothole-d8-die').removeClass('rolling landed').addClass('rolling');
      $('#pothole-d8-number').text('?');
      $('#pothole-dice-result').text('Rolling eight-sided die...');
      $('#pothole-dice-subresult').hide().text('');
      $('#pothole-continue-btn').hide();

      let $dicePanel = $('#pothole-dice-panel');
      if ($dicePanel.fadeIn) {
        $dicePanel.fadeIn(150);
      } else {
        $dicePanel.show();
      }

      // Animate roll
      let rollCycles = 6;
      let cycle = 0;
      let interval = setInterval(() => {
        cycle++;
        let tempVal = Math.floor(Math.random() * 8) + 1;
        $('#pothole-d8-number').text(tempVal);
        if (cycle >= rollCycles) {
          clearInterval(interval);
          $('#pothole-d8-die').removeClass('rolling').addClass('landed');
          $('#pothole-d8-number').text(roll.gate);

          // Reveal result
          let mainText = '';
          let subText = '';

          if (roll.placed) {
            mainText = `${playerName} rolled ${roll.gate} (Even): Pothole placed on ${roll.square}!`;
            subText = `Rank ${roll.rank}, File ${POTHOLE_CONFIG.FILE_MAP[roll.file]}`;
            if (roll.fell) {
              subText += ` — ${roll.fell.color === 'w' ? 'White' : 'Black'} ${roll.fell.type} fell through the board!`;
            } else if (roll.frozenKing) {
              subText += ` — ${roll.player === 'w' ? 'White' : 'Black'} King is frozen!`;
            } else if (roll.isOverlap) {
              subText += ` — Transferred active pothole to ${playerName}!`;
            }
          } else {
            mainText = `${playerName} rolled ${roll.gate} (Odd): No pothole placed this turn.`;
            subText = `Standard chess move follows.`;
          }

          $('#pothole-dice-result').text(mainText);
          if (subText) {
            let $sub = $('#pothole-dice-subresult');
            if ($sub.fadeIn) $sub.text(subText).fadeIn(150);
            else $sub.text(subText).show();
          }
          $('#pothole-continue-btn').show();

          // Auto advance timer
          this.state.rollTimer = setTimeout(() => {
            this.finishDiceStep(onComplete);
          }, POTHOLE_CONFIG.AUTO_ADVANCE_DELAY_MS);

          // Manual continue click
          $('#pothole-continue-btn').off('click').on('click', () => {
            if (this.state.rollTimer) {
              clearTimeout(this.state.rollTimer);
              this.state.rollTimer = null;
            }
            this.finishDiceStep(onComplete);
          });
        }
      }, 70);
    },

    finishDiceStep: function (onComplete) {
      this.hideDiceUI();
      if (onComplete) onComplete();
    },

    hideDiceUI: function () {
      if (typeof $ !== 'undefined') {
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
                <button class="modal-close-icon" id="close-pothole-rules">&times;</button>
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
    }
  };

  return PotholeMode;
});

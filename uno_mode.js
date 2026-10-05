/**
 * ==========================================================
 * CHESS UNO MODE — SPOODERY CHESS UNO TABLETOP PLUGIN
 * ==========================================================
 * Real "UNO Chess" variant by Spoodery Chess.
 * Seats vs Colors, multi-move Number cards, Skips,
 * physical 180° board-flipping Reverses, piece additions (+2 / +4),
 * and king-capture / last-card victory conditions.
 * Standard chess remains 100% unaffected.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UnoMode = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  const CONFIG = {
    DECK: {
      zerosPerColor: 1,
      onesToNinesPerColor: 2,
      skipsPerColor: 2,
      reversesPerColor: 2,
      plusTwosPerColor: 1, // 1 per color = 4 total
      wildPlusFoursTotal: 2 // 2 total
    },
    INITIAL_HAND_SIZE: 6,
    MOVE_MODE: 'free', // 'free' | 'samePiece' | 'distinctPieces'
    REVERSE_TURN_BEHAVIOR: 'passTurn', // 'passTurn' | 'playAgain'
    ADD_SOURCE: 'captured', // 'captured' | 'reserve'
    NO_KING_CAPTURE_ON_FIRST_TURN: false
  };

  const UnoMode = {
    name: 'uno',
    displayName: 'Chess UNO',
    CONFIG: CONFIG,

    state: {
      active: false,
      deck: [],
      discardPile: [],
      hands: {
        A: [],
        B: []
      },
      graveyard: {
        w: [],
        b: []
      },
      seatColor: {
        A: 'w',
        B: 'b'
      },
      activeSeat: 'A', // 'A' | 'B'
      currentColor: null, // 'red' | 'blue' | 'green' | 'yellow'
      phase: 'playCard', // 'playCard' | 'moving' | 'colorPick' | 'addingPieces'
      movesRemaining: 0,
      movedPieces: [],
      piecesToAdd: 0,
      pendingPlacementPiece: null, // { idx, piece }
      placedPiecesThisAction: [], // for Cancel support
      cardPlayedThisTurn: false,
      turnCount: 0,
      cardLog: []
    },

    savedAutoFlip: undefined,

    // ----------------------------------------------------------
    // SEAT & COLOR HELPERS
    // ----------------------------------------------------------
    colorOf: function (seat) {
      return this.state.seatColor[seat || this.state.activeSeat];
    },

    seatOf: function (color) {
      if (this.state.seatColor.A === color) return 'A';
      if (this.state.seatColor.B === color) return 'B';
      return 'A';
    },

    otherSeat: function (seat) {
      return (seat || this.state.activeSeat) === 'A' ? 'B' : 'A';
    },

    activeColor: function () {
      return this.colorOf(this.state.activeSeat);
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

      // Disable autoFlip while UNO mode is active; restore on deactivate
      if (typeof main !== 'undefined' && main.variables) {
        this.savedAutoFlip = main.variables.autoFlip;
        main.variables.autoFlip = false;
      }

      if (this.state.deck.length === 0 && this.state.hands.A.length === 0) {
        this.startNewGame();
      }
      this.renderUI();
      this.logCard('system', 'Chess UNO Mode activated. Play a card to begin!');

      let tutorialPromptSeen = false;
      try {
        tutorialPromptSeen = (typeof localStorage !== 'undefined') && localStorage.getItem('chess_uno_tutorial_prompt_seen') === 'true';
      } catch (e) {}

      if (!tutorialPromptSeen && typeof $ !== 'undefined') {
        setTimeout(() => {
          if (UnoMode.state.active) {
            UnoMode.showTutorialPrompt();
          }
        }, 400);
      }
    },

    onDeactivate: function () {
      this.state.active = false;
      if (this.savedAutoFlip !== undefined && typeof main !== 'undefined' && main.variables) {
        main.variables.autoFlip = this.savedAutoFlip;
      }
      this.clearReviveBoardHighlights();
      this.hidePromptBanner();
      if (typeof $ !== 'undefined') {
        $('#uno-color-picker-modal').hide();
      }
      if (this.help && typeof this.help.close === 'function') {
        this.help.close();
      }
    },

    resetState: function () {
      this.state.deck = [];
      this.state.discardPile = [];
      this.state.hands = { A: [], B: [] };
      this.state.graveyard = { w: [], b: [] };
      this.state.seatColor = { A: 'w', B: 'b' };
      this.state.activeSeat = 'A';
      this.state.currentColor = null;
      this.state.phase = 'playCard';
      this.state.movesRemaining = 0;
      this.state.movedPieces = [];
      this.state.piecesToAdd = 0;
      this.state.pendingPlacementPiece = null;
      this.state.placedPiecesThisAction = [];
      this.state.cardPlayedThisTurn = false;
      this.state.turnCount = 0;
      this.state.cardLog = [];
    },

    startNewGame: function () {
      this.resetState();
      this.state.deck = this.buildDeck();
      this.dealInitialHands();

      // Flip one card onto the discard pile (cannot be Wild +4)
      let initialCard = null;
      while (this.state.deck.length > 0) {
        let candidate = this.state.deck.pop();
        if (candidate.type === 'wildDrawFour') {
          this.state.deck.unshift(candidate);
          this.state.deck = this.shuffle(this.state.deck);
        } else {
          initialCard = candidate;
          break;
        }
      }
      if (initialCard) {
        this.state.discardPile.push(initialCard);
        this.state.currentColor = initialCard.color;
      }

      this.state.activeSeat = 'A';
      this.state.seatColor = { A: 'w', B: 'b' };
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.turn = this.state.seatColor.A; // 'w'
      }
      this.state.phase = 'playCard';
      this.renderUI();
    },

    // ----------------------------------------------------------
    // DECK GENERATION & SHUFFLE
    // ----------------------------------------------------------
    buildDeck: function () {
      const colors = ['red', 'blue', 'green', 'yellow'];
      let cards = [];
      let cardId = 1;
      const dec = CONFIG.DECK;

      colors.forEach(color => {
        // Zero cards (1 per color by default)
        for (let i = 0; i < dec.zerosPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'number',
            value: 0,
            label: '0',
            title: 'Number 0',
            desc: '0 chess moves (pass turn)'
          });
        }

        // 1-9 cards (2 each per color by default)
        for (let num = 1; num <= 9; num++) {
          for (let i = 0; i < dec.onesToNinesPerColor; i++) {
            cards.push({
              id: 'card_' + (cardId++),
              color: color,
              type: 'number',
              value: num,
              label: String(num),
              title: 'Number ' + num,
              desc: `Make ${num} moves this turn`
            });
          }
        }

        // Skips (2 per color by default)
        for (let i = 0; i < dec.skipsPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'skip',
            label: '⊘',
            title: 'Skip',
            desc: 'Skip opponent\'s turn, play again'
          });
        }

        // Reverses (2 per color by default)
        for (let i = 0; i < dec.reversesPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'reverse',
            label: '⇄',
            title: 'Reverse',
            desc: 'Swap sides with your opponent (flip the board)'
          });
        }

        // +2 Draw Two (1 per color by default = 4 total)
        for (let i = 0; i < dec.plusTwosPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'drawTwo',
            label: '+2',
            title: 'Draw Two',
            desc: 'Add up to 2 pieces to your half'
          });
        }
      });

      // Wild +4 (2 total by default) - NO plain Wild
      for (let i = 0; i < dec.wildPlusFoursTotal; i++) {
        cards.push({
          id: 'card_' + (cardId++),
          color: 'wild',
          type: 'wildDrawFour',
          label: '★+4',
          title: 'Wild +4',
          desc: 'Choose a color, add up to 4 pieces to your half'
        });
      }

      return this.shuffle(cards);
    },

    shuffle: function (arr) {
      let shuffled = arr.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      return shuffled;
    },

    dealInitialHands: function () {
      this.state.hands.A = [];
      this.state.hands.B = [];
      for (let i = 0; i < CONFIG.INITIAL_HAND_SIZE; i++) {
        this.drawCardToSeat('A', true);
        this.drawCardToSeat('B', true);
      }
    },

    getTopDiscard: function () {
      if (this.state.discardPile.length === 0) return null;
      return this.state.discardPile[this.state.discardPile.length - 1];
    },

    drawCardToSeat: function (seat, silent) {
      if (this.state.deck.length === 0) {
        if (this.state.discardPile.length > 1) {
          let top = this.state.discardPile.pop();
          this.state.deck = this.shuffle(this.state.discardPile.slice());
          this.state.discardPile = [top];
          this.logCard('system', 'Discard pile reshuffled into the deck.');
        } else {
          return null;
        }
      }

      if (this.state.deck.length === 0) return null;

      let card = this.state.deck.pop();
      this.state.hands[seat].push(card);
      if (!silent) {
        this.logCard(this.colorOf(seat), `Player ${seat} drew [${card.title}]`);
      }
      return card;
    },

    // ----------------------------------------------------------
    // CARD PLAYABILITY & DRAW ACTION
    // ----------------------------------------------------------
    isCardPlayable: function (card) {
      if (!card) return false;
      if (card.type === 'wildDrawFour') return true;

      let top = this.getTopDiscard();
      if (!top) return true;

      let targetColor = this.state.currentColor || top.color;
      if (card.color === targetColor) return true;

      if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true;
      if (card.type !== 'number' && card.type === top.type) return true;
      if (card.label === top.label) return true;

      return false;
    },

    handleDrawAction: function (seat) {
      if (this.state.phase !== 'playCard') return;
      if (seat !== this.state.activeSeat) {
        this.showToast("Cannot draw on opponent's turn!");
        return;
      }

      // Snapshot history before drawing
      if (typeof main !== 'undefined' && main.methods && main.methods.createSnapshot) {
        main.variables.historyStack.push(main.methods.createSnapshot());
        main.variables.redoStack = [];
      }

      let drewPlayable = false;
      let drawnCount = 0;

      while (!drewPlayable) {
        let card = this.drawCardToSeat(seat, false);
        if (!card) {
          break; // Deck & discard are empty
        }
        drawnCount++;
        if (this.isCardPlayable(card)) {
          drewPlayable = true;
          this.showToast(`Drew playable card: [${card.label} ${card.color.toUpperCase()}]!`);
          break;
        }
      }

      if (!drewPlayable) {
        let hasAnyPlayable = this.state.hands[seat].some(c => this.isCardPlayable(c));
        if (!hasAnyPlayable) {
          this.showToast('No playable cards left and deck is empty — passing turn.');
          this.logCard('system', `Player ${seat} has no playable cards and deck is empty → turn passes.`);
          this.state.phase = 'playCard';
          main.methods.endturn(null);
          return;
        }
      }

      this.renderUI();
    },

    // ----------------------------------------------------------
    // CARD PLAY DISPATCHER
    // ----------------------------------------------------------
    playCard: function (cardId, seat) {
      if (typeof main !== 'undefined' && (main.variables.gameOver || main.variables.isPromoting)) {
        return;
      }

      if (seat !== this.state.activeSeat) {
        this.showToast("Cannot play cards on opponent's turn!");
        return;
      }

      if (this.state.phase !== 'playCard') {
        this.showToast('Finish your current action first!');
        return;
      }

      let hand = this.state.hands[seat];
      let cardIdx = hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return;
      let card = hand[cardIdx];

      if (!this.isCardPlayable(card)) {
        let top = this.getTopDiscard();
        let targetColor = this.state.currentColor || (top ? top.color : '');
        this.showToast(`Cannot play [${card.label} ${card.color.toUpperCase()}]: must match ${targetColor.toUpperCase()} or symbol/number (${top ? top.label : ''})!`);
        return;
      }

      // History snapshot for undo
      if (typeof main !== 'undefined' && main.methods && main.methods.createSnapshot) {
        main.variables.historyStack.push(main.methods.createSnapshot());
        main.variables.redoStack = [];
      }

      // Commit card from hand to discard pile
      hand.splice(cardIdx, 1);
      this.state.discardPile.push(card);
      if (card.type !== 'wildDrawFour') {
        this.state.currentColor = card.color;
      }
      this.state.cardPlayedThisTurn = true;

      // Check last-card victory condition for Number / Skip / Reverse immediately
      if (hand.length === 0 && (card.type === 'number' || card.type === 'skip' || card.type === 'reverse')) {
        this.logCard(this.colorOf(seat), `Player ${seat} played their last card [${card.label} ${card.color.toUpperCase()}]!`);
        this.triggerSeatWin(seat, 'Played their last card');
        this.renderUI();
        return;
      }

      // Execute card effect
      if (card.type === 'number') {
        this.executeNumberCard(card, seat);
      } else if (card.type === 'skip') {
        this.executeSkipCard(card, seat);
      } else if (card.type === 'reverse') {
        this.executeReverseCard(card, seat);
      } else if (card.type === 'drawTwo') {
        this.executeDrawTwoCard(card, seat);
      } else if (card.type === 'wildDrawFour') {
        this.executeWildDrawFour(card, seat);
      }
    },

    // ----------------------------------------------------------
    // CARD EFFECTS
    // ----------------------------------------------------------

    // NUMBER N (0-9): Player makes N chess moves this turn
    executeNumberCard: function (card, seat) {
      let n = card.value;
      this.logCard(this.colorOf(seat), `Player ${seat} played [${card.label} ${card.color.toUpperCase()}] → ${n} moves`);

      if (n === 0) {
        // 0 moves: turn immediately passes
        this.state.phase = 'playCard';
        this.renderUI();
        main.methods.endturn(null);
        return;
      }

      this.state.phase = 'moving';
      this.state.movesRemaining = n;
      this.state.movedPieces = [];
      this.showPromptBanner(`Moves remaining: ${n}`, false);
      this.renderUI();
    },

    // SKIP: Opponent's turn is skipped; active seat plays another card immediately
    executeSkipCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `Player ${seat} played [SKIP] ⊘ → Player ${this.otherSeat(seat)} is skipped!`);
      this.state.phase = 'playCard';
      this.state.cardPlayedThisTurn = false;
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.enPassantTarget = null;
      }
      this.showToast(`Player ${seat} played SKIP! Player ${this.otherSeat(seat)} is skipped. Play another card.`);
      this.renderUI();
    },

    // REVERSE: Swap sides (seatColor.A <-> seatColor.B) and rotate board 180°
    executeReverseCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `Player ${seat} played [REVERSE] ⇄ → Swapped sides!`);

      // 1. Swap seat colors immediately
      let temp = this.state.seatColor.A;
      this.state.seatColor.A = this.state.seatColor.B;
      this.state.seatColor.B = temp;

      // 2. Clear en passant target (colors changed)
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.enPassantTarget = null;
      }

      // 3. Physically rotate board 180° with CSS animation
      if (typeof $ !== 'undefined') {
        $('#board-wrapper').addClass('board-reversing');
        setTimeout(() => {
          $('#board-wrapper').removeClass('board-reversing');
        }, 650);
      }
      if (typeof main !== 'undefined' && main.methods && main.methods.flipBoard) {
        main.methods.flipBoard();
      }

      this.renderUI();

      // 4. Handle turn behavior
      if (CONFIG.REVERSE_TURN_BEHAVIOR === 'playAgain') {
        // Reverser keeps turn and gets 1 move with their new color
        if (typeof main !== 'undefined' && main.variables) {
          main.variables.turn = this.state.seatColor[seat];
        }
        this.state.phase = 'moving';
        this.state.movesRemaining = 1;
        this.state.movedPieces = [];
        this.showPromptBanner('Moves remaining: 1', false);
        this.renderUI();
      } else {
        // Default: 'passTurn' - Reverse uses up turn; turn passes to other seat
        this.state.phase = 'playCard';
        main.methods.endturn(null);
      }
    },

    // +2 DRAW TWO: Add up to 2 pieces to empty squares on own half
    executeDrawTwoCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `Player ${seat} played [+2] → Add up to 2 pieces to own half`);
      this.initiatePieceAddition(2, false, seat);
    },

    // WILD +4: Choose color, add up to 4 pieces to own half
    executeWildDrawFour: function (card, seat) {
      this.state.phase = 'colorPick';
      this.showColorPickerModal(seat);
    },

    showColorPickerModal: function (seat) {
      if (typeof $ === 'undefined') return;
      $('#uno-color-picker-modal').css('display', 'flex');
    },

    handleColorChosen: function (chosenColor, seat) {
      if (typeof $ === 'undefined') return;
      $('#uno-color-picker-modal').hide();
      this.state.currentColor = chosenColor;
      this.logCard(this.colorOf(seat), `Player ${seat} set active color to ${chosenColor.toUpperCase()}`);
      this.initiatePieceAddition(4, true, seat);
    },

    // ----------------------------------------------------------
    // PIECE ADDITION (+2 / +4 REVIVAL) SYSTEM
    // ----------------------------------------------------------
    initiatePieceAddition: function (count, isWild, seat) {
      this.state.phase = 'addingPieces';
      this.state.piecesToAdd = count;
      this.state.pendingPlacementPiece = null;
      this.state.placedPiecesThisAction = [];

      let color = this.colorOf(seat);
      let available = this.getAvailableRevivePieces(color);

      if (available.length === 0) {
        this.showToast('No captured pieces in Graveyard to revive! Click Done to finish.');
      } else if (available.length === 1) {
        // Auto-select the only available piece
        this.state.pendingPlacementPiece = { idx: 0, piece: available[0] };
      }

      this.updateReviveUIAndHighlights();
    },

    getAvailableRevivePieces: function (color) {
      if (CONFIG.ADD_SOURCE === 'reserve') {
        // Reserve piece fallback if configured
        return [
          { key: color + '_queen_res', type: color + '_queen', img: color === 'w' ? '&#9813;' : '&#9819;' },
          { key: color + '_rook_res', type: color + '_rook', img: color === 'w' ? '&#9814;' : '&#9820;' },
          { key: color + '_bishop_res', type: color + '_bishop', img: color === 'w' ? '&#9815;' : '&#9821;' },
          { key: color + '_knight_res', type: color + '_knight', img: color === 'w' ? '&#9816;' : '&#9822;' },
          { key: color + '_pawn_res', type: color + '_pawn', img: color === 'w' ? '&#9817;' : '&#9823;' }
        ];
      }
      return this.state.graveyard[color] || [];
    },

    updateReviveUIAndHighlights: function () {
      let color = this.activeColor();
      let piece = this.state.pendingPlacementPiece ? this.state.pendingPlacementPiece.piece : null;
      let isPawn = piece ? (piece.type.endsWith('_pawn') || piece.key.includes('pawn')) : false;

      this.highlightEmptySquaresForRevive(color, isPawn);
      let canCancel = this.state.placedPiecesThisAction.length === 0;

      let msg = `Add up to ${this.state.piecesToAdd} piece(s) to your half.`;
      if (piece) {
        msg += ` Click a highlighted square to place ${piece.type.replace(/^[wb]_/, '')}.`;
      } else {
        msg += ' Select a piece from Graveyard.';
      }
      this.showPromptBanner(msg, canCancel, true);
      this.renderUI();
    },

    highlightEmptySquaresForRevive: function (color, isPawn) {
      $('.gamecell').removeClass('revive-candidate swap-candidate');
      let board = (typeof main !== 'undefined' && main.methods) ? main.methods.getBoard() : {};

      // White home half: ranks 1-4 (pawns: 2-4)
      // Black home half: ranks 5-8 (pawns: 5-7)
      let minRow = color === 'w' ? 1 : 5;
      let maxRow = color === 'w' ? 4 : 8;

      for (let col = 1; col <= 8; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          if (isPawn && (row === 1 || row === 8)) continue;
          let cellId = main.methods.cellId(col, row);
          if (!board[cellId]) {
            $('#' + cellId).addClass('revive-candidate');
          }
        }
      }
    },

    clearReviveBoardHighlights: function () {
      $('.gamecell').removeClass('revive-candidate swap-candidate');
      $('.graveyard-piece-chip').removeClass('selected-revive');
    },

    handleGraveyardChipClick: function (idx, color) {
      if (this.state.phase !== 'addingPieces') return;
      if (color !== this.activeColor()) {
        this.showToast('You can only revive pieces of the color you currently control!');
        return;
      }

      let grave = this.state.graveyard[color];
      if (!grave || !grave[idx]) return;

      this.state.pendingPlacementPiece = { idx: idx, piece: grave[idx] };
      this.updateReviveUIAndHighlights();
    },

    executeRevivePlacementOnSquare: function (cellId) {
      if (this.state.phase !== 'addingPieces') return;
      let color = this.activeColor();
      let pending = this.state.pendingPlacementPiece;

      if (!pending) {
        let available = this.getAvailableRevivePieces(color);
        if (available.length > 0) {
          pending = { idx: 0, piece: available[0] };
          this.state.pendingPlacementPiece = pending;
        } else {
          this.showToast('No captured pieces in Graveyard to place!');
          return;
        }
      }

      let board = main.methods.getBoard();
      if (board[cellId]) {
        this.showToast('Must place on an EMPTY square!');
        return;
      }

      let parsed = main.methods.parseCell(cellId);
      let row = parsed.row;

      // Validate home half
      if (color === 'w' && (row < 1 || row > 4)) {
        this.showToast('White pieces can only be placed on ranks 1–4!');
        return;
      }
      if (color === 'b' && (row < 5 || row > 8)) {
        this.showToast('Black pieces can only be placed on ranks 5–8!');
        return;
      }

      let isPawn = pending.piece.type.endsWith('_pawn') || pending.piece.key.includes('pawn');
      if (isPawn && (row === 1 || row === 8)) {
        this.showToast('Pawns cannot be placed on rank 1 or 8!');
        return;
      }

      // Execute revival on board
      let pieceKey = pending.piece.key;
      let pieceObj = main.variables.pieces[pieceKey];
      if (pieceObj) {
        pieceObj.captured = false;
        pieceObj.position = cellId;
        pieceObj.moved = true;
        $('#' + cellId).html(pieceObj.img).attr('chess', pieceKey);
      }

      // Remove piece icon from #captured-white / #captured-black HTML
      let listSel = pieceKey.startsWith('w_') ? '#captured-white .captured-pieces-list' : '#captured-black .captured-pieces-list';
      let $list = $(listSel);
      if ($list && typeof $list.children === 'function') {
        let $spans = $list.children('span');
        if ($spans) {
          for (let i = 0; i < $spans.length; i++) {
            if ($($spans[i]).html && $($spans[i]).html().trim() === pieceObj.img.trim()) {
              if (typeof $($spans[i]).remove === 'function') {
                $($spans[i]).remove();
              }
              break;
            }
          }
        }
      } else if ($list && typeof $list.html === 'function') {
        let h = $list.html();
        if (h && typeof h === 'string') {
          $list.html(h.replace(`<span>${pieceObj.img}</span>`, ''));
        }
      }

      // Remove from graveyard
      this.state.graveyard[color].splice(pending.idx, 1);
      this.state.placedPiecesThisAction.push(pending.piece);
      this.state.piecesToAdd--;
      this.state.pendingPlacementPiece = null;

      // History snapshot for undo
      if (typeof main !== 'undefined' && main.methods && main.methods.createSnapshot) {
        main.variables.historyStack.push(main.methods.createSnapshot());
        main.variables.redoStack = [];
      }

      main.methods.updateVisualHighlights();

      let available = this.getAvailableRevivePieces(color);
      if (this.state.piecesToAdd <= 0 || available.length === 0) {
        this.finishPieceAddition();
      } else {
        if (available.length === 1) {
          this.state.pendingPlacementPiece = { idx: 0, piece: available[0] };
        }
        this.updateReviveUIAndHighlights();
      }
    },

    finishPieceAddition: function () {
      let seat = this.state.activeSeat;
      this.clearReviveBoardHighlights();
      this.hidePromptBanner();
      this.state.phase = 'playCard';

      // Check last-card win right after piece placement completes
      if (this.state.hands[seat].length === 0) {
        this.logCard(this.colorOf(seat), `Player ${seat} played their last card!`);
        this.triggerSeatWin(seat, 'Played their last card');
        this.renderUI();
        return;
      }

      this.renderUI();
      main.methods.endturn(null);
    },

    cancelPieceAddition: function () {
      if (this.state.placedPiecesThisAction.length > 0) {
        this.showToast('Cannot cancel after placing pieces; click Done instead.');
        return;
      }

      let seat = this.state.activeSeat;
      // Refund card to hand
      let topCard = this.state.discardPile.pop();
      if (topCard) {
        this.state.hands[seat].push(topCard);
      }

      // Reset active color to previous discard if Wild +4
      let prevTop = this.getTopDiscard();
      this.state.currentColor = prevTop ? prevTop.color : null;
      this.state.cardPlayedThisTurn = false;
      this.state.phase = 'playCard';
      this.clearReviveBoardHighlights();
      this.hidePromptBanner();

      // Undo the snapshot pushed on card play
      if (typeof main !== 'undefined' && main.variables && main.variables.historyStack.length > 0) {
        let prevSnap = main.variables.historyStack.pop();
        if (prevSnap) {
          main.methods.restoreSnapshot(prevSnap);
          return;
        }
      }

      this.renderUI();
    },

    // ----------------------------------------------------------
    // WIN DETECTION & GAME OVER
    // ----------------------------------------------------------
    triggerSeatWin: function (seat, reason) {
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.gameOver = true;
      }
      if (typeof ClockManager !== 'undefined') {
        ClockManager.stop();
      }
      let winnerTitle = `Player ${seat} Wins!`;
      let subtitle = reason || 'Game Over';
      $('#turn').addClass('turnhighlight').text(`${winnerTitle} — ${subtitle}`);
      if (typeof BoardStatusOverlay !== 'undefined') {
        BoardStatusOverlay.show(winnerTitle, subtitle, { isGameOver: true });
      }
      $('#rematch-btn').addClass('highlight-rematch');
      if (typeof AudioManager !== 'undefined') {
        AudioManager.playGameOver();
      }
      this.logCard('system', `${winnerTitle} (${subtitle})`);
    },

    // ----------------------------------------------------------
    // GAME ENGINE HOOKS
    // ----------------------------------------------------------
    usesPseudoLegal: function () {
      return this.state.active;
    },

    suppressesCheckLogic: function () {
      return this.state.active;
    },

    isActionBlocked: function () {
      if (!this.state.active) return false;
      return this.state.phase !== 'moving';
    },

    nextTurnColor: function (prevColor) {
      // Pure helper: returns the color of the other seat
      let nextSeat = this.otherSeat(this.state.activeSeat);
      return this.state.seatColor[nextSeat];
    },

    shouldHoldTurn: function () {
      if (!this.state.active) return false;
      if (this.state.phase === 'moving' && this.state.movesRemaining > 0) {
        let color = this.activeColor();
        if (this.hasAnyLegalMovesUnderMode(color)) {
          return true;
        }
      }
      return false;
    },

    onTurnHeld: function () {
      if (!this.state.active) return;
      if (this.state.phase === 'moving') {
        this.showPromptBanner(`Moves remaining: ${this.state.movesRemaining}`, false);
        this.renderUI();
      }
    },

    hasAnyLegalMovesUnderMode: function (color) {
      if (typeof main === 'undefined' || !main.variables) return false;
      for (let key in main.variables.pieces) {
        let p = main.variables.pieces[key];
        if (p.captured || !p.position) continue;
        if (main.methods.pieceColor(key) !== color) continue;
        let legal = main.methods.getLegalMoves(key);
        if (legal && legal.length > 0) return true;
      }
      return false;
    },

    filterLegalMoves: function (pieceKey, moves) {
      if (!this.state.active) return moves;
      if (this.state.phase !== 'moving') return [];

      let color = main.methods.pieceColor(pieceKey);
      if (color !== this.activeColor()) return [];

      if (CONFIG.MOVE_MODE === 'samePiece') {
        if (this.state.movedPieces.length > 0 && pieceKey !== this.state.movedPieces[0]) {
          return [];
        }
      } else if (CONFIG.MOVE_MODE === 'distinctPieces') {
        if (this.state.movedPieces.indexOf(pieceKey) !== -1) {
          return [];
        }
      }

      return moves;
    },

    onMove: function (fromCell, toCell, pieceKey, isCapture) {
      if (!this.state.active) return;
      if (this.state.phase === 'moving') {
        this.state.movesRemaining--;
        this.state.movedPieces.push(pieceKey);
        this.logCard(this.activeColor(), `Player ${this.state.activeSeat} moved ${pieceKey} to ${main.methods.toAlgebraic(toCell)} (${this.state.movesRemaining} moves left)`);
      }
    },

    onCapture: function (capturedKey, capturedPieceObj, capturingKey) {
      if (!this.state.active) return;

      // King capture ends the game immediately
      if (capturedKey.endsWith('_king')) {
        let isFirstTurn = (this.state.turnCount === 0);
        if (CONFIG.NO_KING_CAPTURE_ON_FIRST_TURN && isFirstTurn) {
          return;
        }
        let winningSeat = this.state.activeSeat;
        this.triggerSeatWin(winningSeat, 'King captured');
        return; // Kings never enter the Graveyard
      }

      let color = capturedKey.startsWith('w_') ? 'w' : 'b';
      this.state.graveyard[color].push({
        key: capturedKey,
        type: capturedPieceObj.type,
        img: capturedPieceObj.img,
        capturedAtTurn: this.state.turnCount,
        moveNumber: (typeof main !== 'undefined') ? main.variables.fullmoveNumber : 1
      });

      this.renderUI();
    },

    onTurnStart: function (playerColor) {
      if (!this.state.active) return;
      this.state.phase = 'playCard';
      this.state.movesRemaining = 0;
      this.state.movedPieces = [];
      this.state.cardPlayedThisTurn = false;
      this.hidePromptBanner();
      this.renderUI();
    },

    onTurnEnd: function (previousColor, nextColor) {
      if (!this.state.active) return;
      this.state.turnCount++;
      this.state.activeSeat = this.otherSeat(this.state.activeSeat);
      this.state.cardPlayedThisTurn = false;
      this.state.phase = 'playCard';
      this.clearReviveBoardHighlights();
      this.hidePromptBanner();
      this.renderUI();
    },

    onReset: function () {
      if (!this.state.active) return;
      this.startNewGame();
    },

    // ----------------------------------------------------------
    // STATE SNAPSHOTS (FOR UNDO / REDO)
    // ----------------------------------------------------------
    createSnapshot: function () {
      if (!this.state.active) return null;
      return JSON.parse(JSON.stringify({
        deck: this.state.deck,
        discardPile: this.state.discardPile,
        hands: this.state.hands,
        graveyard: this.state.graveyard,
        seatColor: this.state.seatColor,
        activeSeat: this.state.activeSeat,
        currentColor: this.state.currentColor,
        phase: this.state.phase,
        movesRemaining: this.state.movesRemaining,
        movedPieces: this.state.movedPieces,
        piecesToAdd: this.state.piecesToAdd,
        cardPlayedThisTurn: this.state.cardPlayedThisTurn,
        turnCount: this.state.turnCount,
        cardLog: this.state.cardLog
      }));
    },

    restoreSnapshot: function (snap) {
      if (!snap) return;
      this.state.deck = snap.deck || [];
      this.state.discardPile = snap.discardPile || [];
      this.state.hands = snap.hands || { A: [], B: [] };
      this.state.graveyard = snap.graveyard || { w: [], b: [] };
      this.state.seatColor = snap.seatColor || { A: 'w', B: 'b' };
      this.state.activeSeat = snap.activeSeat || 'A';
      this.state.currentColor = snap.currentColor || null;
      this.state.phase = snap.phase || 'playCard';
      this.state.movesRemaining = snap.movesRemaining || 0;
      this.state.movedPieces = snap.movedPieces || [];
      this.state.piecesToAdd = snap.piecesToAdd || 0;
      this.state.pendingPlacementPiece = null;
      this.state.placedPiecesThisAction = [];
      this.state.cardPlayedThisTurn = snap.cardPlayedThisTurn || false;
      this.state.turnCount = snap.turnCount || 0;
      this.state.cardLog = snap.cardLog || [];

      this.clearReviveBoardHighlights();
      this.hidePromptBanner();
      if (typeof $ !== 'undefined') {
        $('#uno-color-picker-modal').hide();
      }
      this.renderUI();
    },

    // ----------------------------------------------------------
    // UI RENDERING
    // ----------------------------------------------------------
    renderUI: function () {
      if (typeof $ === 'undefined' || !this.state.active) return;

      let activeSeat = this.state.activeSeat;
      let activeColor = this.activeColor();

      // 1. Deck & Discard Counts
      $('#deck-count-badge').text(this.state.deck.length);
      $('#discard-count-badge').text(this.state.discardPile.length);

      let topDiscard = this.getTopDiscard();
      if (topDiscard) {
        let discardEl = this.renderSingleCardHtml(topDiscard, false, true, null);
        $('#discard-top-display').html(discardEl);
      } else {
        $('#discard-top-display').html('<div class="uno-card mini-card empty-card"><span class="card-center empty-icon">∅</span></div>');
      }

      // 2. Active Color Swatch / Badge
      let currentC = this.state.currentColor || (topDiscard ? topDiscard.color : 'red');
      let $colorBadge = $('#uno-current-color-badge');
      if ($colorBadge.length) {
        $colorBadge.attr('class', 'uno-color-badge color-' + currentC).text(currentC.charAt(0).toUpperCase() + currentC.slice(1));
      }

      // 3. Hand Header Labels & Counts
      $('#hand-a-label').text(`Player A · ${this.state.seatColor.A === 'w' ? 'White' : 'Black'}`);
      $('#hand-b-label').text(`Player B · ${this.state.seatColor.B === 'w' ? 'White' : 'Black'}`);
      $('#hand-a-count').text(`${this.state.hands.A.length} cards`);
      $('#hand-b-count').text(`${this.state.hands.B.length} cards`);

      // 4. Hands: Active player face-up, inactive player face-down
      let aFaceDown = activeSeat !== 'A';
      let bFaceDown = activeSeat !== 'B';
      this.renderHand('A', '#hand-white-cards', aFaceDown);
      this.renderHand('B', '#hand-black-cards', bFaceDown);

      // 5. Draw button state
      $('#uno-draw-btn').prop('disabled', this.state.phase !== 'playCard');

      // 6. Turn Status Header
      if (typeof main !== 'undefined' && !main.variables.gameOver) {
        let colorName = activeColor === 'w' ? 'White' : 'Black';
        $('#turn').removeClass('turnhighlight').text(`Player ${activeSeat} (${colorName})'s Turn`);
      }

      // 7. Graveyard Trays
      this.renderGraveyard();

      // 8. Card Log
      this.renderCardLog();
    },

    renderHand: function (seat, containerSelector, isFaceDown) {
      let hand = this.state.hands[seat];
      let html = '';

      if (hand.length === 0) {
        html = '<div class="empty-hand-msg">No cards in hand</div>';
      } else {
        hand.forEach(card => {
          html += this.renderSingleCardHtml(card, isFaceDown, false, seat);
        });
      }

      $(containerSelector).html(html);
    },

    renderSingleCardHtml: function (card, isFaceDown, isMini, seat) {
      let miniCls = isMini ? ' mini-card' : '';
      if (isFaceDown) {
        return `
          <div class="uno-card face-down${miniCls}">
            <div class="card-back-pattern">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)"/>
                <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
              </svg>
            </div>
          </div>
        `;
      }

      let colorCls = ' card-' + card.color;
      let isPlayable = this.isCardPlayable(card);
      let disabledCls = (!isPlayable || this.state.phase !== 'playCard') ? ' unplayable' : '';

      return `
        <div class="uno-card${colorCls}${miniCls}${disabledCls}" data-id="${card.id}" data-seat="${seat || ''}" title="${card.title}: ${card.desc}">
          <div class="card-corner top-corner">${card.label}</div>
          <div class="card-center">${card.label}</div>
          <div class="card-type-label">${card.title}</div>
          <div class="card-corner bottom-corner">${card.label}</div>
        </div>
      `;
    },

    renderGraveyard: function () {
      let wGrave = this.state.graveyard.w;
      let bGrave = this.state.graveyard.b;
      let activeCol = this.activeColor();
      let isAdding = this.state.phase === 'addingPieces';

      let renderPieceChips = (grave, col) => {
        if (!grave || grave.length === 0) return '<span class="empty-grave">—</span>';
        return grave.map((p, idx) => {
          let isSel = (this.state.pendingPlacementPiece && this.state.pendingPlacementPiece.idx === idx && col === activeCol);
          let extraCls = (isAdding && col === activeCol) ? ' selectable-revive' : '';
          if (isSel) extraCls += ' selected-revive';
          return `<span class="graveyard-piece-chip${extraCls}" data-idx="${idx}" data-color="${col}" title="${col === 'w' ? 'White' : 'Black'} ${p.type}">${p.img}</span>`;
        }).join('');
      };

      $('#graveyard-white-pieces').html(renderPieceChips(wGrave, 'w'));
      $('#graveyard-black-pieces').html(renderPieceChips(bGrave, 'b'));
    },

    renderCardLog: function () {
      if (typeof $ === 'undefined') return;
      let html = '';
      this.state.cardLog.slice(0, 20).forEach(entry => {
        let tag = entry.color === 'system' ? 'SYSTEM' : (entry.color === 'w' ? 'White' : 'Black');
        html += `
          <div class="card-log-entry">
            <span class="log-color">${tag}:</span> ${entry.text}
          </div>
        `;
      });
      if (this.state.cardLog.length === 0) {
        html = '<div class="empty-log-msg">No cards played yet</div>';
      }
      $('#card-log-box').html(html);
    },

    logCard: function (color, actionText) {
      let turnNum = (typeof main !== 'undefined') ? main.variables.fullmoveNumber : 1;
      this.state.cardLog.unshift({
        turn: turnNum,
        color: color,
        text: actionText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      if (this.state.cardLog.length > 50) this.state.cardLog.pop();
      this.renderCardLog();
    },

    showPromptBanner: function (msg, showCancel, showDone) {
      if (typeof $ === 'undefined') return;
      $('#uno-prompt-text').text(msg);
      $('#uno-prompt-cancel').css('display', showCancel ? 'inline-block' : 'none');
      $('#uno-prompt-done').css('display', showDone ? 'inline-block' : 'none');
      $('#uno-prompt-banner').addClass('active');
    },

    hidePromptBanner: function () {
      if (typeof $ === 'undefined') return;
      $('#uno-prompt-banner').removeClass('active');
    },

    showToast: function (msg) {
      if (typeof $ === 'undefined' || typeof document === 'undefined') return;
      let body = $('body');
      if (!body || typeof body.append !== 'function') return;
      let toast = $('<div class="uno-toast"></div>').text(msg);
      body.append(toast);
      setTimeout(() => {
        toast.addClass('visible');
      }, 10);
      setTimeout(() => {
        toast.removeClass('visible');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    },

    // ----------------------------------------------------------
    // TUTORIAL PROMPT DIALOG
    // ----------------------------------------------------------
    showTutorialPrompt: function () {
      if (typeof $ === 'undefined' || typeof document === 'undefined') return;
      if ($('#uno-tutorial-prompt').length) return;
      const promptHtml = `
        <div id="uno-tutorial-prompt" class="brutalist-card">
          <div class="brutalist-card__header">
            <div class="brutalist-card__icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div class="brutalist-card__alert">UNO Mode</div>
          </div>
          <div class="brutalist-card__message">
            New to Spoodery Chess UNO? Would you like a quick tutorial to learn the card mechanics?
          </div>
          <div class="brutalist-card__actions">
            <label class="brutalist-card__dont-show">
              <input type="checkbox" id="uno-tutorial-dont-show"> Don't remind me again
            </label>
            <button class="brutalist-card__button brutalist-card__button--yes uno-tutorial-yes">Yes, show me!</button>
            <button class="brutalist-card__button brutalist-card__button--no uno-tutorial-no">No thanks</button>
          </div>
        </div>`;
      const $prompt = $(promptHtml);
      if ($('body') && typeof $('body').append === 'function') {
        $('body').append($prompt);
      }
      if ($prompt && typeof $prompt.find === 'function') {
        $prompt.find('.uno-tutorial-yes').on('click', () => {
          if (UnoMode.tutorial && typeof UnoMode.tutorial.start === 'function') {
            UnoMode.tutorial.start(true);
          }
          UnoMode._handleTutorialDismiss($prompt);
        });
        $prompt.find('.uno-tutorial-no').on('click', () => {
          UnoMode._handleTutorialDismiss($prompt);
        });
      }
    },

    _handleTutorialDismiss: function ($el) {
      const dontShow = $el.find('#uno-tutorial-dont-show').is(':checked');
      if (dontShow) {
        try { localStorage.setItem('chess_uno_tutorial_prompt_seen', 'true'); } catch (e) {}
      }
      $el.remove();
    },

    // ----------------------------------------------------------
    // EVENT BINDINGS
    // ----------------------------------------------------------
    bindEvents: function () {
      if (typeof $ === 'undefined') return;

      // Card click in hand
      $(document).on('click', '.uno-card:not(.face-down)', function () {
        let cardId = $(this).data('id');
        let seat = $(this).data('seat');
        if (!cardId || !seat) return;
        UnoMode.playCard(cardId, seat);
      });

      // Draw button click
      $(document).on('click', '#uno-draw-btn', function () {
        UnoMode.handleDrawAction(UnoMode.state.activeSeat);
      });

      // Color picker modal buttons (Wild +4)
      $(document).on('click', '.uno-color-pick-btn', function () {
        let color = $(this).data('color');
        if (color) {
          UnoMode.handleColorChosen(color, UnoMode.state.activeSeat);
        }
      });

      // Graveyard piece chip click (for piece addition)
      $(document).on('click', '.graveyard-piece-chip', function () {
        let idx = parseInt($(this).data('idx'), 10);
        let color = $(this).data('color');
        if (!isNaN(idx) && color) {
          UnoMode.handleGraveyardChipClick(idx, color);
        }
      });

      // Board square click during piece addition
      $(document).on('click', '.gamecell', function () {
        if (UnoMode.state.phase === 'addingPieces') {
          let cellId = $(this).attr('id');
          if (cellId) {
            UnoMode.executeRevivePlacementOnSquare(cellId);
          }
        }
      });

      // Banner Done button (finish piece addition early)
      $(document).on('click', '#uno-prompt-done', function () {
        if (UnoMode.state.phase === 'addingPieces') {
          UnoMode.finishPieceAddition();
        }
      });

      // Banner Cancel button (refund card if nothing placed yet)
      $(document).on('click', '#uno-prompt-cancel', function () {
        if (UnoMode.state.phase === 'addingPieces') {
          UnoMode.cancelPieceAddition();
        }
      });

      // Help Modal triggers
      $(document).on('click', '#help-btn', function () {
        UnoMode.help.open('overview');
      });

      $(document).on('click', '#close-help-modal', function () {
        UnoMode.help.close();
      });

      $(document).on('click', '#help-modal', function (e) {
        if ($(e.target).is('#help-modal')) {
          UnoMode.help.close();
        }
      });

      $(document).on('click', '.help-tab-btn', function () {
        let tab = $(this).data('tab');
        if (tab) UnoMode.help.switchTab(tab);
      });

      $(document).on('click', '#restart-tutorial-btn', function () {
        UnoMode.help.close();
        UnoMode.tutorial.start(true);
      });

      // Tutorial Navigation
      $(document).on('click', '#tutorial-next-btn', function () {
        UnoMode.tutorial.next();
      });

      $(document).on('click', '#tutorial-prev-btn', function () {
        UnoMode.tutorial.prev();
      });

      $(document).on('click', '#tutorial-skip-btn', function () {
        UnoMode.tutorial.skip();
      });
    },

    // ----------------------------------------------------------
    // RULEBOOK & HELP MODAL CONTROLLER
    // ----------------------------------------------------------
    help: {
      open: function (tabId) {
        if (typeof $ === 'undefined') return;
        this.switchTab(tabId || 'overview');
        $('#help-modal').css('display', 'flex');
      },
      close: function () {
        if (typeof $ === 'undefined') return;
        $('#help-modal').css('display', 'none');
      },
      switchTab: function (tabId) {
        if (typeof $ === 'undefined') return;
        $('.help-tab-btn').removeClass('active');
        $(`.help-tab-btn[data-tab="${tabId}"]`).addClass('active');
        $('.help-tab-panel').removeClass('active');
        $(`#help-tab-${tabId}`).addClass('active');
      }
    },

    // ----------------------------------------------------------
    // INTERACTIVE ONBOARDING TUTORIAL CONTROLLER (7 Steps)
    // ----------------------------------------------------------
    tutorial: {
      active: false,
      currentStep: 0,
      steps: [
        {
          target: '#board-stage',
          title: 'Welcome to Chess UNO',
          desc: 'Chess UNO brings Spoodery Chess\'s tabletop card variant to your screen! Players sit in fixed seats (A & B) controlling colors, playing cards, and racing to capture the enemy King or empty their hand!',
          placement: 'center'
        },
        {
          target: '#uno-hand-white',
          title: 'Your Card Hand',
          desc: 'Each player is dealt 6 cards. On your turn, you must play exactly one card matching the top discard by color, symbol, or number (Wild +4 is always playable).',
          placement: 'top'
        },
        {
          target: '#uno-main-panel .deck-status-bar',
          title: 'Draw Deck & Discard Pile',
          desc: 'If you have no playable card, click Draw to draw until a playable card appears. When the deck runs out, the discard pile reshuffles automatically.',
          placement: 'left'
        },
        {
          target: '#uno-main-panel .deck-status-bar',
          title: 'Number Cards (0–9)',
          desc: 'Playing a Number N gives you N chess moves this turn! Move any friendly piece, or move the same piece multiple times. Playing a 0 passes your turn.',
          placement: 'left'
        },
        {
          target: '#board-stage',
          title: 'Action Cards: Skip & Reverse',
          desc: 'Skip bypasses your opponent so you play again! Reverse physically rotates the board 180° and swaps piece colors between players—taking over the opponent\'s army!',
          placement: 'center'
        },
        {
          target: '#uno-graveyard-panel',
          title: 'Revival Cards: +2 and Wild +4',
          desc: '+2 lets you add up to 2 captured pieces back onto your home half of the board! Wild +4 lets you choose a color and place up to 4 captured pieces.',
          placement: 'right'
        },
        {
          target: '#turn',
          title: 'Victory Conditions',
          desc: 'Win instantly by capturing the enemy King (even mid-turn!) or by being the first player to empty your hand of cards! Have fun playing Chess UNO!',
          placement: 'bottom'
        }
      ],

      start: function (force) {
        if (typeof $ === 'undefined') return;
        if (!force) {
          try {
            if (localStorage.getItem('chess_uno_tutorial_seen') === 'true') return;
          } catch (e) {}
        }

        if (typeof GameModeManager !== 'undefined' && GameModeManager.activeMode !== 'uno') {
          GameModeManager.setMode('uno');
        }

        this.active = true;
        this.currentStep = 0;
        $('#uno-tutorial-overlay').css('display', 'block');
        this.renderStep(0);
      },

      renderStep: function (idx) {
        if (idx < 0 || idx >= this.steps.length) return;
        this.currentStep = idx;
        let step = this.steps[idx];

        $('#tutorial-step-tag').text(`Step ${idx + 1} of ${this.steps.length}`);
        $('#tutorial-step-title').text(step.title);
        $('#tutorial-step-desc').text(step.desc);

        // Progress dots
        let dotsHtml = '';
        for (let i = 0; i < this.steps.length; i++) {
          dotsHtml += `<div class="tutorial-dot${i === idx ? ' active' : ''}"></div>`;
        }
        $('#tutorial-dots').html(dotsHtml);

        // Navigation buttons
        $('#tutorial-prev-btn').prop('disabled', idx === 0);
        $('#tutorial-next-btn').text(idx === this.steps.length - 1 ? 'Finish' : 'Next ▶');

        let $target = $(step.target);
        if ($target.length && $target.is(':visible')) {
          let targetEl = $target[0];
          if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
            let rect = targetEl.getBoundingClientRect();
            let pad = 8;
            $('#uno-tutorial-overlay').removeClass('no-spotlight');
            $('#uno-tutorial-spotlight').css({
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

            $('#uno-tutorial-box').css({
              top: boxTop + 'px',
              left: boxLeft + 'px',
              transform: 'none'
            });
            return;
          }
        }

        $('#uno-tutorial-overlay').addClass('no-spotlight');
        $('#uno-tutorial-spotlight').css('display', 'none');
        $('#uno-tutorial-box').css({
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
          $('#uno-tutorial-overlay').css('display', 'none').removeClass('no-spotlight');
        }
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chess_uno_tutorial_seen', 'true');
          }
        } catch (e) {}
      }
    }
  };

  return UnoMode;
});

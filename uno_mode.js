/**
 * CHESS UNO MODE - SPOODERY CHESS UNO TABLETOP PLUGIN
 * Follows Spoodery Chess UNO variant:
 * - Two SEATS: Seat 'A' (You - bottom) and Seat 'B' (Opponent - top)
 * - 98-Card Deck (0-9 numbers, Skips, Reverses, +2 Draw Two, Wild +4)
 * - Number N grants N chess moves
 * - Skip skips opponent's turn, active seat plays again
 * - Reverse swaps sides (You <-> Opponent) and flips board 180°
 * - +2 and Wild +4 revive captured friendly pieces on own home half
 * - Top discard card displayed in center of chessboard with fanned stack
 * - Instant victory on King capture or playing last card
 * - Pseudo-legal chess moves; check/checkmate/stalemate/repetition suppressed
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UnoMode = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  const CONFIG = {
    SHOW_CENTER_CARD: true,
    CENTER_CARD_OPACITY_WHILE_MOVING: 0.35,
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
      phase: 'playCard', // 'playCard' | 'moving' | 'pickColor' | 'addingPieces'
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
    _centerCardAnimTimeout: null,
    _isCenterCardAnimating: false,

    // ----------------------------------------------------------
    // SEAT & COLOR HELPERS
    // ----------------------------------------------------------
    playerName: function (seat) {
      return (seat || this.state.activeSeat) === 'A' ? 'You' : 'Opponent';
    },

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

      this.ensureCenterCardContainer();

      if (this.state.deck.length === 0 && this.state.hands.A.length === 0) {
        this.startNewGame();
      }
      this.refreshBanner();
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
        $('#uno-center-card-container').hide();
      }
      if (this.help && typeof this.help.close === 'function') {
        this.help.close();
      }
      if (this.tutorial && this.tutorial.active) {
        this.tutorial.skip();
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
      this._isCenterCardAnimating = false;
      if (this._centerCardAnimTimeout) {
        clearTimeout(this._centerCardAnimTimeout);
        this._centerCardAnimTimeout = null;
      }
    },

    startNewGame: function () {
      this.resetState();
      this.ensureCenterCardContainer();

      // 1. Build and shuffle the 98-card deck
      this.state.deck = this.buildDeck();

      // 2. Deal 6 cards to each seat
      this.dealInitialHands();

      // 3. Flip one starting card onto the discard pile (must not be Wild +4)
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
      if (!initialCard) {
        initialCard = {
          id: 'card_init',
          color: 'red',
          type: 'number',
          value: 7,
          label: '7',
          title: 'Number 7',
          desc: 'Make 7 chess moves'
        };
      }
      this.state.discardPile.push(initialCard);
      this.state.currentColor = initialCard.color;

      // 4. Initialize engine turn to match Seat A's color (White)
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.turn = this.state.seatColor.A; // 'w'
      }

      this.clearReviveBoardHighlights();
      this.refreshBanner();
      this.renderUI();
      this.logCard('system', `Game started. You are White, Opponent is Black.`);
    },

    // ----------------------------------------------------------
    // DECK CREATION & MANAGEMENT
    // ----------------------------------------------------------
    buildDeck: function () {
      const colors = ['red', 'blue', 'green', 'yellow'];
      const dec = CONFIG.DECK;
      let cards = [];
      let cardId = 1;

      colors.forEach(color => {
        // Zero (1 per color by default)
        for (let i = 0; i < dec.zerosPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'number',
            value: 0,
            label: '0',
            title: 'Number 0',
            desc: 'Turn passes immediately (0 moves)'
          });
        }

        // Numbers 1-9 (2 each per color by default)
        for (let val = 1; val <= 9; val++) {
          for (let i = 0; i < dec.onesToNinesPerColor; i++) {
            cards.push({
              id: 'card_' + (cardId++),
              color: color,
              type: 'number',
              value: val,
              label: String(val),
              title: `Number ${val}`,
              desc: `Make ${val} chess moves this turn`
            });
          }
        }

        // Skips (2 per color by default)
        for (let i = 0; i < dec.skipsPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'skip',
            label: 'SKIP',
            title: 'Skip',
            desc: "Skip opponent's turn, play again"
          });
        }

        // Reverses (2 per color by default)
        for (let i = 0; i < dec.reversesPerColor; i++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'reverse',
            label: 'REV',
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
            value: 2,
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
          value: 4,
          label: '+4',
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
        this.logCard(this.colorOf(seat), `${this.playerName(seat)} drew [${card.title}]`);
      }
      return card;
    },

    // ----------------------------------------------------------
    // PLAYABILITY CHECK
    // ----------------------------------------------------------
    isCardPlayable: function (card) {
      if (!card) return false;
      if (card.type === 'wildDrawFour' || card.color === 'wild') return true;

      let top = this.getTopDiscard();
      if (!top) return true;

      let targetColor = this.state.currentColor || top.color;
      if (card.color === targetColor) return true;

      // Symbol or number matching
      if (top.type === 'number' && card.type === 'number' && top.value === card.value) {
        return true;
      }
      if (top.type !== 'number' && card.type === top.type) {
        return true;
      }
      if (card.label && top.label && card.label === top.label) {
        return true;
      }

      return false;
    },

    // ----------------------------------------------------------
    // DRAW BUTTON ACTION
    // ----------------------------------------------------------
    drawCardsUntilPlayable: function (seat) {
      if (this.state.phase !== 'playCard') {
        this.showToast('You cannot draw cards during this action!');
        return;
      }
      if (seat !== this.state.activeSeat) {
        this.showToast("Cannot draw cards on opponent's turn!");
        return;
      }

      // Snapshot history before drawing
      if (typeof main !== 'undefined' && main.methods && main.methods.createSnapshot) {
        main.variables.historyStack.push(main.methods.createSnapshot());
        main.variables.redoStack = [];
      }

      let drewPlayable = false;
      let drawCount = 0;

      while (!drewPlayable && drawCount < 40) {
        let card = this.drawCardToSeat(seat, false);
        if (!card) {
          break; // Deck & discard are empty
        }
        drawCount++;
        if (this.isCardPlayable(card)) {
          drewPlayable = true;
          this.showToast(`${this.playerName(seat)} drew playable card: [${card.label} ${card.color.toUpperCase()}]!`);
          break;
        }
      }

      if (!drewPlayable) {
        let hasAnyPlayable = this.state.hands[seat].some(c => this.isCardPlayable(c));
        if (!hasAnyPlayable) {
          this.showToast('No playable cards left and deck is empty — passing turn.');
          this.logCard('system', `${this.playerName(seat)} has no playable cards and deck is empty — turn passes.`);
          this.state.phase = 'playCard';
          this.refreshBanner();
          main.methods.endturn(null);
          return;
        }
      }

      this.renderUI();
    },

    handleDrawAction: function (seat) {
      this.drawCardsUntilPlayable(seat || this.state.activeSeat);
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

      // Animate center card fly-in from playing seat's hand
      this.renderCenterCard(true, seat);

      // Check last-card victory condition for Number / Skip / Reverse immediately
      if (hand.length === 0 && (card.type === 'number' || card.type === 'skip' || card.type === 'reverse')) {
        this.logCard(this.colorOf(seat), `${this.playerName(seat)} played their last card [${card.label} ${card.color.toUpperCase()}]!`);
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
      this.logCard(this.colorOf(seat), `${this.playerName(seat)} played [${card.label} ${card.color.toUpperCase()}] — ${n} moves`);

      if (n === 0) {
        // 0 moves: turn immediately passes
        this.state.phase = 'playCard';
        this.state.movesRemaining = 0;
        this.state.cardPlayedThisTurn = false;
        this.refreshBanner();
        this.renderUI();
        main.methods.endturn(null);
        return;
      }

      this.state.phase = 'moving';
      this.state.movesRemaining = n;
      this.state.movedPieces = [];
      this.refreshBanner();
      this.renderUI();
    },

    // SKIP: Opponent's turn is skipped; active seat plays another card immediately
    executeSkipCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `${this.playerName(seat)} played [SKIP] ⊘ — ${this.playerName(this.otherSeat(seat))} is skipped!`);
      this.state.phase = 'playCard';
      this.state.cardPlayedThisTurn = false;
      if (typeof main !== 'undefined' && main.variables) {
        main.variables.enPassantTarget = null;
      }
      this.showToast(`${this.playerName(seat)} played SKIP! ${this.playerName(this.otherSeat(seat))} is skipped. Play another card.`);
      this.refreshBanner();
      this.renderUI();
    },

    // REVERSE: Swap sides (seatColor.A <-> seatColor.B) and rotate board 180°
    executeReverseCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `${this.playerName(seat)} played [REVERSE] ⇄ — Swapped sides!`);

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
        this.refreshBanner();
        this.renderUI();
      } else {
        // Default: 'passTurn' - Reverse uses up turn; turn passes to other seat
        this.state.phase = 'playCard';
        this.refreshBanner();
        main.methods.endturn(null);
      }
    },

    // +2 DRAW TWO: Add up to 2 pieces to empty squares on own half
    executeDrawTwoCard: function (card, seat) {
      this.logCard(this.colorOf(seat), `${this.playerName(seat)} played [+2] — Add up to 2 pieces to own half`);
      this.initiatePieceAddition(2, false, seat);
    },

    // WILD +4: Choose color, add up to 4 pieces to own half
    executeWildDrawFour: function (card, seat) {
      this.state.phase = 'pickColor';
      this.refreshBanner();
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
      this.logCard(this.colorOf(seat), `${this.playerName(seat)} set active color to ${chosenColor.toUpperCase()}`);
      this.renderCenterCard(false);
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
        this.state.pendingPlacementPiece = { idx: 0, piece: available[0] };
      }

      this.updateReviveUIAndHighlights();
    },

    getAvailableRevivePieces: function (color) {
      if (CONFIG.ADD_SOURCE === 'reserve') {
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
      this.refreshBanner();
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
      let available = this.getAvailableRevivePieces(color);
      if (!available || !available[idx]) return;

      this.state.pendingPlacementPiece = { idx: idx, piece: available[idx] };
      this.updateReviveUIAndHighlights();
    },

    handleBoardSquareClickForRevive: function (cellId) {
      if (this.state.phase !== 'addingPieces') return;
      if (!this.state.pendingPlacementPiece) {
        this.showToast('First select a piece from the Graveyard to place!');
        return;
      }

      let color = this.activeColor();
      let piece = this.state.pendingPlacementPiece.piece;
      let isPawn = piece ? (piece.type.endsWith('_pawn') || piece.key.includes('pawn')) : false;

      // Coordinate checks
      let rank = parseInt(cellId.charAt(1), 10);
      if (color === 'w' && (rank < 1 || rank > 4)) {
        this.showToast('White pieces can only be placed on ranks 1–4!');
        return;
      }
      if (color === 'b' && (rank < 5 || rank > 8)) {
        this.showToast('Black pieces can only be placed on ranks 5–8!');
        return;
      }
      if (isPawn && (rank === 1 || rank === 8)) {
        this.showToast('Pawns cannot be placed on rank 1 or 8!');
        return;
      }

      let board = main.methods.getBoard();
      if (board[cellId]) {
        this.showToast('You can only place pieces on empty squares!');
        return;
      }

      this.executeRevivePlacementOnSquare(cellId, piece);
    },

    executeRevivePlacementOnSquare: function (cellId, piece) {
      piece = piece || (this.state.pendingPlacementPiece ? this.state.pendingPlacementPiece.piece : null);
      if (!piece) return;
      let color = this.activeColor();
      let pieceKey = piece.key;
      let pieceObj = main.variables.pieces[pieceKey];

      if (pieceObj) {
        pieceObj.captured = false;
        pieceObj.position = cellId;
        pieceObj.moved = true;
      }

      // Update board DOM
      $('#' + cellId).html(piece.img).attr('chess', pieceKey);

      // Remove from Graveyard
      let grave = this.state.graveyard[color];
      let pIdx = grave.findIndex(p => p.key === pieceKey);
      if (pIdx !== -1) {
        grave.splice(pIdx, 1);
      }

      // Remove from side capture tray UI
      let traySel = (color === 'w') ? '#captured-black .captured-pieces-list' : '#captured-white .captured-pieces-list';
      let $tray = $(traySel);
      if ($tray && typeof $tray.children === 'function') {
        let spans = $tray.children('span');
        if (spans && spans.length > 0) {
          spans.last().remove();
        }
      }

      this.state.placedPiecesThisAction.push({ cellId: cellId, piece: piece });
      this.state.piecesToAdd--;
      this.state.pendingPlacementPiece = null;

      this.logCard(color, `${this.playerName(this.state.activeSeat)} revived ${piece.type.replace(/^[wb]_/, '')} on ${cellId}`);

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
      this.state.phase = 'playCard';
      this.refreshBanner();

      // Check last-card win right after piece placement completes
      if (this.state.hands[seat].length === 0) {
        this.logCard(this.colorOf(seat), `${this.playerName(seat)} played their last card!`);
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
      this.refreshBanner();

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
      let winnerTitle = seat === 'A' ? 'You Win!' : 'Opponent Wins!';
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
      this.refreshBanner();
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
        this.refreshBanner();
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
        this.logCard(this.activeColor(), `${this.playerName(this.state.activeSeat)} moved ${pieceKey} to ${main.methods.toAlgebraic(toCell)} (${this.state.movesRemaining} moves left)`);
        this.refreshBanner();
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
      this.refreshBanner();
      this.renderUI();
    },

    onTurnEnd: function (previousColor, nextColor) {
      if (!this.state.active) return;
      this.state.activeSeat = this.otherSeat(this.state.activeSeat);
      this.state.turnCount++;
      this.state.phase = 'playCard';
      this.state.cardPlayedThisTurn = false;
      this.clearReviveBoardHighlights();
      this.refreshBanner();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // SNAPSHOT SYSTEM (Fidelity across Undo/Redo)
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
      this._isCenterCardAnimating = false;

      this.clearReviveBoardHighlights();
      if (typeof $ !== 'undefined') {
        $('#uno-color-picker-modal').hide();
      }
      this.refreshBanner();
      this.renderCenterCard(false);
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

      // 2. Active Color Swatch / Badge
      let currentC = this.state.currentColor || (topDiscard ? topDiscard.color : 'red');
      let $colorBadge = $('#uno-current-color-badge');
      if ($colorBadge.length) {
        $colorBadge.attr('class', 'uno-color-badge color-' + currentC).text(currentC.charAt(0).toUpperCase() + currentC.slice(1));
      }

      // 3. Hand Header Labels & Counts (YOU vs OPPONENT)
      let colorA = this.state.seatColor.A === 'w' ? 'WHITE' : 'BLACK';
      let colorB = this.state.seatColor.B === 'w' ? 'WHITE' : 'BLACK';
      $('#hand-a-label').text(`YOU · ${colorA}`);
      $('#hand-b-label').text(`OPPONENT · ${colorB}`);
      $('#hand-a-count').text(`${this.state.hands.A.length} cards`);
      $('#hand-b-count').text(`${this.state.hands.B.length} cards`);

      // 4. Player Bars consistency
      let youColor = this.state.seatColor.A === 'w' ? 'White' : 'Black';
      let oppColor = this.state.seatColor.B === 'w' ? 'White' : 'Black';
      $('#bottom-player-name').text('You');
      $('#bottom-player-meta').text(youColor);
      $('#top-player-name').text('Opponent');
      $('#top-player-meta').text(oppColor);

      // 5. Hands: Active player face-up, inactive player face-down
      let aFaceDown = activeSeat !== 'A';
      let bFaceDown = activeSeat !== 'B';
      this.renderHand('A', '#hand-white-cards', aFaceDown);
      this.renderHand('B', '#hand-black-cards', bFaceDown);

      // 6. Draw button state
      $('#uno-draw-btn').prop('disabled', this.state.phase !== 'playCard');

      // 7. Turn Status Header
      if (typeof main !== 'undefined' && !main.variables.gameOver) {
        let colorName = activeColor === 'w' ? 'White' : 'Black';
        if (activeSeat === 'A') {
          $('#turn').removeClass('turnhighlight').text(`You (${colorName})'s Turn`);
        } else {
          $('#turn').removeClass('turnhighlight').text(`Opponent (${colorName})'s Turn`);
        }
      }

      // 8. Graveyard Trays
      this.renderGraveyard();

      // 9. Card Log
      this.renderCardLog();

      // 10. Center Played Card on Chessboard
      this.renderCenterCard(false);

      // 11. Interaction Banner
      this.refreshBanner();
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

    // ----------------------------------------------------------
    // CENTER CHESSBOARD PLAYED CARD (SPOODERY TABLETOP)
    // ----------------------------------------------------------
    ensureCenterCardContainer: function () {
      if (typeof $ === 'undefined') return null;
      let $cont = $('#uno-center-card-container');
      if (!$cont.length) {
        let $board = $('#board-wrapper');
        if (!$board.length) $board = $('#board-stage');
        if ($board.length) {
          $cont = $('<div id="uno-center-card-container" class="uno-only uno-center-card-container" style="display:none;"><div id="uno-center-card-stack" class="uno-center-card-stack"></div></div>');
          let $overlay = $('#board-status-overlay');
          if ($overlay.length) {
            $cont.insertBefore($overlay);
          } else {
            $board.append($cont);
          }
        }
      }
      return $cont;
    },

    getCardTilt: function (card) {
      if (!card) return 0;
      if (card._tilt !== undefined) return card._tilt;
      let hash = 0;
      let str = String(card.id || card.title || card.label || '');
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
      }
      card._tilt = Number((((Math.abs(hash) % 160) - 80) / 10).toFixed(1));
      return card._tilt;
    },

    renderCenterCard: function (animate, playedSeat) {
      if (typeof $ === 'undefined') return;
      this.ensureCenterCardContainer();
      const $container = $('#uno-center-card-container');
      if (!$container.length) return;

      if (!CONFIG.SHOW_CENTER_CARD || this.state.discardPile.length === 0) {
        $container.hide();
        return;
      }

      $container.show();
      if (this.state.phase === 'moving') {
        $container.addClass('moving-phase').css('opacity', CONFIG.CENTER_CARD_OPACITY_WHILE_MOVING);
      } else {
        $container.removeClass('moving-phase').css('opacity', 1);
      }

      // If animation was triggered, preserve it until duration finishes
      if (!animate && this._isCenterCardAnimating) {
        return;
      }

      const pile = this.state.discardPile;
      const topCard = pile[pile.length - 1];
      const prev1 = pile.length >= 2 ? pile[pile.length - 2] : null;
      const prev2 = pile.length >= 3 ? pile[pile.length - 3] : null;

      let html = '';

      if (prev2) {
        let tilt2 = this.getCardTilt(prev2) + 5;
        html += this.renderCenterCardHtml(prev2, 'under-2', tilt2, 'translate(calc(-50% - 5px), calc(-50% + 4px))', '');
      }

      if (prev1) {
        let tilt1 = this.getCardTilt(prev1) - 4;
        html += this.renderCenterCardHtml(prev1, 'under-1', tilt1, 'translate(calc(-50% + 5px), calc(-50% - 3px))', '');
      }

      let topTilt = this.getCardTilt(topCard);
      let animClass = '';
      if (animate && playedSeat) {
        animClass = playedSeat === 'A' ? 'flying-bottom' : 'flying-top';
        this._isCenterCardAnimating = true;
        if (this._centerCardAnimTimeout) clearTimeout(this._centerCardAnimTimeout);
        this._centerCardAnimTimeout = setTimeout(() => {
          UnoMode._isCenterCardAnimating = false;
          UnoMode.renderCenterCard(false);
        }, 340);
      }

      html += this.renderCenterCardHtml(topCard, 'top', topTilt, 'translate(-50%, -50%)', animClass);

      $('#uno-center-card-stack').html(html);
    },

    renderCenterCardHtml: function (card, role, tilt, transformPrefix, animClass) {
      let colorCls = ' card-' + card.color;
      let ringCls = '';
      if (card.color === 'wild' || card.type === 'wildDrawFour') {
        let chosen = this.state.currentColor || 'red';
        ringCls = ` wild-active-ring-${chosen}`;
      }
      let roleCls = role ? ` card-${role}` : ' card-top';
      let anim = animClass ? ` ${animClass}` : '';
      let style = `--target-tilt: ${tilt}deg; transform: ${transformPrefix} rotate(${tilt}deg);`;

      return `
        <div class="uno-card uno-center-card${colorCls}${roleCls}${ringCls}${anim}" style="${style}">
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

      let renderList = (arr, color) => {
        if (!arr || arr.length === 0) return '<span class="empty-grave">—</span>';
        let isControlled = (color === activeCol);
        return arr.map((item, idx) => {
          let selected = isAdding && isControlled && this.state.pendingPlacementPiece && this.state.pendingPlacementPiece.idx === idx;
          let selectable = isAdding && isControlled;
          let cls = 'graveyard-piece-chip';
          if (selectable) cls += ' selectable-revive';
          if (selected) cls += ' selected-revive';
          return `<span class="${cls}" data-idx="${idx}" data-color="${color}" title="${item.type}">${item.img}</span>`;
        }).join('');
      };

      $('#graveyard-white-pieces').html(renderList(wGrave, 'w'));
      $('#graveyard-black-pieces').html(renderList(bGrave, 'b'));
    },

    renderCardLog: function () {
      let entries = this.state.cardLog.slice(0, 30);
      let html = entries.map(entry => {
        let dotCls = 'system';
        if (entry.color === 'w') dotCls = 'white';
        else if (entry.color === 'b') dotCls = 'black';
        return `
          <div class="log-entry">
            <span class="log-turn-badge">T${entry.turn}</span>
            <span class="log-dot ${dotCls}"></span>
            <span class="log-text">${entry.text}</span>
          </div>
        `;
      }).join('');
      $('#card-log-box').html(html);
    },

    logCard: function (color, actionText) {
      let turnNum = (typeof main !== 'undefined') ? main.variables.fullmoveNumber : 1;
      this.state.cardLog.unshift({
        turn: turnNum,
        color: color,
        text: actionText
      });
      if (this.state.cardLog.length > 50) this.state.cardLog.pop();
      this.renderCardLog();
    },

    // ----------------------------------------------------------
    // DYNAMIC INTERACTION BANNER
    // ----------------------------------------------------------
    refreshBanner: function () {
      if (typeof $ === 'undefined') return;
      const $banner = $('#uno-prompt-banner');
      const $text = $('#uno-prompt-text');
      const $done = $('#uno-prompt-done');
      const $cancel = $('#uno-prompt-cancel');

      if (!$banner.length) return;

      // 1. Hide completely on game over
      if (typeof main !== 'undefined' && main.variables && main.variables.gameOver) {
        $banner.removeClass('active').hide();
        $text.text('');
        $done.hide();
        $cancel.hide();
        return;
      }

      // 2. Phase-specific handling
      switch (this.state.phase) {
        case 'playCard': {
          $done.hide();
          $cancel.hide();
          if (this.state.activeSeat === 'A') {
            $text.text('Your turn: play a card or Draw');
            $banner.addClass('active').show();
          } else {
            // Seat B (Opponent) is acting; keep banner hidden
            $banner.removeClass('active').hide();
            $text.text('');
          }
          break;
        }

        case 'moving': {
          $done.hide();
          $cancel.hide();
          let msg = `Moves remaining: ${this.state.movesRemaining}`;
          if (CONFIG.MOVE_MODE === 'samePiece') {
            msg += ' (same piece only)';
          } else if (CONFIG.MOVE_MODE === 'distinctPieces') {
            msg += ' (distinct pieces only)';
          }
          $text.text(msg);
          $banner.addClass('active').show();
          break;
        }

        case 'colorPick':
        case 'pickColor': {
          $done.hide();
          $cancel.hide();
          $text.text('Choose a color');
          $banner.addClass('active').show();
          break;
        }

        case 'addingPieces': {
          let rem = this.state.piecesToAdd;
          $text.text(`Add up to ${rem} pieces: pick a piece, then a highlighted square`);
          $done.show();
          if (this.state.placedPiecesThisAction.length === 0) {
            $cancel.show();
          } else {
            $cancel.hide();
          }
          $banner.addClass('active').show();
          break;
        }

        default: {
          $banner.removeClass('active').hide();
          $text.text('');
          $done.hide();
          $cancel.hide();
          break;
        }
      }
    },

    showPromptBanner: function (msg, showCancel, showDone) {
      if (typeof $ === 'undefined') return;
      $('#uno-prompt-text').text(msg || '');
      $('#uno-prompt-cancel').css('display', showCancel ? 'inline-block' : 'none');
      $('#uno-prompt-done').css('display', showDone ? 'inline-block' : 'none');
      $('#uno-prompt-banner').addClass('active').show();
    },

    hidePromptBanner: function () {
      if (typeof $ === 'undefined') return;
      $('#uno-prompt-banner').removeClass('active').hide();
      $('#uno-prompt-text').text('');
      $('#uno-prompt-cancel').hide();
      $('#uno-prompt-done').hide();
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
          <div class="uno-tutorial-header">
            <span class="uno-tutorial-badge">TUTORIAL</span>
            <h3>Master Chess UNO</h3>
          </div>
          <p class="uno-tutorial-body">
            New to Spoodery Chess UNO? Take a quick guided tour to learn card matching, multi-moves, piece revival, and the Reverse board flip!
          </p>
          <div class="uno-tutorial-actions">
            <button class="uno-tutorial-btn uno-tutorial-yes">Take Tour (1 min)</button>
            <button class="uno-tutorial-btn uno-tutorial-no">Maybe Later</button>
          </div>
          <label class="uno-tutorial-checkbox-label">
            <input type="checkbox" id="uno-tutorial-dont-ask"> Don't show this again
          </label>
        </div>
      `;
      const $prompt = $(promptHtml);
      if (typeof $('body').append === 'function') {
        $('body').append($prompt);
      }
      if ($prompt && typeof $prompt.find === 'function') {
        $prompt.find('.uno-tutorial-yes').on('click', () => {
          UnoMode.tutorial.start(true);
          UnoMode._handleTutorialDismiss($prompt);
        });
        $prompt.find('.uno-tutorial-no').on('click', () => {
          UnoMode._handleTutorialDismiss($prompt);
        });
      }
    },

    _handleTutorialDismiss: function ($prompt) {
      let dontAsk = $('#uno-tutorial-dont-ask').is(':checked');
      if (dontAsk) {
        try { localStorage.setItem('chess_uno_tutorial_prompt_seen', 'true'); } catch (e) {}
      }
      $prompt.remove();
    },

    // ----------------------------------------------------------
    // EVENT BINDINGS
    // ----------------------------------------------------------
    bindEvents: function () {
      if (typeof $ === 'undefined') return;

      // Card click
      $(document).on('click', '.uno-card:not(.face-down):not(.mini-card):not(.uno-center-card)', function () {
        let cardId = $(this).data('id');
        let seat = $(this).data('seat');
        if (cardId && seat) {
          UnoMode.playCard(cardId, seat);
        }
      });

      // Draw button
      $(document).on('click', '#uno-draw-btn', function () {
        UnoMode.drawCardsUntilPlayable(UnoMode.state.activeSeat);
      });

      // Graveyard piece chip click (for revival selection)
      $(document).on('click', '.graveyard-piece-chip.selectable-revive', function () {
        let idx = parseInt($(this).data('idx'), 10);
        let color = $(this).data('color');
        UnoMode.handleGraveyardChipClick(idx, color);
      });

      // Board candidate square click (for revival placement)
      $(document).on('click', '.gamecell.revive-candidate', function () {
        let cellId = $(this).attr('id');
        if (cellId) {
          UnoMode.handleBoardSquareClickForRevive(cellId);
        }
      });

      // Color picker modal choices
      $(document).on('click', '.uno-color-pick-btn', function () {
        let chosen = $(this).data('color');
        if (chosen) {
          UnoMode.handleColorChosen(chosen, UnoMode.state.activeSeat);
        }
      });

      // Prompt Done button
      $(document).on('click', '#uno-prompt-done', function () {
        if (UnoMode.state.phase === 'addingPieces') {
          UnoMode.finishPieceAddition();
        }
      });

      // Prompt Cancel button
      $(document).on('click', '#uno-prompt-cancel', function () {
        if (UnoMode.state.phase === 'addingPieces') {
          UnoMode.cancelPieceAddition();
        }
      });

      // Unplayable card toast hint
      $(document).on('click', '.uno-card.unplayable:not(.face-down):not(.uno-center-card)', function () {
        let top = UnoMode.getTopDiscard();
        let targetColor = UnoMode.state.currentColor || (top ? top.color : '');
        UnoMode.showToast(`Unplayable: must match ${targetColor.toUpperCase()} or symbol/number (${top ? top.label : ''})!`);
      });
    },

    // ----------------------------------------------------------
    // HELP MODAL CONTROLLER
    // ----------------------------------------------------------
    help: {
      open: function () {
        if (typeof $ === 'undefined') return;
        $('#uno-help-modal').css('display', 'flex');
        this.switchTab('welcome');
      },
      close: function () {
        if (typeof $ === 'undefined') return;
        $('#uno-help-modal').hide();
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
          desc: "Chess UNO brings Spoodery Chess's tabletop card variant to your screen! You and your opponent play cards, control pieces, and race to capture the enemy King or empty your hand!",
          placement: 'center'
        },
        {
          target: '#uno-hand-white',
          title: 'Your Card Hand',
          desc: 'Each player is dealt 6 cards. On your turn, you must play exactly one card matching the top discard by color, symbol, or number (Wild +4 is always playable).',
          placement: 'top'
        },
        {
          target: '#uno-center-card-container',
          title: 'Center Discard & Draw Deck',
          desc: 'The top card of the discard pile sits in the center of the chessboard. If you have no playable card, click Draw to draw until a playable card appears.',
          placement: 'center'
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
          desc: "Skip bypasses your opponent so you play again! Reverse physically rotates the board 180° and swaps piece colors between players—taking over the opponent's army!",
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
        this.renderStep();
      },

      renderStep: function () {
        let step = this.steps[this.currentStep];
        if (!step) {
          this.finish();
          return;
        }

        $('.uno-tutorial-box').remove();

        let box = $(`
          <div class="uno-tutorial-box brutalist-card">
            <div class="uno-tutorial-header">
              <span class="uno-tutorial-step-badge">${this.currentStep + 1} / ${this.steps.length}</span>
              <h4>${step.title}</h4>
            </div>
            <p class="uno-tutorial-text">${step.desc}</p>
            <div class="uno-tutorial-footer">
              <button class="uno-btn-subtle" id="tutorial-skip-btn">Skip Tour</button>
              <div class="uno-tutorial-nav">
                ${this.currentStep > 0 ? '<button class="uno-btn-secondary" id="tutorial-prev-btn">Back</button>' : ''}
                <button class="uno-btn-primary" id="tutorial-next-btn">${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next →'}</button>
              </div>
            </div>
          </div>
        `);

        let $body = $('body');
        if ($body && typeof $body.append === 'function') {
          $body.append(box);
        }
        this.positionBox(box, step.target, step.placement);

        let idx = this.currentStep;
        $('#tutorial-next-btn').on('click', () => {
          if (idx === this.steps.length - 1) {
            this.finish();
          } else {
            this.next();
          }
        });

        $('#tutorial-prev-btn').on('click', () => {
          this.prev();
        });

        $('#tutorial-skip-btn').on('click', () => {
          this.skip();
        });
      },

      next: function () {
        if (this.currentStep < this.steps.length - 1) {
          this.currentStep++;
          this.renderStep();
        } else {
          this.finish();
        }
      },

      prev: function () {
        if (this.currentStep > 0) {
          this.currentStep--;
          this.renderStep();
        }
      },

      positionBox: function (box, targetSel, placement) {
        let $target = $(targetSel);
        if (!$target.length) {
          box.css({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' });
          return;
        }

        try {
          let offset = $target.offset();
          let targetWidth = $target.outerWidth();
          let targetHeight = $target.outerHeight();
          let boxWidth = box.outerWidth() || 320;
          let boxHeight = box.outerHeight() || 180;

          let boxLeft = 0;
          let boxTop = 0;

          if (placement === 'center') {
            boxLeft = offset.left + (targetWidth / 2) - (boxWidth / 2);
            boxTop = offset.top + (targetHeight / 2) - (boxHeight / 2);
          } else if (placement === 'top') {
            boxLeft = offset.left + (targetWidth / 2) - (boxWidth / 2);
            boxTop = offset.top - boxHeight - 14;
          } else if (placement === 'bottom') {
            boxLeft = offset.left + (targetWidth / 2) - (boxWidth / 2);
            boxTop = offset.top + targetHeight + 14;
          } else if (placement === 'left') {
            boxLeft = offset.left - boxWidth - 14;
            boxTop = offset.top + (targetHeight / 2) - (boxHeight / 2);
          } else if (placement === 'right') {
            boxLeft = offset.left + targetWidth + 14;
            boxTop = offset.top + (targetHeight / 2) - (boxHeight / 2);
          }

          if (typeof window !== 'undefined') {
            let maxLeft = window.innerWidth - boxWidth - 16;
            let maxTop = window.innerHeight - boxHeight - 16;
            boxLeft = Math.max(16, Math.min(boxLeft, maxLeft));
            boxTop = Math.max(16, Math.min(boxTop, maxTop));
          }

          box.css({ top: boxTop + 'px', left: boxLeft + 'px', position: 'absolute' });
        } catch (e) {
          box.css({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' });
        }
      },

      finish: function () {
        this.active = false;
        $('.uno-tutorial-box').remove();
        try { localStorage.setItem('chess_uno_tutorial_seen', 'true'); } catch (e) {}
      },

      skip: function () {
        this.finish();
      }
    }
  };

  return UnoMode;
});

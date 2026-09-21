/**
 * ==========================================================
 * CHESS UNO MODE — TABLETOP PLUGIN FOR JS CHESS
 * ==========================================================
 * Integrates UNO card mechanics seamlessly into standard chess.
 * Follows FIDE rules and maintains chess as the primary strategic driver.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UnoMode = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {

  const UnoMode = {
    name: 'uno',
    displayName: 'Chess UNO',

    state: {
      active: false,
      deck: [],
      discardPile: [],
      hands: {
        w: [],
        b: []
      },
      energy: {
        w: 0,
        b: 0
      },
      graveyard: {
        w: [], // White pieces captured (now in graveyard)
        b: []  // Black pieces captured (now in graveyard)
      },
      skippedPiece: null, // { pieceKey, targetCell, forTurn, appliedTurn }
      pendingEffect: null, // { type, card, step, data }
      turnCount: 0,
      cardPlayedThisTurn: false,
      cardLog: []
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
      if (this.state.deck.length === 0 && this.state.hands.w.length === 0) {
        this.startNewGame();
      }
      this.renderUI();
      this.logCard('system', 'Chess UNO Mode activated. Draw your cards and play!');
    },

    onDeactivate: function () {
      this.state.active = false;
      this.clearPendingEffect();
      this.clearSkipHighlight();
    },

    resetState: function () {
      this.state.deck = [];
      this.state.discardPile = [];
      this.state.hands = { w: [], b: [] };
      this.state.energy = { w: 0, b: 0 };
      this.state.graveyard = { w: [], b: [] };
      this.state.skippedPiece = null;
      this.state.pendingEffect = null;
      this.state.turnCount = 0;
      this.state.cardPlayedThisTurn = false;
      this.state.cardLog = [];
    },

    startNewGame: function () {
      this.resetState();
      this.state.deck = this.buildDeck();
      this.dealInitialHands();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // DECK GENERATION & SHUFFLING
    // ----------------------------------------------------------
    buildDeck: function () {
      const colors = ['red', 'blue', 'green', 'yellow'];
      let cards = [];
      let cardId = 1;

      colors.forEach(color => {
        // One '0' per color
        cards.push({
          id: 'card_' + (cardId++),
          color: color,
          type: 'number',
          value: 0,
          label: '0',
          title: 'Number 0',
          desc: '+0 Energy'
        });

        // Two of 1–9 per color
        for (let num = 1; num <= 9; num++) {
          for (let c = 0; c < 2; c++) {
            cards.push({
              id: 'card_' + (cardId++),
              color: color,
              type: 'number',
              value: num,
              label: String(num),
              title: 'Number ' + num,
              desc: `+${num} Energy`
            });
          }
        }

        // Two Skips per color
        for (let c = 0; c < 2; c++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'skip',
            label: '⊘',
            title: 'Skip',
            desc: 'Freeze one enemy piece for their next turn'
          });
        }

        // Two Reverses per color
        for (let c = 0; c < 2; c++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'reverse',
            label: '⇄',
            title: 'Reverse',
            desc: 'Swap positions of 2 friendly pieces'
          });
        }

        // Two Draw Twos per color
        for (let c = 0; c < 2; c++) {
          cards.push({
            id: 'card_' + (cardId++),
            color: color,
            type: 'drawTwo',
            label: '+2',
            title: 'Draw Two',
            desc: 'Revive 1 captured friendly pawn'
          });
        }
      });

      // 4 Wild cards
      for (let i = 0; i < 4; i++) {
        cards.push({
          id: 'card_' + (cardId++),
          color: 'wild',
          type: 'wild',
          label: '★',
          title: 'Wild',
          desc: 'Choose a friendly piece to make an immediate move'
        });
      }

      // 4 Wild Draw Four cards
      for (let i = 0; i < 4; i++) {
        cards.push({
          id: 'card_' + (cardId++),
          color: 'wild',
          type: 'wildDrawFour',
          label: '★+4',
          title: 'Wild +4',
          desc: 'Revive any captured friendly piece to an empty square'
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
      this.state.hands.w = [];
      this.state.hands.b = [];
      for (let i = 0; i < 3; i++) {
        this.drawCard('w', true);
        this.drawCard('b', true);
      }
    },

    drawCard: function (color, silent) {
      if (this.state.hands[color].length >= 5) {
        if (!silent) this.showToast(`${color === 'w' ? 'White' : 'Black'} hand is full (max 5 cards)!`);
        return null;
      }

      if (this.state.deck.length === 0) {
        if (this.state.discardPile.length > 0) {
          // Reshuffle discard pile into deck
          this.state.deck = this.shuffle(this.state.discardPile.slice());
          this.state.discardPile = [];
          this.logCard('system', 'Discard pile reshuffled into the deck.');
        } else {
          if (!silent) this.showToast('Deck and discard pile are empty!');
          return null;
        }
      }

      if (this.state.deck.length === 0) return null;

      let card = this.state.deck.pop();
      this.state.hands[color].push(card);
      if (!silent) {
        this.logCard(color, `drew a card (${card.title})`);
      }
      this.renderUI();
      return card;
    },

    // ----------------------------------------------------------
    // ENERGY ACTIONS
    // ----------------------------------------------------------
    addEnergy: function (color, amount) {
      let current = this.state.energy[color] || 0;
      this.state.energy[color] = Math.min(20, Math.max(0, current + amount));
      this.renderUI();
    },

    spendEnergy: function (action, color) {
      if (typeof main !== 'undefined' && main.variables.turn !== color) {
        this.showToast("Cannot spend energy on opponent's turn!");
        return false;
      }

      if (action === 'draw_card') {
        const cost = 6;
        if (this.state.energy[color] < cost) {
          this.showToast(`Requires ${cost} Energy (You have ${this.state.energy[color]})!`);
          return false;
        }
        if (this.state.hands[color].length >= 5) {
          this.showToast('Hand is already full (max 5 cards)!');
          return false;
        }
        this.state.energy[color] -= cost;
        let drawn = this.drawCard(color);
        if (drawn) {
          this.logCard(color, `spent ${cost} Energy → drew ${drawn.title}`);
        }
        return true;
      }

      if (action === 'recycle') {
        const cost = 3;
        if (this.state.energy[color] < cost) {
          this.showToast(`Requires ${cost} Energy (You have ${this.state.energy[color]})!`);
          return false;
        }
        if (this.state.hands[color].length === 0) {
          this.showToast('No cards in hand to recycle!');
          return false;
        }
        this.setPendingEffect({
          type: 'recycle',
          cost: cost,
          color: color
        });
        this.showPromptBanner('Select a card from your hand to recycle (+ draw 1 fresh card)', true);
        return true;
      }

      return false;
    },

    // ----------------------------------------------------------
    // CARD PLAYING & SELECTION DISPATCHER
    // ----------------------------------------------------------
    playCard: function (cardId, playerColor) {
      if (typeof main !== 'undefined' && (main.variables.gameOver || main.variables.isPromoting)) {
        return;
      }

      let currentTurn = (typeof main !== 'undefined') ? main.variables.turn : playerColor;
      if (currentTurn !== playerColor) {
        this.showToast("Cannot play cards on opponent's turn!");
        return;
      }

      if (this.state.cardPlayedThisTurn) {
        this.showToast('You have already played a card this turn!');
        return;
      }

      let hand = this.state.hands[playerColor];
      let cardIdx = hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return;
      let card = hand[cardIdx];

      // Dispatch by Card Type
      if (card.type === 'number') {
        this.executeNumberCard(card, playerColor, cardIdx);
      } else if (card.type === 'skip') {
        this.initiateSkipCard(card, playerColor, cardIdx);
      } else if (card.type === 'reverse') {
        this.initiateReverseCard(card, playerColor, cardIdx);
      } else if (card.type === 'drawTwo') {
        this.executeDrawTwoCard(card, playerColor, cardIdx);
      } else if (card.type === 'wild') {
        this.initiateWildCard(card, playerColor, cardIdx);
      } else if (card.type === 'wildDrawFour') {
        this.initiateWildDrawFour(card, playerColor, cardIdx);
      }
    },

    discardCardFromHand: function (color, cardIdx) {
      let card = this.state.hands[color].splice(cardIdx, 1)[0];
      if (card) {
        this.state.discardPile.push(card);
      }
      return card;
    },

    // ----------------------------------------------------------
    // CARD EFFECT 1: NUMBER CARD (ENERGY)
    // ----------------------------------------------------------
    executeNumberCard: function (card, color, cardIdx) {
      this.discardCardFromHand(color, cardIdx);
      let gained = card.value;
      let oldEnergy = this.state.energy[color];
      this.addEnergy(color, gained);
      let newEnergy = this.state.energy[color];
      this.state.cardPlayedThisTurn = true;

      this.logCard(color, `played [${card.label} ${card.color.toUpperCase()}] → +${gained} Energy (${oldEnergy} → ${newEnergy})`);
      this.renderUI();
    },

    // ----------------------------------------------------------
    // CARD EFFECT 2: SKIP CARD
    // ----------------------------------------------------------
    initiateSkipCard: function (card, color, cardIdx) {
      let oppColor = color === 'w' ? 'b' : 'w';

      // Check if opponent has any non-king pieces
      let board = (typeof main !== 'undefined') ? main.methods.getBoard() : {};
      let hasValidTargets = false;
      for (let cellId in board) {
        let pieceKey = board[cellId];
        if (!pieceKey) continue;
        if (main.methods.pieceColor(pieceKey) === oppColor && main.methods.pieceTypeOf(pieceKey) !== 'king') {
          hasValidTargets = true;
          break;
        }
      }

      if (!hasValidTargets) {
        this.showToast('No enemy non-king pieces to skip!');
        return;
      }

      this.setPendingEffect({
        type: 'skip',
        card: card,
        cardIdx: cardIdx,
        color: color
      });

      this.showPromptBanner('Click an enemy piece to Skip its next turn', true);
      this.highlightSkipCandidates(oppColor);
    },

    highlightSkipCandidates: function (oppColor) {
      $('.gamecell').removeClass('swap-candidate');
      let board = main.methods.getBoard();
      for (let cellId in board) {
        let key = board[cellId];
        if (!key) continue;
        if (main.methods.pieceColor(key) === oppColor && main.methods.pieceTypeOf(key) !== 'king') {
          $('#' + cellId).addClass('swap-candidate');
        }
      }
    },

    executeSkipOnPiece: function (cellId, pieceKey) {
      let effect = this.state.pendingEffect;
      if (!effect || effect.type !== 'skip') return;

      let oppColor = effect.color === 'w' ? 'b' : 'w';

      // Restriction: Cannot target king
      if (main.methods.pieceTypeOf(pieceKey) === 'king') {
        this.showToast('Cannot target the King with Skip!');
        return;
      }

      // Restriction: Cannot prevent legal responses to check
      if (main.methods.isInCheck(oppColor)) {
        let pieceMoves = main.methods.getLegalMoves(pieceKey);
        let allOppMoves = 0;
        for (let k in main.variables.pieces) {
          if (main.methods.pieceColor(k) === oppColor && !main.variables.pieces[k].captured) {
            allOppMoves += main.methods.getLegalMoves(k).length;
          }
        }
        if (allOppMoves > 0 && allOppMoves === pieceMoves.length) {
          this.showToast('Cannot skip this piece: it has the only legal moves to escape check!');
          return;
        }
      }

      this.discardCardFromHand(effect.color, effect.cardIdx);
      this.state.skippedPiece = {
        pieceKey: pieceKey,
        targetCell: cellId,
        forTurn: oppColor
      };
      this.state.cardPlayedThisTurn = true;

      let pieceName = main.variables.pieces[pieceKey] ? main.variables.pieces[pieceKey].type : pieceKey;
      this.logCard(effect.color, `played [SKIP] ⊘ on ${oppColor === 'w' ? 'White' : 'Black'} ${pieceName} at ${main.methods.toAlgebraic(cellId)}`);

      this.clearPendingEffect();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // CARD EFFECT 3: REVERSE CARD (SWAP POSITIONS)
    // ----------------------------------------------------------
    initiateReverseCard: function (card, color, cardIdx) {
      let board = main.methods.getBoard();
      let friendlyPieces = [];
      for (let cellId in board) {
        let key = board[cellId];
        if (!key) continue;
        if (main.methods.pieceColor(key) === color && main.methods.pieceTypeOf(key) !== 'king') {
          friendlyPieces.push({ cellId, key });
        }
      }

      if (friendlyPieces.length < 2) {
        this.showToast('Need at least 2 friendly non-king pieces to swap!');
        return;
      }

      this.setPendingEffect({
        type: 'reverse',
        step: 1,
        card: card,
        cardIdx: cardIdx,
        color: color,
        firstPiece: null
      });

      this.showPromptBanner('Select the first friendly piece to swap', true);
      this.highlightSwapCandidates(color, null);
    },

    highlightSwapCandidates: function (color, excludeCell) {
      $('.gamecell').removeClass('swap-candidate swap-selected');
      let board = main.methods.getBoard();
      for (let cellId in board) {
        let key = board[cellId];
        if (!key) continue;
        if (main.methods.pieceColor(key) === color && main.methods.pieceTypeOf(key) !== 'king') {
          if (cellId !== excludeCell) {
            $('#' + cellId).addClass('swap-candidate');
          } else {
            $('#' + cellId).addClass('swap-selected');
          }
        }
      }
    },

    handleReverseSelection: function (cellId, pieceKey) {
      let effect = this.state.pendingEffect;
      if (!effect || effect.type !== 'reverse') return;

      if (main.methods.pieceColor(pieceKey) !== effect.color) {
        this.showToast('Must select friendly pieces!');
        return;
      }
      if (main.methods.pieceTypeOf(pieceKey) === 'king') {
        this.showToast('The King cannot be swapped!');
        return;
      }

      if (effect.step === 1) {
        effect.firstPiece = { cellId, pieceKey };
        effect.step = 2;
        this.showPromptBanner('Select the second friendly piece to swap with', true);
        this.highlightSwapCandidates(effect.color, cellId);
      } else if (effect.step === 2) {
        if (cellId === effect.firstPiece.cellId) {
          this.showToast('Select a DIFFERENT friendly piece!');
          return;
        }

        let p1 = effect.firstPiece;
        let p2 = { cellId, pieceKey };

        // Test legality: Swapping must not leave own King in check
        let board = main.methods.getBoard();
        let simBoard = Object.assign({}, board);
        simBoard[p1.cellId] = p2.pieceKey;
        simBoard[p2.cellId] = p1.pieceKey;

        let kingCell = main.methods.findKingCell(effect.color, simBoard);
        let oppColor = effect.color === 'w' ? 'b' : 'w';
        if (kingCell && main.methods.isSquareAttacked(kingCell, oppColor, simBoard)) {
          this.showToast('Illegal swap: King would be in check!');
          return;
        }

        // Execute Swap
        this.discardCardFromHand(effect.color, effect.cardIdx);

        let p1Obj = main.variables.pieces[p1.pieceKey];
        let p2Obj = main.variables.pieces[p2.pieceKey];

        $('#' + p1.cellId).html(p2Obj.img).attr('chess', p2.pieceKey);
        $('#' + p2.cellId).html(p1Obj.img).attr('chess', p1.pieceKey);

        p1Obj.position = p2.cellId;
        p1Obj.moved = true;
        p2Obj.position = p1.cellId;
        p2Obj.moved = true;

        this.state.cardPlayedThisTurn = true;

        this.logCard(effect.color, `played [REVERSE] ⇄ swapped ${main.methods.toAlgebraic(p1.cellId)} and ${main.methods.toAlgebraic(p2.cellId)}`);

        this.clearPendingEffect();
        main.methods.updateVisualHighlights();
        this.renderUI();
      }
    },

    // ----------------------------------------------------------
    // CARD EFFECT 4: DRAW TWO (REVIVE PAWN)
    // ----------------------------------------------------------
    executeDrawTwoCard: function (card, color, cardIdx) {
      let grave = this.state.graveyard[color];
      let pawnIdx = grave.findIndex(p => p.type.endsWith('_pawn'));

      if (pawnIdx === -1) {
        this.showToast('No captured friendly pawns in the graveyard to revive!');
        return;
      }

      let capturedPawn = grave[pawnIdx];
      let board = main.methods.getBoard();

      // Determine starting file
      let pawnKey = capturedPawn.key; // e.g. w_pawn4
      let fileNum = 4;
      let match = pawnKey.match(/pawn(\d+)/);
      if (match) {
        fileNum = parseInt(match[1], 10);
      }

      let startRank = color === 'w' ? 2 : 7;
      let targetCell = null;

      // Find nearest empty square on that file
      let candidateRanks = color === 'w' ? [2, 3, 4, 5, 6] : [7, 6, 5, 4, 3];
      for (let r of candidateRanks) {
        let cId = main.methods.cellId(fileNum, r);
        if (!board[cId]) {
          targetCell = cId;
          break;
        }
      }

      // If entire file is blocked, find any empty square on starting rank
      if (!targetCell) {
        for (let col = 1; col <= 8; col++) {
          let cId = main.methods.cellId(col, startRank);
          if (!board[cId]) {
            targetCell = cId;
            break;
          }
        }
      }

      if (!targetCell) {
        this.showToast('No safe square available to revive pawn!');
        return;
      }

      // Restore pawn
      this.discardCardFromHand(color, cardIdx);
      grave.splice(pawnIdx, 1);

      let pieceObj = main.variables.pieces[capturedPawn.key];
      if (pieceObj) {
        pieceObj.captured = false;
        pieceObj.position = targetCell;
        pieceObj.moved = true;
        $('#' + targetCell).html(pieceObj.img).attr('chess', capturedPawn.key);
      }

      this.state.cardPlayedThisTurn = true;
      this.logCard(color, `played [DRAW TWO] +2 revived pawn at ${main.methods.toAlgebraic(targetCell)}`);

      main.methods.updateVisualHighlights();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // CARD EFFECT 5: WILD CARD (CHESS MOVE ACTION)
    // ----------------------------------------------------------
    initiateWildCard: function (card, color, cardIdx) {
      this.setPendingEffect({
        type: 'wild',
        card: card,
        cardIdx: cardIdx,
        color: color
      });

      this.showPromptBanner('Select any friendly piece to make your chess move', true);
    },

    onWildMoveMade: function () {
      let effect = this.state.pendingEffect;
      if (effect && effect.type === 'wild') {
        this.discardCardFromHand(effect.color, effect.cardIdx);
        this.state.cardPlayedThisTurn = true;
        this.logCard(effect.color, 'played [WILD] ★ executed chess move');
        this.clearPendingEffect();
      }
    },

    // ----------------------------------------------------------
    // CARD EFFECT 6: WILD DRAW FOUR (REVIVE ANY PIECE)
    // ----------------------------------------------------------
    initiateWildDrawFour: function (card, color, cardIdx) {
      let grave = this.state.graveyard[color];
      if (grave.length === 0) {
        this.showToast('No captured pieces in your graveyard to revive!');
        return;
      }

      this.setPendingEffect({
        type: 'wildDrawFour',
        step: 1,
        card: card,
        cardIdx: cardIdx,
        color: color,
        revivePiece: null
      });

      this.showGraveyardRevivalModal(color);
    },

    showGraveyardRevivalModal: function (color) {
      let grave = this.state.graveyard[color];
      let optionsHtml = '';

      grave.forEach((p, idx) => {
        optionsHtml += `
          <div class="promo-choice graveyard-revive-btn" data-idx="${idx}">
            ${p.img}
          </div>
        `;
      });

      $('#promotion-options').html(optionsHtml);
      $('#promotion-modal h3').text('Select a Captured Piece to Revive');
      $('#promotion-modal').css('display', 'flex');

      $('.graveyard-revive-btn').off('click').on('click', function () {
        let idx = parseInt($(this).data('idx'), 10);
        let selectedPiece = grave[idx];
        $('#promotion-modal').css('display', 'none');
        $('#promotion-modal h3').text('Choose Promotion Piece');

        UnoMode.handleGraveyardPieceChosen(selectedPiece, idx);
      });
    },

    handleGraveyardPieceChosen: function (pieceData, graveIdx) {
      let effect = this.state.pendingEffect;
      if (!effect || effect.type !== 'wildDrawFour') return;

      effect.revivePiece = pieceData;
      effect.graveIdx = graveIdx;
      effect.step = 2;

      this.showPromptBanner(`Click an empty square to place the revived ${pieceData.type}`, true);
      this.highlightEmptySquaresForPlacement(pieceData.type.endsWith('_pawn'));
    },

    highlightEmptySquaresForPlacement: function (isPawn) {
      $('.gamecell').removeClass('swap-candidate');
      let board = main.methods.getBoard();
      for (let cellId in board) {
        if (!board[cellId]) {
          if (isPawn) {
            let row = parseInt(cellId.split('_')[1], 10);
            if (row === 1 || row === 8) continue; // Pawns cannot be placed on back ranks
          }
          $('#' + cellId).addClass('swap-candidate');
        }
      }
    },

    executeWildDrawFourPlacement: function (cellId) {
      let effect = this.state.pendingEffect;
      if (!effect || effect.type !== 'wildDrawFour' || effect.step !== 2) return;

      let board = main.methods.getBoard();
      if (board[cellId]) {
        this.showToast('Must place on an EMPTY square!');
        return;
      }

      let isPawn = effect.revivePiece.type.endsWith('_pawn');
      let row = parseInt(cellId.split('_')[1], 10);
      if (isPawn && (row === 1 || row === 8)) {
        this.showToast('Pawns cannot be placed on rank 1 or 8!');
        return;
      }

      // Check King safety
      let simBoard = Object.assign({}, board);
      simBoard[cellId] = effect.revivePiece.key;
      let kingCell = main.methods.findKingCell(effect.color, simBoard);
      let oppColor = effect.color === 'w' ? 'b' : 'w';
      if (kingCell && main.methods.isSquareAttacked(kingCell, oppColor, simBoard)) {
        this.showToast('Illegal placement: King would be in check!');
        return;
      }

      // Execute revival
      this.discardCardFromHand(effect.color, effect.cardIdx);
      this.state.graveyard[effect.color].splice(effect.graveIdx, 1);

      let pieceObj = main.variables.pieces[effect.revivePiece.key];
      if (pieceObj) {
        pieceObj.captured = false;
        pieceObj.position = cellId;
        pieceObj.moved = true;
        $('#' + cellId).html(pieceObj.img).attr('chess', effect.revivePiece.key);
      }

      this.state.cardPlayedThisTurn = true;
      this.logCard(effect.color, `played [WILD DRAW FOUR] ★+4 revived ${effect.revivePiece.type} at ${main.methods.toAlgebraic(cellId)}`);

      this.clearPendingEffect();
      main.methods.updateVisualHighlights();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // RECYCLE ACTION (ENERGY SPEND)
    // ----------------------------------------------------------
    executeRecycleCard: function (cardId, color) {
      let effect = this.state.pendingEffect;
      if (!effect || effect.type !== 'recycle') return;

      let hand = this.state.hands[color];
      let cardIdx = hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) return;

      let recycled = this.discardCardFromHand(color, cardIdx);
      let drawn = this.drawCard(color);

      this.logCard(color, `spent 3 Energy → recycled [${recycled.title}] and drew [${drawn ? drawn.title : 'Card'}]`);
      this.clearPendingEffect();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // PENDING EFFECT & PROMPT BANNER CONTROLS
    // ----------------------------------------------------------
    setPendingEffect: function (eff) {
      this.state.pendingEffect = eff;
    },

    clearPendingEffect: function () {
      this.state.pendingEffect = null;
      $('.gamecell').removeClass('swap-candidate swap-selected');
      this.hidePromptBanner();
    },

    showPromptBanner: function (msg, showCancel) {
      if (typeof $ === 'undefined') return;
      $('#uno-prompt-text').text(msg);
      if (showCancel) {
        $('#uno-prompt-cancel').css('display', 'inline-block');
      } else {
        $('#uno-prompt-cancel').css('display', 'none');
      }
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
    // MOVE FILTERING HOOK (SKIP CARD INTEGRATION)
    // ----------------------------------------------------------
    filterLegalMoves: function (pieceKey, moves) {
      if (!this.state.active) return moves;

      let skip = this.state.skippedPiece;
      if (!skip) return moves;

      if (skip.pieceKey === pieceKey) {
        let color = main.methods.pieceColor(pieceKey);

        // FIDE Rule: Cannot prevent legal responses to check
        if (main.methods.isInCheck(color)) {
          // Check if other pieces have moves to escape check
          let otherHasMoves = false;
          for (let k in main.variables.pieces) {
            if (k === pieceKey) continue;
            let p = main.variables.pieces[k];
            if (p.captured || !p.position) continue;
            if (main.methods.pieceColor(k) === color) {
              if (main.methods.getLegalMoves(k).length > 0) {
                otherHasMoves = true;
                break;
              }
            }
          }
          if (!otherHasMoves) {
            // Must allow this piece to respond to check
            return moves;
          }
        }

        // Piece is frozen!
        return [];
      }

      return moves;
    },

    clearSkipHighlight: function () {
      $('.gamecell').removeClass('skipped-piece');
    },

    // ----------------------------------------------------------
    // GAME ENGINE HOOKS
    // ----------------------------------------------------------
    onTurnEnd: function (previousColor, nextColor) {
      if (!this.state.active) return;

      this.state.turnCount++;

      // Auto-draw every 3 completed turns
      if (this.state.turnCount % 3 === 0) {
        this.drawCard(previousColor, false);
      }

      // Expire skip effect
      if (this.state.skippedPiece && this.state.skippedPiece.forTurn === previousColor) {
        this.state.skippedPiece = null;
      }

      // Reset turn flags
      this.state.cardPlayedThisTurn = false;
      this.clearPendingEffect();

      this.renderUI();
    },

    onCapture: function (capturedKey, capturedPieceObj, capturingKey) {
      if (!this.state.active) return;

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
        energy: this.state.energy,
        graveyard: this.state.graveyard,
        skippedPiece: this.state.skippedPiece,
        cardPlayedThisTurn: this.state.cardPlayedThisTurn,
        turnCount: this.state.turnCount,
        cardLog: this.state.cardLog
      }));
    },

    restoreSnapshot: function (snap) {
      if (!snap) return;
      this.state.deck = snap.deck || [];
      this.state.discardPile = snap.discardPile || [];
      this.state.hands = snap.hands || { w: [], b: [] };
      this.state.energy = snap.energy || { w: 0, b: 0 };
      this.state.graveyard = snap.graveyard || { w: [], b: [] };
      this.state.skippedPiece = snap.skippedPiece || null;
      this.state.cardPlayedThisTurn = snap.cardPlayedThisTurn || false;
      this.state.turnCount = snap.turnCount || 0;
      this.state.cardLog = snap.cardLog || [];
      this.clearPendingEffect();
      this.renderUI();
    },

    // ----------------------------------------------------------
    // CARD ACTION LOG
    // ----------------------------------------------------------
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

    // ----------------------------------------------------------
    // UI RENDERING
    // ----------------------------------------------------------
    renderUI: function () {
      if (typeof $ === 'undefined' || !this.state.active) return;

      let currentTurn = (typeof main !== 'undefined') ? main.variables.turn : 'w';

      // 1. Deck & Discard Pile counts
      $('#deck-count-badge').text(this.state.deck.length);
      $('#discard-count-badge').text(this.state.discardPile.length);

      let topDiscard = this.state.discardPile[this.state.discardPile.length - 1];
      if (topDiscard) {
        let discardEl = this.renderSingleCardHtml(topDiscard, false, true);
        $('#discard-top-display').html(discardEl);
      } else {
        $('#discard-top-display').html('<div class="uno-card mini-card empty-card"><span class="card-center">🂠</span></div>');
      }

      // 2. Energy Meters
      let wEnergy = this.state.energy.w;
      let bEnergy = this.state.energy.b;
      $('#energy-white-val').text(`${wEnergy} / 20`);
      $('#energy-black-val').text(`${bEnergy} / 20`);
      $('#energy-white-fill').css('width', `${(wEnergy / 20) * 100}%`);
      $('#energy-black-fill').css('width', `${(bEnergy / 20) * 100}%`);

      // Energy Buttons disabled states
      $('#energy-draw-btn').prop('disabled', currentTurn ? this.state.energy[currentTurn] < 6 : true);
      $('#energy-recycle-btn').prop('disabled', currentTurn ? this.state.energy[currentTurn] < 3 : true);

      // 3. Hands (Active player face-up, inactive face-down)
      let wFaceDown = currentTurn !== 'w';
      let bFaceDown = currentTurn !== 'b';

      this.renderHand('w', '#hand-white-cards', wFaceDown);
      this.renderHand('b', '#hand-black-cards', bFaceDown);

      // 4. Graveyard Trays
      this.renderGraveyard();

      // 5. Skipped piece badge on chessboard
      this.clearSkipHighlight();
      if (this.state.skippedPiece && this.state.skippedPiece.targetCell) {
        $('#' + this.state.skippedPiece.targetCell).addClass('skipped-piece');
      }

      // 6. Card Log
      this.renderCardLog();
    },

    renderHand: function (color, containerSelector, isFaceDown) {
      let hand = this.state.hands[color];
      let html = '';

      if (hand.length === 0) {
        html = '<div class="empty-hand-msg">No cards in hand</div>';
      } else {
        hand.forEach(card => {
          html += this.renderSingleCardHtml(card, isFaceDown, false, color);
        });
      }

      $(containerSelector).html(html);
    },

    renderSingleCardHtml: function (card, isFaceDown, isMini, playerColor) {
      let miniCls = isMini ? ' mini-card' : '';
      if (isFaceDown) {
        return `
          <div class="uno-card face-down${miniCls}">
            <div class="card-back-pattern">♟</div>
          </div>
        `;
      }

      let colorCls = ' card-' + card.color;
      let disabledCls = this.state.cardPlayedThisTurn ? ' disabled' : '';

      return `
        <div class="uno-card${colorCls}${miniCls}${disabledCls}" data-id="${card.id}" data-color="${playerColor || ''}" title="${card.title}: ${card.desc}">
          <div class="card-corner top-corner">${card.label}</div>
          <div class="card-center">${card.label}</div>
          <div class="card-type-label">${card.type === 'number' ? 'ENERGY' : card.title}</div>
          <div class="card-corner bottom-corner">${card.label}</div>
        </div>
      `;
    },

    renderGraveyard: function () {
      let wGrave = this.state.graveyard.w;
      let bGrave = this.state.graveyard.b;

      let wHtml = wGrave.length === 0 ? '<span class="empty-grave">—</span>' :
        wGrave.map(p => `<span class="graveyard-piece-chip" title="White ${p.type}">${p.img}</span>`).join('');

      let bHtml = bGrave.length === 0 ? '<span class="empty-grave">—</span>' :
        bGrave.map(p => `<span class="graveyard-piece-chip" title="Black ${p.type}">${p.img}</span>`).join('');

      $('#graveyard-white-pieces').html(wHtml);
      $('#graveyard-black-pieces').html(bHtml);
    },

    renderCardLog: function () {
      if (typeof $ === 'undefined') return;
      let html = '';
      this.state.cardLog.slice(0, 20).forEach(entry => {
        let tag = entry.color === 'system' ? '⚙️' : (entry.color === 'w' ? '♙ White' : '♟ Black');
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

    // ----------------------------------------------------------
    // EVENT BINDINGS
    // ----------------------------------------------------------
    bindEvents: function () {
      if (typeof $ === 'undefined') return;

      // Card click in hand
      $(document).on('click', '.uno-card:not(.face-down)', function () {
        let cardId = $(this).data('id');
        let color = $(this).data('color');
        if (!cardId || !color) return;

        if (UnoMode.state.pendingEffect && UnoMode.state.pendingEffect.type === 'recycle') {
          UnoMode.executeRecycleCard(cardId, color);
          return;
        }

        UnoMode.playCard(cardId, color);
      });

      // Energy Spend Buttons
      $(document).on('click', '#energy-draw-btn', function () {
        let currentTurn = main.variables.turn;
        UnoMode.spendEnergy('draw_card', currentTurn);
      });

      $(document).on('click', '#energy-recycle-btn', function () {
        let currentTurn = main.variables.turn;
        UnoMode.spendEnergy('recycle', currentTurn);
      });

      // Cancel Pending Action Banner
      $(document).on('click', '#uno-prompt-cancel', function () {
        UnoMode.clearPendingEffect();
      });

      // Board clicks for Special Card targeting
      $(document).on('click', '.gamecell', function (e) {
        let eff = UnoMode.state.pendingEffect;
        if (!eff) return;

        let cellId = $(this).attr('id');
        let chessPiece = $(this).attr('chess');

        if (eff.type === 'skip') {
          if (chessPiece && chessPiece !== 'null') {
            UnoMode.executeSkipOnPiece(cellId, chessPiece);
          }
          return;
        }

        if (eff.type === 'reverse') {
          if (chessPiece && chessPiece !== 'null') {
            UnoMode.handleReverseSelection(cellId, chessPiece);
          }
          return;
        }

        if (eff.type === 'wildDrawFour' && eff.step === 2) {
          UnoMode.executeWildDrawFourPlacement(cellId);
          return;
        }
      });
    }
  };

  return UnoMode;
});

let main = {
  variables: {
    turn: 'w',
    selectedpiece: '',
    highlighted: [],
    gameOver: false,
    isPromoting: false,
    enPassantTarget: null, // { cell: 'col_row', pawnCell: 'col_row', col: number, color: 'w'|'b' }
    pieces: {}
  },

  methods: {
    getInitialPieces: function () {
      return {
        w_king:    { position: '5_1', img: '&#9812;', type: 'w_king',   moved: false, captured: false },
        w_queen:   { position: '4_1', img: '&#9813;', type: 'w_queen',  moved: false, captured: false },
        w_rook1:   { position: '1_1', img: '&#9814;', type: 'w_rook',   moved: false, captured: false },
        w_rook2:   { position: '8_1', img: '&#9814;', type: 'w_rook',   moved: false, captured: false },
        w_bishop1: { position: '3_1', img: '&#9815;', type: 'w_bishop', moved: false, captured: false },
        w_bishop2: { position: '6_1', img: '&#9815;', type: 'w_bishop', moved: false, captured: false },
        w_knight1: { position: '2_1', img: '&#9816;', type: 'w_knight', moved: false, captured: false },
        w_knight2: { position: '7_1', img: '&#9816;', type: 'w_knight', moved: false, captured: false },
        w_pawn1:   { position: '1_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn2:   { position: '2_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn3:   { position: '3_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn4:   { position: '4_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn5:   { position: '5_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn6:   { position: '6_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn7:   { position: '7_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },
        w_pawn8:   { position: '8_2', img: '&#9817;', type: 'w_pawn',   moved: false, captured: false },

        b_king:    { position: '5_8', img: '&#9818;', type: 'b_king',   moved: false, captured: false },
        b_queen:   { position: '4_8', img: '&#9819;', type: 'b_queen',  moved: false, captured: false },
        b_rook1:   { position: '1_8', img: '&#9820;', type: 'b_rook',   moved: false, captured: false },
        b_rook2:   { position: '8_8', img: '&#9820;', type: 'b_rook',   moved: false, captured: false },
        b_bishop1: { position: '3_8', img: '&#9821;', type: 'b_bishop', moved: false, captured: false },
        b_bishop2: { position: '6_8', img: '&#9821;', type: 'b_bishop', moved: false, captured: false },
        b_knight1: { position: '2_8', img: '&#9822;', type: 'b_knight', moved: false, captured: false },
        b_knight2: { position: '7_8', img: '&#9822;', type: 'b_knight', moved: false, captured: false },
        b_pawn1:   { position: '1_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn2:   { position: '2_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn3:   { position: '3_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn4:   { position: '4_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn5:   { position: '5_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn6:   { position: '6_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn7:   { position: '7_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false },
        b_pawn8:   { position: '8_7', img: '&#9823;', type: 'b_pawn',   moved: false, captured: false }
      };
    },

    gamesetup: function () {
      $('.gamecell').attr('chess', 'null').html('&nbsp;');
      for (let gamepiece in main.variables.pieces) {
        let p = main.variables.pieces[gamepiece];
        if (!p.captured && p.position) {
          $('#' + p.position).html(p.img);
          $('#' + p.position).attr('chess', gamepiece);
        }
      }
    },

    // ---------- helper functions ----------
    pieceColor: function (key) {
      return key ? key.charAt(0) : null;
    },

    pieceTypeOf: function (key) {
      if (!key || !main.variables.pieces[key]) return null;
      return main.variables.pieces[key].type.split('_')[1];
    },

    inBounds: function (col, row) {
      return col >= 1 && col <= 8 && row >= 1 && row <= 8;
    },

    cellId: function (col, row) {
      return col + '_' + row;
    },

    parseCell: function (id) {
      let p = id.split('_');
      return { col: parseInt(p[0], 10), row: parseInt(p[1], 10) };
    },

    getBoard: function () {
      let board = {};
      $('.gamecell').each(function () {
        let id = $(this).attr('id');
        let chess = $(this).attr('chess');
        board[id] = (chess && chess !== 'null') ? chess : null;
      });
      return board;
    },

    findKingCell: function (color, board) {
      let wanted = color + '_king';
      for (let id in board) {
        if (board[id] === wanted) return id;
      }
      return null;
    },

    // Attack squares for a piece sitting at fromCellId on the specified board
    getAttackSquaresFrom: function (pieceKey, fromCellId, board) {
      let color = main.methods.pieceColor(pieceKey);
      let type = main.methods.pieceTypeOf(pieceKey);
      let { col, row } = main.methods.parseCell(fromCellId);
      let attacks = [];

      if (type === 'pawn') {
        let dir = color === 'w' ? 1 : -1;
        [[col - 1, row + dir], [col + 1, row + dir]].forEach(([c, r]) => {
          if (main.methods.inBounds(c, r)) attacks.push(main.methods.cellId(c, r));
        });
      } else if (type === 'knight') {
        let deltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
        deltas.forEach(([dc, dr]) => {
          let c = col + dc, r = row + dr;
          if (main.methods.inBounds(c, r)) attacks.push(main.methods.cellId(c, r));
        });
      } else if (type === 'king') {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            let c = col + dc, r = row + dr;
            if (main.methods.inBounds(c, r)) attacks.push(main.methods.cellId(c, r));
          }
        }
      } else {
        let dirs = [];
        if (type === 'bishop' || type === 'queen') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        if (type === 'rook' || type === 'queen') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        dirs.forEach(([dc, dr]) => {
          let c = col + dc, r = row + dr;
          while (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            attacks.push(id);
            if (board[id]) break; // ray blocked by piece
            c += dc; r += dr;
          }
        });
      }
      return attacks;
    },

    isSquareAttacked: function (targetCellId, byColor, board) {
      for (let cellId in board) {
        let key = board[cellId];
        if (!key) continue;
        if (main.methods.pieceColor(key) !== byColor) continue;
        let attacks = main.methods.getAttackSquaresFrom(key, cellId, board);
        if (attacks.indexOf(targetCellId) !== -1) return true;
      }
      return false;
    },

    // Pseudo-legal moves for a piece on the board
    getPseudoMoves: function (pieceKey, board) {
      let obj = main.variables.pieces[pieceKey];
      if (!obj || obj.captured || !obj.position) return [];

      let color = main.methods.pieceColor(pieceKey);
      let type = main.methods.pieceTypeOf(pieceKey);
      let { col, row } = main.methods.parseCell(obj.position);
      let moves = [];

      if (type === 'pawn') {
        let dir = color === 'w' ? 1 : -1;
        let startRow = color === 'w' ? 2 : 7;

        // Forward 1 square
        let oneStep = main.methods.cellId(col, row + dir);
        if (main.methods.inBounds(col, row + dir) && !board[oneStep]) {
          moves.push(oneStep);
          // Forward 2 squares from initial rank
          let twoStep = main.methods.cellId(col, row + 2 * dir);
          if (row === startRow && !board[twoStep]) {
            moves.push(twoStep);
          }
        }

        // Standard diagonal captures
        [[col - 1, row + dir], [col + 1, row + dir]].forEach(([c, r]) => {
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (board[id] && main.methods.pieceColor(board[id]) !== color) {
              moves.push(id);
            }
          }
        });

        // En passant capture
        if (main.variables.enPassantTarget && main.variables.enPassantTarget.color !== color) {
          let ep = main.variables.enPassantTarget;
          let epRow = color === 'w' ? 5 : 4;
          if (row === epRow && (col - 1 === ep.col || col + 1 === ep.col)) {
            let epDest = main.methods.cellId(ep.col, row + dir);
            if (epDest === ep.cell) {
              moves.push(epDest + '_ep');
            }
          }
        }
      } else if (type === 'knight') {
        let deltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
        deltas.forEach(([dc, dr]) => {
          let c = col + dc, r = row + dr;
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (!board[id] || main.methods.pieceColor(board[id]) !== color) {
              moves.push(id);
            }
          }
        });
      } else if (type === 'king') {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            let c = col + dc, r = row + dr;
            if (main.methods.inBounds(c, r)) {
              let id = main.methods.cellId(c, r);
              if (!board[id] || main.methods.pieceColor(board[id]) !== color) {
                moves.push(id);
              }
            }
          }
        }

        // Castling
        if (!obj.moved && !obj.captured) {
          let oppColor = color === 'w' ? 'b' : 'w';
          let rank = color === 'w' ? 1 : 8;
          let kingStart = main.methods.cellId(5, rank);

          if (board[kingStart] === pieceKey && !main.methods.isSquareAttacked(kingStart, oppColor, board)) {
            // Kingside Castle
            let rookKSKey = color + '_rook2';
            let rookKS = main.variables.pieces[rookKSKey];
            if (rookKS && !rookKS.moved && !rookKS.captured && board[main.methods.cellId(8, rank)] === rookKSKey) {
              let f = main.methods.cellId(6, rank);
              let g = main.methods.cellId(7, rank);
              if (!board[f] && !board[g] &&
                  !main.methods.isSquareAttacked(f, oppColor, board) &&
                  !main.methods.isSquareAttacked(g, oppColor, board)) {
                moves.push(g + '_castleKS');
              }
            }

            // Queenside Castle
            let rookQSKey = color + '_rook1';
            let rookQS = main.variables.pieces[rookQSKey];
            if (rookQS && !rookQS.moved && !rookQS.captured && board[main.methods.cellId(1, rank)] === rookQSKey) {
              let d = main.methods.cellId(4, rank);
              let c = main.methods.cellId(3, rank);
              let b = main.methods.cellId(2, rank);
              if (!board[d] && !board[c] && !board[b] &&
                  !main.methods.isSquareAttacked(d, oppColor, board) &&
                  !main.methods.isSquareAttacked(c, oppColor, board)) {
                moves.push(c + '_castleQS');
              }
            }
          }
        }
      } else {
        let dirs = [];
        if (type === 'bishop' || type === 'queen') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        if (type === 'rook' || type === 'queen') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        dirs.forEach(([dc, dr]) => {
          let c = col + dc, r = row + dr;
          while (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (!board[id]) {
              moves.push(id);
            } else {
              if (main.methods.pieceColor(board[id]) !== color) moves.push(id);
              break;
            }
            c += dc; r += dr;
          }
        });
      }
      return moves;
    },

    simulateMove: function (board, pieceKey, moveToken) {
      let newBoard = Object.assign({}, board);
      let obj = main.variables.pieces[pieceKey];
      let targetId = moveToken;

      if (moveToken.indexOf('_castle') !== -1) {
        targetId = moveToken.split('_castle')[0];
        let color = main.methods.pieceColor(pieceKey);
        let rank = color === 'w' ? 1 : 8;
        if (moveToken.indexOf('_castleKS') !== -1) {
          newBoard[main.methods.cellId(8, rank)] = null;
          newBoard[main.methods.cellId(6, rank)] = color + '_rook2';
        } else if (moveToken.indexOf('_castleQS') !== -1) {
          newBoard[main.methods.cellId(1, rank)] = null;
          newBoard[main.methods.cellId(4, rank)] = color + '_rook1';
        }
      } else if (moveToken.indexOf('_ep') !== -1) {
        targetId = moveToken.split('_ep')[0];
        if (main.variables.enPassantTarget) {
          newBoard[main.variables.enPassantTarget.pawnCell] = null;
        }
      }

      newBoard[obj.position] = null;
      newBoard[targetId] = pieceKey;
      return newBoard;
    },

    getLegalMoves: function (pieceKey) {
      let board = main.methods.getBoard();
      let color = main.methods.pieceColor(pieceKey);
      let pseudo = main.methods.getPseudoMoves(pieceKey, board);
      let legal = [];

      pseudo.forEach(moveToken => {
        let simulated = main.methods.simulateMove(board, pieceKey, moveToken);
        let kingCell = main.methods.findKingCell(color, simulated);
        let oppColor = color === 'w' ? 'b' : 'w';
        if (kingCell && !main.methods.isSquareAttacked(kingCell, oppColor, simulated)) {
          legal.push(moveToken);
        }
      });
      return legal;
    },

    isInCheck: function (color) {
      let board = main.methods.getBoard();
      let kingCell = main.methods.findKingCell(color, board);
      if (!kingCell) return false;
      let oppColor = color === 'w' ? 'b' : 'w';
      return main.methods.isSquareAttacked(kingCell, oppColor, board);
    },

    hasAnyLegalMoves: function (color) {
      for (let key in main.variables.pieces) {
        let p = main.variables.pieces[key];
        if (p.captured) continue;
        if (main.methods.pieceColor(key) !== color) continue;
        if (main.methods.getLegalMoves(key).length > 0) return true;
      }
      return false;
    },

    performCastle: function (kingKey, side) {
      let color = main.methods.pieceColor(kingKey);
      let rank = color === 'w' ? 1 : 8;
      let rookKey = side === 'KS' ? color + '_rook2' : color + '_rook1';
      let kingTarget = side === 'KS' ? main.methods.cellId(7, rank) : main.methods.cellId(3, rank);
      let rookTarget = side === 'KS' ? main.methods.cellId(6, rank) : main.methods.cellId(4, rank);
      let kingObj = main.variables.pieces[kingKey];
      let rookObj = main.variables.pieces[rookKey];

      $('#' + kingObj.position).html('&nbsp;').attr('chess', 'null');
      $('#' + rookObj.position).html('&nbsp;').attr('chess', 'null');

      $('#' + kingTarget).html(kingObj.img).attr('chess', kingKey);
      $('#' + rookTarget).html(rookObj.img).attr('chess', rookKey);

      kingObj.position = kingTarget;
      kingObj.moved = true;
      rookObj.position = rookTarget;
      rookObj.moved = true;
    },

    performEnPassant: function (selectedKey, targetCellId) {
      let pieceObj = main.variables.pieces[selectedKey];
      let ep = main.variables.enPassantTarget;
      if (!ep) return;

      let capturedPawnCell = ep.pawnCell;
      let capturedPieceName = $('#' + capturedPawnCell).attr('chess');
      let capturedPieceObj = main.variables.pieces[capturedPieceName];

      // Remove captured enemy pawn from board
      $('#' + capturedPawnCell).html('&nbsp;').attr('chess', 'null');
      if (capturedPieceObj) {
        capturedPieceObj.captured = true;
        capturedPieceObj.moved = true;
        capturedPieceObj.position = '';
        if (capturedPieceName.startsWith('b_')) {
          $('#captured-black .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        } else if (capturedPieceName.startsWith('w_')) {
          $('#captured-white .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        }
      }

      // Move attacking pawn
      $('#' + targetCellId).html(pieceObj.img).attr('chess', selectedKey);
      $('#' + pieceObj.position).html('&nbsp;').attr('chess', 'null');

      pieceObj.position = targetCellId;
      pieceObj.moved = true;

      main.methods.endturn(null);
    },

    selectPiece: function (cellId) {
      let key = $('#' + cellId).attr('chess');
      if (!key || key === 'null') return;

      main.variables.selectedpiece = cellId;
      main.methods.updateVisualHighlights();
    },

    clearSelection: function () {
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.methods.updateVisualHighlights();
    },

    updateVisualHighlights: function () {
      $('.gamecell').removeClass('green yellow');

      if (main.variables.selectedpiece) {
        $('#' + main.variables.selectedpiece).addClass('yellow');
        let key = $('#' + main.variables.selectedpiece).attr('chess');
        let legal = main.methods.getLegalMoves(key);
        main.variables.highlighted = legal;
        legal.forEach(m => {
          let target = m.indexOf('_') !== -1 ? m.split('_').slice(0, 2).join('_') : m;
          $('#' + target).addClass('green');
        });
      }

      // Highlight king in check if applicable
      $('.gamecell').removeClass('red');
      let color = main.variables.turn;
      if (main.methods.isInCheck(color)) {
        let kingCell = main.methods.findKingCell(color, main.methods.getBoard());
        if (kingCell) $('#' + kingCell).addClass('red');
      }
    },

    flashInvalid: function (cellId) {
      $('#' + cellId).addClass('red');
      setTimeout(() => {
        let color = main.variables.turn;
        let kingCell = main.methods.findKingCell(color, main.methods.getBoard());
        if (!main.methods.isInCheck(color) || cellId !== kingCell) {
          $('#' + cellId).removeClass('red');
        }
      }, 300);
    },

    // ---------- move execution ----------
    move: function (target) {
      let selectedpiece = $('#' + main.variables.selectedpiece).attr('chess');
      let pieceObj = main.variables.pieces[selectedpiece];
      let fromCell = main.variables.selectedpiece;
      let fromPos = main.methods.parseCell(fromCell);
      let toPos = main.methods.parseCell(target.id);
      let targetRank = target.id.split('_')[1];

      // Track en passant eligibility
      let nextEnPassant = null;
      if (pieceObj.type.endsWith('_pawn') && Math.abs(toPos.row - fromPos.row) === 2) {
        let epRow = pieceObj.type.startsWith('w_') ? 3 : 6;
        nextEnPassant = {
          cell: main.methods.cellId(fromPos.col, epRow),
          pawnCell: target.id,
          col: fromPos.col,
          color: main.methods.pieceColor(selectedpiece)
        };
      }

      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedpiece);

      $('#' + main.variables.selectedpiece).html('&nbsp;');
      $('#' + main.variables.selectedpiece).attr('chess', 'null');

      pieceObj.position = target.id;
      pieceObj.moved = true;

      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') ||
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function () {
          main.methods.endturn(nextEnPassant);
        });
      } else {
        main.methods.endturn(nextEnPassant);
      }
    },

    capture: function (target) {
      let selectedKey = $('#' + main.variables.selectedpiece).attr('chess');
      let capturedPieceName = target.name;
      let capturedPieceObj = main.variables.pieces[capturedPieceName];
      let pieceObj = main.variables.pieces[selectedKey];
      let fromCell = main.variables.selectedpiece;
      let targetRank = target.id.split('_')[1];

      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedKey);

      $('#' + fromCell).html('&nbsp;');
      $('#' + fromCell).attr('chess', 'null');

      pieceObj.position = target.id;
      pieceObj.moved = true;

      if (capturedPieceObj) {
        capturedPieceObj.captured = true;
        capturedPieceObj.moved = true;
        capturedPieceObj.position = '';

        if (capturedPieceName.startsWith('b_')) {
          $('#captured-black .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        } else if (capturedPieceName.startsWith('w_')) {
          $('#captured-white .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        }
      }

      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') ||
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function () {
          main.methods.endturn(null);
        });
      } else {
        main.methods.endturn(null);
      }
    },

    handlePromotion: function (pieceObj, targetCell, callback) {
      main.variables.isPromoting = true;
      let isWhite = pieceObj.type.startsWith('w_');
      let optionsHtml = '';

      if (isWhite) {
        optionsHtml = `
          <div class="promo-choice" data-type="w_queen">&#9813;</div>
          <div class="promo-choice" data-type="w_rook">&#9814;</div>
          <div class="promo-choice" data-type="w_bishop">&#9815;</div>
          <div class="promo-choice" data-type="w_knight">&#9816;</div>
        `;
      } else {
        optionsHtml = `
          <div class="promo-choice" data-type="b_queen">&#9819;</div>
          <div class="promo-choice" data-type="b_rook">&#9820;</div>
          <div class="promo-choice" data-type="b_bishop">&#9821;</div>
          <div class="promo-choice" data-type="b_knight">&#9822;</div>
        `;
      }

      $('#promotion-options').html(optionsHtml);
      $('#promotion-modal').css('display', 'flex');

      $('.promo-choice').off('click').on('click', function () {
        let chosenType = $(this).data('type');
        let chosenImg = $(this).html();

        pieceObj.type = chosenType;
        pieceObj.img = chosenImg;

        $('#' + targetCell).html(chosenImg);
        $('#promotion-modal').css('display', 'none');
        main.variables.isPromoting = false;
        if (callback) callback();
      });
    },

    endturn: function (nextEnPassant) {
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.variables.enPassantTarget = nextEnPassant || null;

      main.variables.turn = main.variables.turn === 'w' ? 'b' : 'w';
      let color = main.variables.turn;

      let inCheck = main.methods.isInCheck(color);
      let hasMoves = main.methods.hasAnyLegalMoves(color);

      main.methods.updateVisualHighlights();

      if (inCheck && !hasMoves) {
        main.variables.gameOver = true;
        let winner = color === 'w' ? 'Black' : 'White';
        $('#turn').addClass('turnhighlight').text('Checkmate! ' + winner + ' wins!');
      } else if (!inCheck && !hasMoves) {
        main.variables.gameOver = true;
        $('#turn').addClass('turnhighlight').text("Stalemate! It's a draw.");
      } else if (inCheck) {
        $('#turn').removeClass('turnhighlight').text((color === 'w' ? "White" : "Black") + "'s turn \u2014 Check!");
      } else {
        $('#turn').removeClass('turnhighlight').text(color === 'w' ? "It's White's Turn!" : "It's Black's Turn!");
      }
    },

    resetGame: function () {
      main.variables.turn = 'w';
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.variables.gameOver = false;
      main.variables.isPromoting = false;
      main.variables.enPassantTarget = null;
      main.variables.pieces = main.methods.getInitialPieces();

      $('#captured-black .captured-pieces-list').empty();
      $('#captured-white .captured-pieces-list').empty();
      $('#promotion-modal').css('display', 'none');
      $('.gamecell').removeClass('green yellow red');
      $('#turn').removeClass('turnhighlight').text("It's White's Turn!");

      main.methods.gamesetup();
    }
  }
};

// Initialize pieces at startup
main.variables.pieces = main.methods.getInitialPieces();

$(document).ready(function () {
  main.methods.gamesetup();

  $(document).on('click', '.gamecell', function () {
    if (main.variables.gameOver || main.variables.isPromoting) return;

    let cellId = $(this).attr('id');
    let chessPiece = $(this).attr('chess');

    if (main.variables.selectedpiece === '') {
      if (chessPiece && chessPiece !== 'null' && main.methods.pieceColor(chessPiece) === main.variables.turn) {
        main.methods.selectPiece(cellId);
      }
    } else {
      if (main.variables.selectedpiece === cellId) {
        main.methods.clearSelection();
      } else if (chessPiece && chessPiece !== 'null' && main.methods.pieceColor(chessPiece) === main.variables.turn) {
        // Switch selection to another piece of the current player's color
        main.methods.clearSelection();
        main.methods.selectPiece(cellId);
      } else {
        let match = main.variables.highlighted.find(h => {
          let baseTarget = h.indexOf('_') !== -1 ? h.split('_').slice(0, 2).join('_') : h;
          return baseTarget === cellId;
        });

        if (match) {
          let selectedKey = $('#' + main.variables.selectedpiece).attr('chess');
          if (match.indexOf('_castleKS') !== -1) {
            main.methods.performCastle(selectedKey, 'KS');
            main.methods.endturn(null);
          } else if (match.indexOf('_castleQS') !== -1) {
            main.methods.performCastle(selectedKey, 'QS');
            main.methods.endturn(null);
          } else if (match.indexOf('_ep') !== -1) {
            main.methods.performEnPassant(selectedKey, cellId);
          } else if (!chessPiece || chessPiece === 'null') {
            main.methods.move({ id: cellId });
          } else {
            main.methods.capture({ id: cellId, name: chessPiece });
          }
        } else {
          main.methods.flashInvalid(cellId);
        }
      }
    }
  });

  $('#reset-btn').click(function () {
    main.methods.resetGame();
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = main;
}

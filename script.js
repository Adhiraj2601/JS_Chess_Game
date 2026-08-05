let main = {
  variables: {
    turn: 'w',
    selectedpiece: '',
    highlighted: [],
    gameOver: false,
    // NOTE: positions use "col_row" where col is a NUMBER 1-8 (matching the
    // board's actual cell ids, e.g. id="5_1"). The original file used chess
    // letters here ("e_1") which never matched any element on the board,
    // so no pieces were ever placed.
    pieces: {
      w_king:    { position: '5_1', img: '&#9812;', type: 'w_king',   moved: false },
      w_queen:   { position: '4_1', img: '&#9813;', type: 'w_queen',  moved: false },
      w_rook1:   { position: '1_1', img: '&#9814;', type: 'w_rook',   moved: false },
      w_rook2:   { position: '8_1', img: '&#9814;', type: 'w_rook',   moved: false },
      w_bishop1: { position: '3_1', img: '&#9815;', type: 'w_bishop', moved: false },
      w_bishop2: { position: '6_1', img: '&#9815;', type: 'w_bishop', moved: false },
      w_knight1: { position: '2_1', img: '&#9816;', type: 'w_knight', moved: false },
      w_knight2: { position: '7_1', img: '&#9816;', type: 'w_knight', moved: false },
      w_pawn1:   { position: '1_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn2:   { position: '2_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn3:   { position: '3_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn4:   { position: '4_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn5:   { position: '5_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn6:   { position: '6_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn7:   { position: '7_2', img: '&#9817;', type: 'w_pawn',   moved: false },
      w_pawn8:   { position: '8_2', img: '&#9817;', type: 'w_pawn',   moved: false },

      b_king:    { position: '5_8', img: '&#9818;', type: 'b_king',   moved: false },
      b_queen:   { position: '4_8', img: '&#9819;', type: 'b_queen',  moved: false },
      b_rook1:   { position: '1_8', img: '&#9820;', type: 'b_rook',   moved: false },
      b_rook2:   { position: '8_8', img: '&#9820;', type: 'b_rook',   moved: false },
      b_bishop1: { position: '3_8', img: '&#9821;', type: 'b_bishop', moved: false },
      b_bishop2: { position: '6_8', img: '&#9821;', type: 'b_bishop', moved: false },
      b_knight1: { position: '2_8', img: '&#9822;', type: 'b_knight', moved: false },
      b_knight2: { position: '7_8', img: '&#9822;', type: 'b_knight', moved: false },
      b_pawn1:   { position: '1_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn2:   { position: '2_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn3:   { position: '3_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn4:   { position: '4_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn5:   { position: '5_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn6:   { position: '6_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn7:   { position: '7_7', img: '&#9823;', type: 'b_pawn',   moved: false },
      b_pawn8:   { position: '8_7', img: '&#9823;', type: 'b_pawn',   moved: false }
    }
  },

  methods: {
    gamesetup: function () {
      $('.gamecell').attr('chess', 'null').html('&nbsp;');
      for (let gamepiece in main.variables.pieces) {
        $('#' + main.variables.pieces[gamepiece].position).html(main.variables.pieces[gamepiece].img);
        $('#' + main.variables.pieces[gamepiece].position).attr('chess', gamepiece);
      }
    },

    // ---------- small helpers ----------
    pieceColor: function (key) { return key.charAt(0); },
    pieceTypeOf: function (key) { return main.variables.pieces[key].type.split('_')[1]; },
    inBounds: function (col, row) { return col >= 1 && col <= 8 && row >= 1 && row <= 8; },
    cellId: function (col, row) { return col + '_' + row; },
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

    // Attack squares for a piece sitting at fromCellId, purely board-driven
    // (used for check detection, including on simulated boards).
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
            if (board[id]) break; // blocked - this is the last square attacked in this direction
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

    // Pseudo-legal moves for a piece on the REAL (current) board, ignoring
    // whether the move would leave the mover's own king in check.
    getPseudoMoves: function (pieceKey, board) {
      let obj = main.variables.pieces[pieceKey];
      let color = main.methods.pieceColor(pieceKey);
      let type = main.methods.pieceTypeOf(pieceKey);
      let { col, row } = main.methods.parseCell(obj.position);
      let moves = [];

      if (type === 'pawn') {
        let dir = color === 'w' ? 1 : -1;
        let startRow = color === 'w' ? 2 : 7;

        let oneStep = main.methods.cellId(col, row + dir);
        if (main.methods.inBounds(col, row + dir) && !board[oneStep]) {
          moves.push(oneStep);
          let twoStep = main.methods.cellId(col, row + 2 * dir);
          if (row === startRow && !board[twoStep]) moves.push(twoStep);
        }
        [[col - 1, row + dir], [col + 1, row + dir]].forEach(([c, r]) => {
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (board[id] && main.methods.pieceColor(board[id]) !== color) moves.push(id);
          }
        });
        // NOTE: en passant is not implemented.
      } else if (type === 'knight') {
        let deltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
        deltas.forEach(([dc, dr]) => {
          let c = col + dc, r = row + dr;
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (!board[id] || main.methods.pieceColor(board[id]) !== color) moves.push(id);
          }
        });
      } else if (type === 'king') {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            let c = col + dc, r = row + dr;
            if (main.methods.inBounds(c, r)) {
              let id = main.methods.cellId(c, r);
              if (!board[id] || main.methods.pieceColor(board[id]) !== color) moves.push(id);
            }
          }
        }
        // Castling
        if (!obj.moved) {
          let oppColor = color === 'w' ? 'b' : 'w';
          let rank = color === 'w' ? 1 : 8;
          let startCell = main.methods.cellId(5, rank);
          let notCurrentlyInCheck = !main.methods.isSquareAttacked(startCell, oppColor, board);

          if (notCurrentlyInCheck) {
            let rookKS = main.variables.pieces[color + '_rook2'];
            if (rookKS && !rookKS.moved) {
              let f = main.methods.cellId(6, rank), g = main.methods.cellId(7, rank);
              if (!board[f] && !board[g] &&
                  !main.methods.isSquareAttacked(f, oppColor, board) &&
                  !main.methods.isSquareAttacked(g, oppColor, board)) {
                moves.push(g + '_castleKS');
              }
            }
            let rookQS = main.variables.pieces[color + '_rook1'];
            if (rookQS && !rookQS.moved) {
              let d = main.methods.cellId(4, rank), c = main.methods.cellId(3, rank), b = main.methods.cellId(2, rank);
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

    simulateMove: function (board, pieceKey, targetId) {
      let newBoard = Object.assign({}, board);
      let obj = main.variables.pieces[pieceKey];
      newBoard[obj.position] = null;
      newBoard[targetId] = pieceKey;
      return newBoard;
    },

    // Full legal moves: pseudo-legal, filtered to exclude any move that
    // would leave the mover's own king in check.
    getLegalMoves: function (pieceKey) {
      let board = main.methods.getBoard();
      let color = main.methods.pieceColor(pieceKey);
      let pseudo = main.methods.getPseudoMoves(pieceKey, board);
      let legal = [];

      pseudo.forEach(moveToken => {
        let targetId = moveToken.indexOf('_castle') !== -1 ? moveToken.split('_castle')[0] : moveToken;
        let simulated = main.methods.simulateMove(board, pieceKey, targetId);
        let kingCell = (main.methods.pieceTypeOf(pieceKey) === 'king') ? targetId : main.methods.findKingCell(color, simulated);
        let oppColor = color === 'w' ? 'b' : 'w';
        if (!main.methods.isSquareAttacked(kingCell, oppColor, simulated)) legal.push(moveToken);
      });
      return legal;
    },

    isInCheck: function (color) {
      let board = main.methods.getBoard();
      let kingCell = main.methods.findKingCell(color, board);
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

    selectPiece: function (cellId) {
      let key = $('#' + cellId).attr('chess');
      main.variables.selectedpiece = cellId;
      $('#' + cellId).addClass('yellow');
      let legal = main.methods.getLegalMoves(key);
      main.variables.highlighted = legal;
      legal.forEach(m => {
        let target = m.indexOf('_castle') !== -1 ? m.split('_castle')[0] : m;
        $('#' + target).addClass('green');
      });
    },

    clearSelection: function () {
      $('.gamecell').removeClass('green yellow red');
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
    },

    flashInvalid: function (cellId) {
      $('#' + cellId).addClass('red');
      setTimeout(() => $('#' + cellId).removeClass('red'), 300);
    },

    // ---------- move execution ----------
    move: function (target) {
      let selectedpiece = $('#' + main.variables.selectedpiece).attr('chess');
      let pieceObj = main.variables.pieces[selectedpiece];
      let targetRank = target.id.split('_')[1];

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
          main.methods.endturn();
        });
      } else {
        main.methods.endturn();
      }
    },

    capture: function (target) {
      let selectedpiece = {
        name: $('#' + main.variables.selectedpiece).attr('chess'),
        id: main.variables.selectedpiece
      };

      let capturedPieceName = target.name;
      let capturedPieceObj = main.variables.pieces[capturedPieceName];
      let pieceObj = main.variables.pieces[selectedpiece.name];
      let targetRank = target.id.split('_')[1];

      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedpiece.name);

      $('#' + selectedpiece.id).html('&nbsp;');
      $('#' + selectedpiece.id).attr('chess', 'null');

      pieceObj.position = target.id;
      pieceObj.moved = true;
      capturedPieceObj.captured = true;

      if (capturedPieceName.startsWith('b_')) {
        $('#captured-black .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
      } else if (capturedPieceName.startsWith('w_')) {
        $('#captured-white .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
      }

      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') ||
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function () {
          main.methods.endturn();
        });
      } else {
        main.methods.endturn();
      }
    },

    handlePromotion: function (pieceObj, targetCell, callback) {
      let isWhite = pieceObj.type.startsWith('w_');
      let optionsHtml = '';

      if (isWhite) {
        optionsHtml = `
          <div class="promo-choice" data-type="w_queen" data-img="&#9813;">&#9813;</div>
          <div class="promo-choice" data-type="w_rook" data-img="&#9814;">&#9814;</div>
          <div class="promo-choice" data-type="w_bishop" data-img="&#9815;">&#9815;</div>
          <div class="promo-choice" data-type="w_knight" data-img="&#9816;">&#9816;</div>
        `;
      } else {
        optionsHtml = `
          <div class="promo-choice" data-type="b_queen" data-img="&#9819;">&#9819;</div>
          <div class="promo-choice" data-type="b_rook" data-img="&#9820;">&#9820;</div>
          <div class="promo-choice" data-type="b_bishop" data-img="&#9821;">&#9821;</div>
          <div class="promo-choice" data-type="b_knight" data-img="&#9822;">&#9822;</div>
        `;
      }

      $('#promotion-options').html(optionsHtml);
      $('#promotion-modal').css('display', 'flex');

      $('.promo-choice').off('click').on('click', function () {
        let chosenType = $(this).data('type');
        let chosenImg = $(this).data('img');

        pieceObj.type = chosenType;
        pieceObj.img = chosenImg;

        $('#' + targetCell).html(chosenImg);

        $('#promotion-modal').css('display', 'none');
        if (callback) callback();
      });
    },

    endturn: function () {
      $('.gamecell').removeClass('green yellow red');
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];

      main.variables.turn = main.variables.turn === 'w' ? 'b' : 'w';
      let color = main.variables.turn;

      let inCheck = main.methods.isInCheck(color);
      let hasMoves = main.methods.hasAnyLegalMoves(color);

      if (inCheck && !hasMoves) {
        main.variables.gameOver = true;
        let winner = color === 'w' ? 'Black' : 'White';
        $('#turn').text('Checkmate! ' + winner + ' wins!');
      } else if (!inCheck && !hasMoves) {
        main.variables.gameOver = true;
        $('#turn').text("Stalemate! It's a draw.");
      } else if (inCheck) {
        $('#turn').text((color === 'w' ? 'White' : 'Black') + "'s turn \u2014 Check!");
      } else {
        $('#turn').text(color === 'w' ? "It's Whites Turn!" : "It's Blacks Turn!");
      }
    }
  }
};

$(document).ready(function () {
  main.methods.gamesetup();

  $('.gamecell').click(function () {
    if (main.variables.gameOver) return;

    let cellId = $(this).attr('id');
    let chessPiece = $(this).attr('chess');

    if (main.variables.selectedpiece === '') {
      if (chessPiece !== 'null' && main.methods.pieceColor(chessPiece) === main.variables.turn) {
        main.methods.selectPiece(cellId);
      }
    } else {
      if (main.variables.selectedpiece === cellId) {
        main.methods.clearSelection();
      } else if (chessPiece !== 'null' && main.methods.pieceColor(chessPiece) === main.variables.turn) {
        // Switch selection to a different piece of the same color.
        main.methods.clearSelection();
        main.methods.selectPiece(cellId);
      } else {
        let match = main.variables.highlighted.find(h => h === cellId || h.indexOf(cellId + '_castle') === 0);
        if (match) {
          let selectedKey = $('#' + main.variables.selectedpiece).attr('chess');
          if (match.indexOf('_castleKS') !== -1) {
            main.methods.performCastle(selectedKey, 'KS');
            main.methods.endturn();
          } else if (match.indexOf('_castleQS') !== -1) {
            main.methods.performCastle(selectedKey, 'QS');
            main.methods.endturn();
          } else if (chessPiece === 'null') {
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
    location.reload();
  });
});

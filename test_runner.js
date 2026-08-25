const assert = require('assert');

const dom = {
  cells: {},
  turnText: '',
  turnClasses: new Set(),
  capturedWhite: [],
  capturedBlack: [],
  promoDisplay: 'none',
  promoHtml: ''
};

function resetDom() {
  dom.cells = {};
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 8; c++) {
      dom.cells[c + '_' + r] = {
        id: c + '_' + r,
        chess: 'null',
        html: '&nbsp;',
        classes: new Set()
      };
    }
  }
  dom.turnText = "It's White's Turn!";
  dom.turnClasses.clear();
  dom.capturedWhite = [];
  dom.capturedBlack = [];
  dom.promoDisplay = 'none';
  dom.promoHtml = '';
}

resetDom();

global.$ = function(selector) {
  if (!selector) {
    return {
      attr: () => null,
      html: () => '',
      addClass: function() { return this; },
      removeClass: function() { return this; }
    };
  }

  if (typeof selector === 'object') {
    if (selector.id && dom.cells[selector.id]) {
      let cell = dom.cells[selector.id];
      return {
        attr: function(name, val) {
          if (val !== undefined) { cell[name] = val; return this; }
          return cell[name];
        },
        html: function(val) {
          if (val !== undefined) { cell.html = val; return this; }
          return cell.html;
        },
        addClass: function(cls) {
          cls.split(' ').forEach(c => cell.classes.add(c));
          return this;
        },
        removeClass: function(cls) {
          cls.split(' ').forEach(c => cell.classes.delete(c));
          return this;
        }
      };
    }
    return {
      ready: function(cb) { cb(); },
      on: function() {},
      click: function() {},
      off: function() { return this; }
    };
  }

  if (selector === '.gamecell') {
    return {
      attr: function(name, val) {
        if (val !== undefined) {
          for (let id in dom.cells) dom.cells[id][name] = val;
          return this;
        }
      },
      html: function(val) {
        if (val !== undefined) {
          for (let id in dom.cells) dom.cells[id].html = val;
          return this;
        }
      },
      removeClass: function(cls) {
        let classes = cls.split(' ');
        for (let id in dom.cells) {
          classes.forEach(c => dom.cells[id].classes.delete(c));
        }
        return this;
      },
      each: function(cb) {
        for (let id in dom.cells) {
          cb.call(dom.cells[id]);
        }
      }
    };
  }

  if (typeof selector === 'string' && selector.startsWith('#')) {
    let id = selector.substring(1);

    if (id === 'turn') {
      return {
        text: function(txt) {
          if (txt !== undefined) { dom.turnText = txt; return this; }
          return dom.turnText;
        },
        addClass: function(cls) { dom.turnClasses.add(cls); return this; },
        removeClass: function(cls) { dom.turnClasses.delete(cls); return this; }
      };
    }

    if (id === 'captured-black .captured-pieces-list') {
      return {
        append: function(html) { dom.capturedBlack.push(html); },
        empty: function() { dom.capturedBlack = []; }
      };
    }

    if (id === 'captured-white .captured-pieces-list') {
      return {
        append: function(html) { dom.capturedWhite.push(html); },
        empty: function() { dom.capturedWhite = []; }
      };
    }

    if (id === 'promotion-modal') {
      return {
        css: function(prop, val) {
          if (prop === 'display') dom.promoDisplay = val;
          return this;
        }
      };
    }

    if (id === 'promotion-options') {
      return {
        html: function(h) { dom.promoHtml = h; return this; }
      };
    }

    if (dom.cells[id]) {
      let cell = dom.cells[id];
      return {
        attr: function(name, val) {
          if (val !== undefined) { cell[name] = val; return this; }
          return cell[name];
        },
        html: function(val) {
          if (val !== undefined) { cell.html = val; return this; }
          return cell.html;
        },
        addClass: function(cls) {
          cls.split(' ').forEach(c => cell.classes.add(c));
          return this;
        },
        removeClass: function(cls) {
          cls.split(' ').forEach(c => cell.classes.delete(c));
          return this;
        }
      };
    }
  }

  return {
    click: function() {},
    on: function() {},
    off: function() { return this; }
  };
};

global.document = {
  ready: function(cb) { cb(); }
};

const main = require('./script.js');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    resetDom();
    main.methods.resetGame();
    fn();
    console.log('  PASS: ' + name);
    passedTests++;
  } catch (err) {
    console.error('  FAIL: ' + name);
    console.error('    ' + err.message);
    console.error(err.stack);
    failedTests++;
  }
}

console.log('--- RUNNING COMPREHENSIVE CHESS TEST SUITE ---');

runTest('1. Initial Setup and Piece Count', () => {
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.gameOver, false);
  let pieces = main.variables.pieces;
  assert.strictEqual(Object.keys(pieces).length, 32);
  let board = main.methods.getBoard();
  assert.strictEqual(board['5_1'], 'w_king');
  assert.strictEqual(board['5_8'], 'b_king');
  assert.strictEqual(board['1_1'], 'w_rook1');
  assert.strictEqual(board['8_1'], 'w_rook2');
  assert.strictEqual(board['4_1'], 'w_queen');
});

runTest('2. Initial Legal Moves for White', () => {
  let movesPawn = main.methods.getLegalMoves('w_pawn5');
  assert.deepStrictEqual(movesPawn.sort(), ['5_3', '5_4'].sort());

  let movesKnight = main.methods.getLegalMoves('w_knight1');
  assert.deepStrictEqual(movesKnight.sort(), ['1_3', '3_3'].sort());

  let movesBishop = main.methods.getLegalMoves('w_bishop1');
  assert.strictEqual(movesBishop.length, 0);

  let movesKing = main.methods.getLegalMoves('w_king');
  assert.strictEqual(movesKing.length, 0);
});

runTest('3. Fool\'s Mate Checkmate Detection', () => {
  main.variables.selectedpiece = '6_2';
  main.methods.move({ id: '6_3' });
  assert.strictEqual(main.variables.turn, 'b');

  main.variables.selectedpiece = '5_7';
  main.methods.move({ id: '5_5' });
  assert.strictEqual(main.variables.turn, 'w');

  main.variables.selectedpiece = '7_2';
  main.methods.move({ id: '7_4' });
  assert.strictEqual(main.variables.turn, 'b');

  main.variables.selectedpiece = '4_8';
  main.methods.move({ id: '8_4' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(main.methods.isInCheck('w'), true);
  assert.strictEqual(main.methods.hasAnyLegalMoves('w'), false);
  assert.strictEqual(dom.turnText, 'Checkmate! Black wins!');
});

runTest('4. Scholar\'s Mate Checkmate Detection', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '3_4' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '8_5' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });

  main.variables.selectedpiece = '8_5';
  main.methods.capture({ id: '6_7', name: 'b_pawn6' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(main.methods.isInCheck('b'), true);
  assert.strictEqual(main.methods.hasAnyLegalMoves('b'), false);
  assert.strictEqual(dom.turnText, 'Checkmate! White wins!');
});

runTest('5. Castling Kingside and Queenside for White', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '8_3' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '6_8'; main.methods.move({ id: '3_5' });

  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.ok(kingMoves.includes('7_1_castleKS'), 'King should be allowed to castle KS');

  main.methods.performCastle('w_king', 'KS');
  main.methods.endturn(null);

  let board = main.methods.getBoard();
  assert.strictEqual(board['7_1'], 'w_king');
  assert.strictEqual(board['6_1'], 'w_rook2');
  assert.strictEqual(board['5_1'], null);
  assert.strictEqual(board['8_1'], null);
  assert.strictEqual(main.variables.pieces['w_king'].moved, true);
  assert.strictEqual(main.variables.pieces['w_rook2'].moved, true);
});

runTest('6. Castling Queenside for White', () => {
  // Clear d2, c1, b1: move d4, Nc3, Bd2, Qd3
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_4' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  main.variables.selectedpiece = '2_1'; main.methods.move({ id: '3_3' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '3_1'; main.methods.move({ id: '4_2' });
  main.variables.selectedpiece = '3_8'; main.methods.move({ id: '4_7' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });

  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.ok(kingMoves.includes('3_1_castleQS'), 'King should be allowed to castle QS');

  main.methods.performCastle('w_king', 'QS');
  main.methods.endturn(null);

  let board = main.methods.getBoard();
  assert.strictEqual(board['3_1'], 'w_king');
  assert.strictEqual(board['4_1'], 'w_rook1');
  assert.strictEqual(board['5_1'], null);
  assert.strictEqual(board['1_1'], null);
  assert.strictEqual(main.variables.pieces['w_king'].moved, true);
  assert.strictEqual(main.variables.pieces['w_rook1'].moved, true);
});

runTest('7. Castling Prevented When Square in Transit is Attacked', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '8_3' });
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_5' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '4_3' });
  main.variables.pieces['b_rook1'].position = '6_4';
  $('#6_4').attr('chess', 'b_rook1').html('&#9820;');
  $('#1_8').attr('chess', 'null').html('&nbsp;');
  $('#6_2').attr('chess', 'null').html('&nbsp;');

  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.strictEqual(kingMoves.includes('7_1_castleKS'), false, 'Should not castle through attacked square');
});

runTest('8. Castling Prevented If King Has Moved', () => {
  main.variables.pieces['w_king'].moved = true;
  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.strictEqual(kingMoves.some(m => m.includes('castle')), false, 'Moved king cannot castle');
});

runTest('9. Castling Prevented If Rook Was Captured', () => {
  main.variables.pieces['w_rook2'].captured = true;
  $('#8_1').attr('chess', 'null');
  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.strictEqual(kingMoves.includes('7_1_castleKS'), false, 'Cannot castle with captured rook');
});

runTest('10. En Passant Capture - White capturing Black', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' });
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });

  assert.ok(main.variables.enPassantTarget !== null, 'En passant target should be set');
  assert.strictEqual(main.variables.enPassantTarget.cell, '4_6');
  assert.strictEqual(main.variables.enPassantTarget.pawnCell, '4_5');

  let legal = main.methods.getLegalMoves('w_pawn5');
  assert.ok(legal.includes('4_6_ep'), 'Pawn should have en passant move');

  main.methods.performEnPassant('w_pawn5', '4_6');

  let board = main.methods.getBoard();
  assert.strictEqual(board['4_6'], 'w_pawn5');
  assert.strictEqual(board['5_5'], null);
  assert.strictEqual(board['4_5'], null, 'Captured black pawn at 4_5 must be gone');
  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, true);
  assert.strictEqual(dom.capturedBlack.length, 1);
});

runTest('11. En Passant Capture - Black capturing White', () => {
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  main.variables.selectedpiece = '1_3'; main.methods.move({ id: '1_4' });
  main.variables.selectedpiece = '4_5'; main.methods.move({ id: '4_4' }); // Black pawn at d4 (4_4)
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // White plays e2-e4 (5_2 -> 5_4)

  assert.ok(main.variables.enPassantTarget !== null);
  assert.strictEqual(main.variables.enPassantTarget.cell, '5_3');
  assert.strictEqual(main.variables.enPassantTarget.pawnCell, '5_4');

  let legal = main.methods.getLegalMoves('b_pawn4');
  assert.ok(legal.includes('5_3_ep'), 'Black pawn should have en passant capture move to 5_3');

  main.methods.performEnPassant('b_pawn4', '5_3');
  let board = main.methods.getBoard();
  assert.strictEqual(board['5_3'], 'b_pawn4');
  assert.strictEqual(board['4_4'], null);
  assert.strictEqual(board['5_4'], null, 'White pawn at 5_4 captured');
  assert.strictEqual(main.variables.pieces['w_pawn5'].captured, true);
  assert.strictEqual(dom.capturedWhite.length, 1);
});

runTest('12. En Passant Expires After 1 Turn', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' });
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });

  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' });
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' });

  assert.strictEqual(main.variables.enPassantTarget, null);
  let legal = main.methods.getLegalMoves('w_pawn5');
  assert.strictEqual(legal.includes('4_6_ep'), false);
});

runTest('13. Absolute Pin Prevents Exposing King', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  $('#5_4').attr('chess', 'null');
  $('#5_5').attr('chess', 'null');
  $('#5_2').attr('chess', 'w_bishop1');
  main.variables.pieces['w_bishop1'].position = '5_2';
  $('#5_8').attr('chess', 'b_rook1');
  main.variables.pieces['b_rook1'].position = '5_8';
  $('#5_7').attr('chess', 'null');

  let bishopMoves = main.methods.getLegalMoves('w_bishop1');
  assert.strictEqual(bishopMoves.length, 0, 'Pinned bishop cannot move off pin line');
});

runTest('14. Pawn Promotion to Queen, Rook, Bishop, Knight', () => {
  main.variables.pieces['w_pawn1'].position = '1_7';
  $('#1_7').attr('chess', 'w_pawn1');
  $('#1_2').attr('chess', 'null');
  $('#1_8').attr('chess', 'null');

  main.variables.selectedpiece = '1_7';
  main.methods.move({ id: '1_8' });

  assert.strictEqual(main.variables.isPromoting, true);
  assert.strictEqual(dom.promoDisplay, 'flex');

  let pawnObj = main.variables.pieces['w_pawn1'];
  pawnObj.type = 'w_queen';
  pawnObj.img = '&#9813;';
  $('#1_8').html('&#9813;');
  dom.promoDisplay = 'none';
  main.variables.isPromoting = false;
  main.methods.endturn(null);

  assert.strictEqual(pawnObj.type, 'w_queen');
  assert.strictEqual(main.methods.pieceTypeOf('w_pawn1'), 'queen');
  let moves = main.methods.getLegalMoves('w_pawn1');
  assert.ok(moves.length > 5, 'Promoted queen should have queen moves');
});

runTest('15. Stalemate Detection', () => {
  for (let k in main.variables.pieces) {
    main.variables.pieces[k].captured = true;
    main.variables.pieces[k].position = '';
  }
  $('.gamecell').attr('chess', 'null').html('&nbsp;');

  main.variables.pieces['w_king'].captured = false;
  main.variables.pieces['w_king'].position = '6_6';
  $('#6_6').attr('chess', 'w_king').html('&#9812;');

  main.variables.pieces['w_queen'].captured = false;
  main.variables.pieces['w_queen'].position = '7_6';
  $('#7_6').attr('chess', 'w_queen').html('&#9813;');

  main.variables.pieces['b_king'].captured = false;
  main.variables.pieces['b_king'].position = '8_8';
  $('#8_8').attr('chess', 'b_king').html('&#9818;');

  main.variables.turn = 'w';
  main.methods.endturn(null);

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, "Stalemate! It's a draw.");
});

runTest('16. Reset Game Functionality', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.gameOver = true;

  main.methods.resetGame();

  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.gameOver, false);
  assert.strictEqual(main.variables.selectedpiece, '');
  assert.strictEqual(main.variables.enPassantTarget, null);
  assert.strictEqual(dom.turnText, "It's White's Turn!");
  let board = main.methods.getBoard();
  assert.strictEqual(board['5_1'], 'w_king');
  assert.strictEqual(board['5_2'], 'w_pawn5');
  assert.strictEqual(board['5_4'], null);
});

console.log('\n------------------------------------');
console.log('TOTAL PASSED: ' + passedTests);
console.log('TOTAL FAILED: ' + failedTests);
console.log('------------------------------------');

if (failedTests > 0) process.exit(1);

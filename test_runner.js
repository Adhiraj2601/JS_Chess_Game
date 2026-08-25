const assert = require('assert');

// Mock a lightweight DOM environment for Node.js
const dom = {
  cells: {},
  turnText: '',
  turnClasses: new Set(),
  capturedWhite: [],
  capturedBlack: [],
  promoDisplay: 'none',
  promoHtml: '',
  undoDisabled: false,
  redoDisabled: false,
  gameHtml: '',
  historyHtml: ''
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
  dom.undoDisabled = true;
  dom.redoDisabled = true;
  dom.gameHtml = '';
  dom.historyHtml = '';
}

resetDom();

// Mock jQuery global
global.$ = function(selector) {
  if (!selector) {
    return {
      attr: () => null,
      html: () => '',
      addClass: function() { return this; },
      removeClass: function() { return this; },
      prop: function() { return false; },
      hasClass: function() { return false; }
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

    if (id === 'game') {
      return {
        html: function(h) {
          if (h !== undefined) { dom.gameHtml = h; return this; }
          return dom.gameHtml;
        }
      };
    }

    if (id === 'turn') {
      return {
        text: function(txt) {
          if (txt !== undefined) { dom.turnText = txt; return this; }
          return dom.turnText;
        },
        addClass: function(cls) { dom.turnClasses.add(cls); return this; },
        removeClass: function(cls) { dom.turnClasses.delete(cls); return this; },
        hasClass: function(cls) { return dom.turnClasses.has(cls); }
      };
    }

    if (id === 'move-history-list') {
      return {
        html: function(h) {
          if (h !== undefined) { dom.historyHtml = h; return this; }
          return dom.historyHtml;
        }
      };
    }

    if (id === 'undo-btn') {
      return {
        prop: function(p, val) {
          if (val !== undefined) { dom.undoDisabled = val; return this; }
          return dom.undoDisabled;
        }
      };
    }

    if (id === 'redo-btn') {
      return {
        prop: function(p, val) {
          if (val !== undefined) { dom.redoDisabled = val; return this; }
          return dom.redoDisabled;
        }
      };
    }

    if (id === 'captured-black .captured-pieces-list') {
      return {
        append: function(html) { dom.capturedBlack.push(html); },
        html: function(h) {
          if (h !== undefined) {
            dom.capturedBlack = h ? [h] : [];
            return this;
          }
          return dom.capturedBlack.join('');
        },
        empty: function() { dom.capturedBlack = []; }
      };
    }

    if (id === 'captured-white .captured-pieces-list') {
      return {
        append: function(html) { dom.capturedWhite.push(html); },
        html: function(h) {
          if (h !== undefined) {
            dom.capturedWhite = h ? [h] : [];
            return this;
          }
          return dom.capturedWhite.join('');
        },
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
    off: function() { return this; },
    prop: function() { return false; },
    is: function() { return false; }
  };
};

global.document = {
  ready: function(cb) { cb(); },
  getElementById: function(id) {
    if (id === 'move-history-list') return { scrollTop: 0, scrollHeight: 100 };
    return null;
  }
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

console.log('=== CHESS COMPREHENSIVE AUTOMATED TEST SUITE ===\n');

runTest('1. Initial Setup & Piece Count', () => {
  let board = main.methods.getBoard();
  let pieceCount = 0;
  for (let id in board) {
    if (board[id]) pieceCount++;
  }
  assert.strictEqual(pieceCount, 32);
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.gameOver, false);
  assert.strictEqual(main.variables.moveHistory.length, 0);
  assert.strictEqual(dom.undoDisabled, true);
  assert.strictEqual(dom.redoDisabled, true);
});

runTest('2. Initial Legal Moves for White', () => {
  let e2Moves = main.methods.getLegalMoves('w_pawn5');
  assert.ok(e2Moves.includes('5_3'));
  assert.ok(e2Moves.includes('5_4'));
  assert.strictEqual(e2Moves.length, 2);

  let b1Moves = main.methods.getLegalMoves('w_knight1');
  assert.ok(b1Moves.includes('1_3'));
  assert.ok(b1Moves.includes('3_3'));
  assert.strictEqual(b1Moves.length, 2);
});

runTest('3. Move History & Standard Algebraic Notation (SAN)', () => {
  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.moveHistory[0].san, 'e4');

  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  assert.strictEqual(main.variables.moveHistory[1].san, 'e5');

  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });
  assert.strictEqual(main.variables.moveHistory[2].san, 'Nf3');

  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  assert.strictEqual(main.variables.moveHistory[3].san, 'Nc6');

  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '2_5' });
  assert.strictEqual(main.variables.moveHistory[4].san, 'Bb5');

  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' });
  assert.strictEqual(main.variables.moveHistory[5].san, 'a6');

  main.variables.selectedpiece = '2_5'; main.methods.capture({ id: '3_6', name: 'b_knight1' });
  assert.strictEqual(main.variables.moveHistory[6].san, 'Bxc6');

  main.variables.selectedpiece = '4_7'; main.methods.capture({ id: '3_6', name: 'w_bishop2' });
  assert.strictEqual(main.variables.moveHistory[7].san, 'dxc6');
});

runTest('4. SAN Disambiguation (Two Knights Reaching Same Square)', () => {
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_4' }); // 1. d4
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 1... d5
  main.variables.selectedpiece = '2_1'; main.methods.move({ id: '4_2' }); // 2. Nd2
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' }); // 2... a6

  // White has knight on d2 (4_2) and knight on g1 (7_1), both can jump to f3 (6_3)
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '6_3' });
  let lastSan = main.variables.moveHistory[main.variables.moveHistory.length - 1].san;
  assert.strictEqual(lastSan, 'Ndf3', 'Must disambiguate knight file: Ndf3');
});

runTest('5. Fool\'s Mate (Checkmate Detection & # Suffix)', () => {
  // 1. f3 e5 2. g4 Qh4#
  main.variables.selectedpiece = '6_2'; main.methods.move({ id: '6_3' }); // 1. f3
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '7_2'; main.methods.move({ id: '7_4' }); // 2. g4
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '8_4' }); // 2... Qh4#

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'Checkmate! Black wins!');
  let lastSan = main.variables.moveHistory[main.variables.moveHistory.length - 1].san;
  assert.strictEqual(lastSan, 'Qh4#');
});

runTest('6. Scholar\'s Mate & PGN Export', () => {
  // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '3_4' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '8_5' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });
  main.variables.selectedpiece = '8_5'; main.methods.capture({ id: '6_7', name: 'b_pawn6' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'Checkmate! White wins!');
  let pgn = main.methods.exportPGN();
  assert.ok(pgn.includes('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'));
  assert.ok(pgn.includes('[Result "1-0"]'));
});

runTest('7. White Kingside Castling (Execution & O-O)', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '6_8'; main.methods.move({ id: '3_5' });

  main.methods.performCastle('w_king', 'KS');

  let board = main.methods.getBoard();
  assert.strictEqual(board['7_1'], 'w_king');
  assert.strictEqual(board['6_1'], 'w_rook2');
  assert.strictEqual(board['5_1'], null);
  assert.strictEqual(board['8_1'], null);
  assert.strictEqual(main.variables.moveHistory[main.variables.moveHistory.length - 1].san, 'O-O');
});

runTest('8. White Queenside Castling (Execution & O-O-O)', () => {
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_4' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  main.variables.selectedpiece = '3_1'; main.methods.move({ id: '6_4' });
  main.variables.selectedpiece = '3_8'; main.methods.move({ id: '6_5' });
  main.variables.selectedpiece = '2_1'; main.methods.move({ id: '3_3' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '4_6' });

  main.methods.performCastle('w_king', 'QS');

  let board = main.methods.getBoard();
  assert.strictEqual(board['3_1'], 'w_king');
  assert.strictEqual(board['4_1'], 'w_rook1');
  assert.strictEqual(board['5_1'], null);
  assert.strictEqual(board['1_1'], null);
  assert.strictEqual(main.variables.moveHistory[main.variables.moveHistory.length - 1].san, 'O-O-O');
});

runTest('9. Castling Prevented When Transit Squares Attacked', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_5' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '3_8'; main.methods.move({ id: '1_6' });
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' });
  main.variables.selectedpiece = '1_6'; main.methods.move({ id: '6_1' }); // Black bishop attacks f1 (6_1)

  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.ok(!kingMoves.includes('7_1_castleKS'), 'Kingside castle must be forbidden when f1 is attacked');
});

runTest('10. En Passant Capture (White capturing Black pawn)', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' }); // 1... h6
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' }); // 2. e5
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 2... d5

  assert.ok(main.variables.enPassantTarget !== null);
  assert.strictEqual(main.variables.enPassantTarget.cell, '4_6');

  let pawnMoves = main.methods.getLegalMoves('w_pawn5');
  assert.ok(pawnMoves.includes('4_6_ep'), 'En passant move token must be present');

  main.methods.performEnPassant('w_pawn5', '4_6');
  let board = main.methods.getBoard();
  assert.strictEqual(board['4_6'], 'w_pawn5');
  assert.strictEqual(board['4_5'], null);
  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, true);
  assert.strictEqual(main.variables.moveHistory[main.variables.moveHistory.length - 1].san, 'exd6');
});

runTest('11. Absolute Pin Prevents Exposing King to Check', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '5_2' }); // 2. Qe2
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '5_7' }); // 2... Qe7
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' }); // 3. a3
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' }); // 3... a6
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_3' }); // 4. d3

  let bPawnMoves = main.methods.getLegalMoves('b_pawn5');
  assert.strictEqual(bPawnMoves.length, 0, 'Pinned pawn on e5 cannot legally move');
});

runTest('12. Stalemate Detection', () => {
  // Clear board and setup 2-piece stalemate: White King on a6, Queen on b6, Black King on a8
  for (let key in main.variables.pieces) {
    main.variables.pieces[key].captured = true;
    main.variables.pieces[key].position = '';
  }
  main.variables.pieces['w_king'].captured = false;
  main.variables.pieces['w_king'].position = '1_6';
  main.variables.pieces['w_queen'].captured = false;
  main.variables.pieces['w_queen'].position = '2_6';
  main.variables.pieces['b_king'].captured = false;
  main.variables.pieces['b_king'].position = '1_8';
  main.methods.gamesetup();

  main.variables.turn = 'b';
  let inCheck = main.methods.isInCheck('b');
  let hasMoves = main.methods.hasAnyLegalMoves('b');

  assert.strictEqual(inCheck, false);
  assert.strictEqual(hasMoves, false);
});

runTest('13. Move Undo and Redo Mechanics', () => {
  // 1. e4
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.variables.moveHistory.length, 1);
  assert.strictEqual(dom.undoDisabled, false);

  // Undo 1. e4
  main.methods.undo();
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.pieces['w_pawn5'].position, '5_2');
  assert.strictEqual(main.methods.getBoard()['5_4'], null);
  assert.strictEqual(main.methods.getBoard()['5_2'], 'w_pawn5');
  assert.strictEqual(dom.redoDisabled, false);

  // Redo 1. e4
  main.methods.redo();
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.variables.pieces['w_pawn5'].position, '5_4');
  assert.strictEqual(dom.redoDisabled, true);
});

runTest('14. Capture Undo Restores Captured Pieces & UI', () => {
  // 1. e4 d5 2. exd5
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  main.variables.selectedpiece = '5_4'; main.methods.capture({ id: '4_5', name: 'b_pawn4' });

  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, true);
  assert.strictEqual(dom.capturedBlack.length, 1);

  // Undo capture
  main.methods.undo();
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, false);
  assert.strictEqual(main.variables.pieces['b_pawn4'].position, '4_5');
  assert.strictEqual(main.methods.getBoard()['4_5'], 'b_pawn4');
  assert.strictEqual(dom.capturedBlack.length, 0);

  // Redo capture
  main.methods.redo();
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, true);
  assert.strictEqual(dom.capturedBlack.length, 1);
});

runTest('15. Castling Undo Restores King & Rook State', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '8_3' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '4_3' });
  main.variables.selectedpiece = '6_8'; main.methods.move({ id: '3_5' });

  main.methods.performCastle('w_king', 'KS');
  assert.strictEqual(main.variables.pieces['w_king'].moved, true);
  assert.strictEqual(main.variables.pieces['w_rook2'].moved, true);

  // Undo
  main.methods.undo();
  assert.strictEqual(main.variables.pieces['w_king'].moved, false);
  assert.strictEqual(main.variables.pieces['w_rook2'].moved, false);
  assert.strictEqual(main.methods.getBoard()['5_1'], 'w_king');
  assert.strictEqual(main.methods.getBoard()['8_1'], 'w_rook2');
});

runTest('16. New Move Clears Redo Stack', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });

  main.methods.undo();
  assert.strictEqual(main.variables.redoStack.length, 1);

  main.variables.selectedpiece = '3_7'; main.methods.move({ id: '3_5' });
  assert.strictEqual(main.variables.redoStack.length, 0);
  assert.strictEqual(dom.redoDisabled, true);
});

runTest('17. Threefold Repetition Draw Detection', () => {
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // Nf3
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' }); // Nf6
  main.variables.selectedpiece = '6_3'; main.methods.move({ id: '7_1' }); // Ng1
  main.variables.selectedpiece = '6_6'; main.methods.move({ id: '7_8' }); // Ng8 (2nd)

  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // Nf3
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' }); // Nf6
  main.variables.selectedpiece = '6_3'; main.methods.move({ id: '7_1' }); // Ng1
  main.variables.selectedpiece = '6_6'; main.methods.move({ id: '7_8' }); // Ng8 (3rd -> Draw)

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'DRAW BY THREEFOLD REPETITION');
});

runTest('18. 50-Move Rule (100 Half-Moves Draw & Resets)', () => {
  main.variables.halfmoveClock = 99;
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // quiet knight move

  assert.strictEqual(main.variables.halfmoveClock, 100);
  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'DRAW BY 50-MOVE RULE');

  // Pawn move resets clock
  main.methods.undo();
  main.variables.halfmoveClock = 50;
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.halfmoveClock, 0);
});

runTest('19. Board Flip Orientation & Coordinate Invariance', () => {
  assert.strictEqual(main.variables.orientation, 'w');

  main.methods.flipBoard();
  assert.strictEqual(main.variables.orientation, 'b');

  let board = main.methods.getBoard();
  assert.strictEqual(board['5_1'], 'w_king');
  assert.strictEqual(board['5_8'], 'b_king');

  // Move while flipped
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.strictEqual(main.methods.getBoard()['5_4'], 'w_pawn5');

  main.methods.flipBoard();
  assert.strictEqual(main.variables.orientation, 'w');
});

runTest('20. Game Reset Clears History and Snapshots', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });

  main.methods.resetGame();

  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.moveHistory.length, 0);
  assert.strictEqual(main.variables.historyStack.length, 0);
  assert.strictEqual(main.variables.redoStack.length, 0);
  assert.strictEqual(main.variables.halfmoveClock, 0);
  assert.strictEqual(main.variables.gameOver, false);
  assert.strictEqual(dom.turnText, "It's White's Turn!");
});

console.log('\n------------------------------------');
console.log('TOTAL PASSED: ' + passedTests);
console.log('TOTAL FAILED: ' + failedTests);
console.log('------------------------------------');

if (failedTests > 0) process.exit(1);

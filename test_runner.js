const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: function(key) { return storage[key] !== undefined ? storage[key] : null; },
  setItem: function(key, val) { storage[key] = String(val); },
  clear: function() { for (let k in storage) delete storage[k]; }
};

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
  historyHtml: '',
  clockWhiteText: '--:--',
  clockBlackText: '--:--',
  clockWhiteClasses: new Set(),
  clockBlackClasses: new Set(),
  soundToggleText: '🔊 Sound',
  themeSelectVal: 'classic',
  timePresetVal: 'untimed'
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
  dom.clockWhiteText = '--:--';
  dom.clockBlackText = '--:--';
  dom.clockWhiteClasses.clear();
  dom.clockBlackClasses.clear();
}

resetDom();

// Mock document.body
global.document = {
  body: {
    className: 'theme-classic'
  },
  ready: function(cb) { cb(); },
  getElementById: function(id) {
    if (id === 'move-history-list') return { scrollTop: 0, scrollHeight: 100 };
    if (id === 'drag-ghost') return { style: {}, innerHTML: '' };
    return null;
  },
  elementFromPoint: function(x, y) {
    return null;
  }
};

// Mock jQuery global
global.$ = function(selector) {
  if (!selector) {
    return {
      attr: () => null,
      html: () => '',
      text: () => '',
      addClass: function() { return this; },
      removeClass: function() { return this; },
      prop: function() { return false; },
      hasClass: function() { return false; },
      val: function() { return ''; },
      css: function() { return this; },
      closest: function() { return this; },
      length: 0
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
        },
        closest: function() { return this; },
        length: 1
      };
    }
    return {
      ready: function(cb) { cb(); },
      on: function() {},
      click: function() {},
      off: function() { return this; },
      closest: function() { return this; },
      length: 0
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

  if (typeof selector === 'string') {
    if (selector.startsWith('#')) {
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

      if (id === 'clock-white-time') {
        return {
          text: function(txt) {
            if (txt !== undefined) { dom.clockWhiteText = txt; return this; }
            return dom.clockWhiteText;
          }
        };
      }

      if (id === 'clock-black-time') {
        return {
          text: function(txt) {
            if (txt !== undefined) { dom.clockBlackText = txt; return this; }
            return dom.clockBlackText;
          }
        };
      }

      if (id === 'clock-white') {
        return {
          addClass: function(cls) { dom.clockWhiteClasses.add(cls); return this; },
          removeClass: function(cls) { dom.clockWhiteClasses.delete(cls); return this; }
        };
      }

      if (id === 'clock-black') {
        return {
          addClass: function(cls) { dom.clockBlackClasses.add(cls); return this; },
          removeClass: function(cls) { dom.clockBlackClasses.delete(cls); return this; }
        };
      }

      if (id === 'sound-toggle') {
        return {
          text: function(txt) {
            if (txt !== undefined) { dom.soundToggleText = txt; return this; }
            return dom.soundToggleText;
          }
        };
      }

      if (id === 'theme-select') {
        return {
          val: function(v) {
            if (v !== undefined) { dom.themeSelectVal = v; return this; }
            return dom.themeSelectVal;
          }
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
          },
          closest: function() { return this; },
          length: 1
        };
      }
    }
  }

  return {
    click: function() {},
    on: function() {},
    off: function() { return this; },
    prop: function() { return false; },
    is: function() { return false; },
    addClass: function() { return this; },
    removeClass: function() { return this; },
    text: function() { return ''; },
    val: function() { return ''; },
    css: function() { return this; },
    closest: function() { return this; },
    length: 0
  };
};

const { main, ClockManager, AudioManager, ThemeManager, DragManager } = require('./script.js');

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

console.log('=== CHESS ADVANCED COMPREHENSIVE TEST SUITE (54 TESTS) ===\n');

// 1 - 20: Full Regression Suite
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

  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '6_3' });
  let lastSan = main.variables.moveHistory[main.variables.moveHistory.length - 1].san;
  assert.strictEqual(lastSan, 'Ndf3', 'Must disambiguate knight file: Ndf3');
});

runTest('5. Fool\'s Mate (Checkmate Detection & # Suffix)', () => {
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
  main.variables.selectedpiece = '1_6'; main.methods.move({ id: '6_1' });

  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.ok(!kingMoves.includes('7_1_castleKS'), 'Kingside castle must be forbidden when f1 is attacked');
});

runTest('10. En Passant Capture (White capturing Black pawn)', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' });
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });

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
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '5_2' });
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '5_7' });
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' });
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' });
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_3' });

  let bPawnMoves = main.methods.getLegalMoves('b_pawn5');
  assert.strictEqual(bPawnMoves.length, 0, 'Pinned pawn on e5 cannot legally move');
});

runTest('12. Stalemate Detection', () => {
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
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.variables.moveHistory.length, 1);
  assert.strictEqual(dom.undoDisabled, false);

  main.methods.undo();
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.pieces['w_pawn5'].position, '5_2');
  assert.strictEqual(main.methods.getBoard()['5_4'], null);
  assert.strictEqual(main.methods.getBoard()['5_2'], 'w_pawn5');
  assert.strictEqual(dom.redoDisabled, false);

  main.methods.redo();
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.variables.pieces['w_pawn5'].position, '5_4');
  assert.strictEqual(dom.redoDisabled, true);
});

runTest('14. Capture Undo Restores Captured Pieces & UI', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  main.variables.selectedpiece = '5_4'; main.methods.capture({ id: '4_5', name: 'b_pawn4' });

  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, true);
  assert.strictEqual(dom.capturedBlack.length, 1);

  main.methods.undo();
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.variables.pieces['b_pawn4'].captured, false);
  assert.strictEqual(main.variables.pieces['b_pawn4'].position, '4_5');
  assert.strictEqual(main.methods.getBoard()['4_5'], 'b_pawn4');
  assert.strictEqual(dom.capturedBlack.length, 0);

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
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });
  main.variables.selectedpiece = '6_3'; main.methods.move({ id: '7_1' });
  main.variables.selectedpiece = '6_6'; main.methods.move({ id: '7_8' });

  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });
  main.variables.selectedpiece = '6_3'; main.methods.move({ id: '7_1' });
  main.variables.selectedpiece = '6_6'; main.methods.move({ id: '7_8' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'DRAW BY THREEFOLD REPETITION');
});

runTest('18. 50-Move Rule (100 Half-Moves Draw & Resets)', () => {
  main.variables.halfmoveClock = 99;
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' });

  assert.strictEqual(main.variables.halfmoveClock, 100);
  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'DRAW BY 50-MOVE RULE');

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

// 21 - 30: Clock, Audio, Theme, Highlights, Drag basics
runTest('21. Chess Clock: Initial State & Untimed Mode', () => {
  ClockManager.setPreset('untimed');
  assert.strictEqual(ClockManager.state.isTimed, false);
  assert.strictEqual(ClockManager.formatTime(ClockManager.state.whiteMs), '--:--');
  assert.strictEqual(ClockManager.state.running, false);
});

runTest('22. Chess Clock: Presets (1+0, 3+2, 10+0, Custom)', () => {
  ClockManager.setPreset('1+0');
  assert.strictEqual(ClockManager.state.isTimed, true);
  assert.strictEqual(ClockManager.state.whiteMs, 60000);
  assert.strictEqual(ClockManager.state.incrementMs, 0);
  assert.strictEqual(ClockManager.formatTime(ClockManager.state.whiteMs), '01:00');

  ClockManager.setPreset('3+2');
  assert.strictEqual(ClockManager.state.whiteMs, 180000);
  assert.strictEqual(ClockManager.state.incrementMs, 2000);
  assert.strictEqual(ClockManager.formatTime(ClockManager.state.whiteMs), '03:00');

  ClockManager.setPreset('custom', 15, 10);
  assert.strictEqual(ClockManager.state.whiteMs, 900000);
  assert.strictEqual(ClockManager.state.incrementMs, 10000);
  assert.strictEqual(ClockManager.formatTime(ClockManager.state.whiteMs), '15:00');
});

runTest('23. Chess Clock: Starts on First Move & Applies Increment', () => {
  ClockManager.setPreset('3+2');
  assert.strictEqual(ClockManager.state.running, false);

  main.variables.selectedpiece = '5_2';
  main.methods.move({ id: '5_4' });

  assert.strictEqual(ClockManager.state.running, true);
  assert.strictEqual(ClockManager.state.activeColor, 'b');

  main.variables.selectedpiece = '5_7';
  main.methods.move({ id: '5_5' });

  assert.strictEqual(ClockManager.state.activeColor, 'w');
  assert.strictEqual(ClockManager.state.blackMs, 180000 + 2000);
  ClockManager.stop();
});

runTest('24. Chess Clock: Flag Fall (Timeout) Ends Game', () => {
  ClockManager.setPreset('1+0');
  main.variables.selectedpiece = '5_2';
  main.methods.move({ id: '5_4' });

  ClockManager.handleTimeout('b');

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(ClockManager.state.running, false);
  assert.ok(dom.turnText.includes('WHITE WINS'));
});

runTest('25. Chess Clock: Stops on Checkmate', () => {
  ClockManager.setPreset('3+0');
  main.variables.selectedpiece = '6_2'; main.methods.move({ id: '6_3' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '7_2'; main.methods.move({ id: '7_4' });
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '8_4' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(ClockManager.state.running, false);
});

runTest('26. Audio Manager: Sound Triggering & Mute Toggle', () => {
  AudioManager.init();
  assert.strictEqual(AudioManager.enabled, true);

  AudioManager.toggleSound();
  assert.strictEqual(AudioManager.enabled, false);
  assert.strictEqual(global.localStorage.getItem('chess_sound'), 'false');

  AudioManager.toggleSound();
  assert.strictEqual(AudioManager.enabled, true);
});

runTest('27. Theme Manager: Theme Switching & Persistence', () => {
  ThemeManager.apply('neon');
  assert.strictEqual(ThemeManager.current, 'neon');
  assert.strictEqual(global.document.body.className, 'theme-neon');
  assert.strictEqual(global.localStorage.getItem('chess_theme'), 'neon');

  ThemeManager.apply('wood');
  assert.strictEqual(ThemeManager.current, 'wood');
  assert.strictEqual(global.document.body.className, 'theme-wood');

  ThemeManager.apply('slate');
  assert.strictEqual(ThemeManager.current, 'slate');
  assert.strictEqual(global.document.body.className, 'theme-slate');

  ThemeManager.apply('classic');
  assert.strictEqual(ThemeManager.current, 'classic');
  assert.strictEqual(global.document.body.className, 'theme-classic');
});

runTest('28. Last-Move Highlighting: Normal, Capture & Castling', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  assert.deepStrictEqual(main.variables.lastMove, { from: '5_2', to: '5_4' });

  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' });
  assert.deepStrictEqual(main.variables.lastMove, { from: '4_7', to: '4_5' });

  main.variables.selectedpiece = '5_4'; main.methods.capture({ id: '4_5', name: 'b_pawn4' });
  assert.deepStrictEqual(main.variables.lastMove, { from: '5_4', to: '4_5' });
});

runTest('29. Last-Move Highlighting Preserved Across Undo and Redo', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });

  assert.deepStrictEqual(main.variables.lastMove, { from: '5_7', to: '5_5' });

  main.methods.undo();
  assert.deepStrictEqual(main.variables.lastMove, { from: '5_2', to: '5_4' });

  main.methods.redo();
  assert.deepStrictEqual(main.variables.lastMove, { from: '5_7', to: '5_5' });
});

runTest('30. Drag Manager: Interaction State & Cleanup', () => {
  DragManager.init();
  assert.strictEqual(DragManager.active, false);
  assert.strictEqual(DragManager.thresholdMet, false);

  DragManager.handlePointerDown({ clientX: 100, clientY: 100 }, dom.cells['5_2']);
  assert.strictEqual(DragManager.active, true);
  assert.strictEqual(DragManager.fromCellId, '5_2');

  DragManager.handlePointerUp({ clientX: 101, clientY: 101 });
  assert.strictEqual(DragManager.active, false);
});

// 31 - 40: Advanced Grid Layout, Click-to-Move, Drag-to-Move, and Flip Interactions
runTest('31. Board Grid Rendering & Coordinates', () => {
  main.methods.renderBoard();
  assert.ok(dom.gameHtml.includes('board-grid'));
  assert.ok(dom.gameHtml.includes('rank-label'));
  assert.ok(dom.gameHtml.includes('file-label'));
  assert.ok(dom.gameHtml.includes('1_1'));
  assert.ok(dom.gameHtml.includes('8_8'));
});

runTest('32. Click-to-Move: Select and Execute Move', () => {
  main.methods.selectPiece('5_2');
  assert.strictEqual(main.variables.selectedpiece, '5_2');
  assert.ok(main.variables.highlighted.includes('5_4'));

  main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.turn, 'b');
  assert.strictEqual(main.methods.getBoard()['5_4'], 'w_pawn5');
  assert.strictEqual(main.methods.getBoard()['5_2'], null);
});

runTest('33. Click-to-Move: Friendly Piece Selection Switch', () => {
  main.methods.selectPiece('5_2');
  assert.strictEqual(main.variables.selectedpiece, '5_2');

  // Switch selection to d2 pawn
  main.methods.clearSelection();
  main.methods.selectPiece('4_2');
  assert.strictEqual(main.variables.selectedpiece, '4_2');
  assert.ok(main.variables.highlighted.includes('4_4'));
});

runTest('34. Click-to-Move: Deselecting Selected Piece', () => {
  main.methods.selectPiece('5_2');
  assert.strictEqual(main.variables.selectedpiece, '5_2');

  main.methods.clearSelection();
  assert.strictEqual(main.variables.selectedpiece, '');
  assert.strictEqual(main.variables.highlighted.length, 0);
});

runTest('35. Click-to-Move: Pawn Promotion Flow', () => {
  // Move pawn to 7th rank
  main.variables.pieces['w_pawn5'].position = '5_7';
  main.methods.gamesetup();

  main.variables.selectedpiece = '5_7';
  let isCallbackCalled = false;
  main.methods.handlePromotion(main.variables.pieces['w_pawn5'], '5_8', (chosenType) => {
    isCallbackCalled = true;
    assert.strictEqual(chosenType, 'w_queen');
  });

  assert.strictEqual(main.variables.isPromoting, true);
  assert.ok(dom.promoHtml.includes('w_queen'));
});

runTest('36. Drag-and-Drop: Threshold Met Activates Ghost & Drag State', () => {
  DragManager.handlePointerDown({ clientX: 100, clientY: 100 }, dom.cells['5_2']);
  assert.strictEqual(DragManager.active, true);
  assert.strictEqual(DragManager.thresholdMet, false);

  // Move pointer > 6px
  DragManager.handlePointerMove({ clientX: 110, clientY: 110 });
  assert.strictEqual(DragManager.thresholdMet, true);
  assert.strictEqual(main.variables.selectedpiece, '5_2');

  DragManager.handlePointerUp({ clientX: 110, clientY: 110 });
  assert.strictEqual(DragManager.active, false);
  assert.strictEqual(DragManager.thresholdMet, false);
});

runTest('37. Drag-and-Drop: Illegal Drop Cleans Up State', () => {
  DragManager.handlePointerDown({ clientX: 100, clientY: 100 }, dom.cells['5_2']);
  DragManager.handlePointerMove({ clientX: 150, clientY: 150 });
  assert.strictEqual(DragManager.thresholdMet, true);

  // Drop on void/illegal
  DragManager.handlePointerUp({ clientX: 150, clientY: 150 });
  assert.strictEqual(main.variables.selectedpiece, '');
  assert.strictEqual(main.variables.highlighted.length, 0);
});

runTest('38. Click vs Drag Distinction: JustDropped Guard', () => {
  DragManager.thresholdMet = true;
  DragManager.handlePointerUp({ clientX: 200, clientY: 200 });

  assert.strictEqual(DragManager.justDropped, true);
});

runTest('39. Board Flip: Click-to-Move in Black Orientation', () => {
  main.methods.flipBoard();
  assert.strictEqual(main.variables.orientation, 'b');

  // White moves e4
  main.variables.selectedpiece = '5_2';
  main.methods.move({ id: '5_4' });
  assert.strictEqual(main.variables.turn, 'b');

  // Black moves e5 while board is flipped
  main.methods.selectPiece('5_7');
  assert.strictEqual(main.variables.selectedpiece, '5_7');
  assert.ok(main.variables.highlighted.includes('5_5'));

  main.methods.move({ id: '5_5' });
  assert.strictEqual(main.variables.turn, 'w');
  assert.strictEqual(main.methods.getBoard()['5_5'], 'b_pawn5');

  main.methods.flipBoard();
  assert.strictEqual(main.variables.orientation, 'w');
});

runTest('40. Board Flip: Coordinate Invariance Across Special Moves', () => {
  main.methods.flipBoard();

  // Scholar's Mate in Black Orientation
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' });
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' });
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '3_4' });
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' });
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '8_5' });
  main.variables.selectedpiece = '7_8'; main.methods.move({ id: '6_6' });
  main.variables.selectedpiece = '8_5'; main.methods.capture({ id: '6_7', name: 'b_pawn6' });

  assert.strictEqual(main.variables.gameOver, true);
  assert.strictEqual(dom.turnText, 'Checkmate! White wins!');

  main.methods.flipBoard();
  assert.strictEqual(main.variables.orientation, 'w');
});

runTest('41. Threatened Piece: Knight Threatening an Opponent Piece', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 1... d5
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // 2. Nf3
  main.variables.selectedpiece = '4_5'; main.methods.capture({ id: '5_4', name: 'w_pawn5' }); // 2... dxe4
  main.variables.selectedpiece = '6_3'; main.methods.move({ id: '7_5' }); // 3. Ng5

  // Now it's Black's turn: White Knight on g5 threatens Black Pawn on e4
  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(threatened.includes('5_4'), 'Black pawn on e4 must be marked as threatened by White Knight on g5');
});

runTest('42. Threatened Piece: Bishop Threatening an Opponent Piece', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '6_1'; main.methods.move({ id: '3_4' }); // 2. Bc4

  // It is Black's turn: White Bishop on c4 threatens Black Pawn on f7
  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(threatened.includes('6_7'), 'Black pawn on f7 must be threatened by White Bishop on c4');
});

runTest('43. Threatened Piece: Rook Threatening an Opponent Piece', () => {
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_4' }); // 1. a4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '1_1'; main.methods.move({ id: '1_3' }); // 2. Ra3
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' }); // 2... a6
  main.variables.selectedpiece = '1_3'; main.methods.move({ id: '5_3' }); // 3. Re3

  // It is Black's turn: White Rook on e3 threatens Black Pawn on e5
  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(threatened.includes('5_5'), 'Black pawn on e5 must be threatened by White Rook on e3');
});

runTest('44. Threatened Piece: Queen Threatening Multiple Pieces', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '8_5' }); // 2. Qh5

  // It is Black's turn: White Queen on h5 threatens both e5 pawn and f7 pawn
  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(threatened.includes('5_5'), 'Black pawn on e5 must be threatened by Queen on h5');
  assert.ok(threatened.includes('6_7'), 'Black pawn on f7 must be threatened by Queen on h5');
});

runTest('45. Threatened Piece: Pawn Threatening an Opponent Piece', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 1... d5

  // It is White's turn: Black pawn on d5 threatens White pawn on e4
  let whiteThreatened = main.methods.getThreatenedSquares('w');
  assert.ok(whiteThreatened.includes('5_4'), 'White pawn on e4 is threatened by Black pawn on d5');
});

runTest('46. Threatened Piece: Empty Attacked Squares Do NOT Glow Red', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4

  // On Black's turn, White pawn attacks d5 and f5, but both are empty
  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(!threatened.includes('4_5'), 'Empty square d5 must NOT be in threatened list');
  assert.ok(!threatened.includes('6_5'), 'Empty square f5 must NOT be in threatened list');
});

runTest('47. Threatened Piece: Pinned Enemy Piece Cannot Threaten (False Threat Pruning)', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '5_2' }); // 2. Qe2
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '5_7' }); // 2... Qe7
  main.variables.selectedpiece = '1_2'; main.methods.move({ id: '1_3' }); // 3. a3
  main.variables.selectedpiece = '1_7'; main.methods.move({ id: '1_6' }); // 3... a6
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_3' }); // 4. d3

  // Black pawn on e5 is pinned by White Queen on e2 to Black King on e8
  // Thus, Black pawn on e5 CANNOT legally capture White d3 pawn on d4
  let threatened = main.methods.getThreatenedSquares('w');
  assert.ok(!threatened.includes('4_3'), 'White pawn on d3 is NOT threatened by pinned Black pawn on e5');
});

runTest('48. Threatened Piece: King in Check Hierarchy', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '6_7'; main.methods.move({ id: '6_5' }); // 1... f5
  main.variables.selectedpiece = '4_1'; main.methods.move({ id: '8_5' }); // 2. Qh5+ (Check!)

  // Black King on e8 is in check
  let kingCell = main.methods.findKingCell('b', main.methods.getBoard());
  assert.strictEqual(kingCell, '5_8');
  assert.strictEqual(main.methods.isInCheck('b'), true);
  assert.ok(dom.cells['5_8'].classes.has('red'), 'King in check square must have red check highlight');
});

runTest('49. Threatened Piece: Moving or Capturing Clears Threat', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // 2. Nf3 (threatens e5)

  let threatenedBefore = main.methods.getThreatenedSquares('b');
  assert.ok(threatenedBefore.includes('5_5'), 'e5 is threatened');

  // Black defends by playing 2... Nc6
  main.variables.selectedpiece = '2_8'; main.methods.move({ id: '3_6' }); // 2... Nc6

  // Now White plays 3. a3 (e5 is still defended, but on White's turn check White's threats)
  let threatenedWhite = main.methods.getThreatenedSquares('w');
  assert.ok(!threatenedWhite.includes('6_3'), 'Nf3 is not threatened by Black');
});

runTest('50. Threatened Piece: Undo and Redo Restore Threat State', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // 2. Nf3 (threatens e5)

  assert.ok(main.methods.getThreatenedSquares('b').includes('5_5'));

  main.methods.undo(); // Undo 2. Nf3 -> back to White's turn
  assert.strictEqual(main.variables.turn, 'w');
  assert.ok(!main.methods.getThreatenedSquares('w').includes('7_1'));

  main.methods.redo(); // Redo 2. Nf3 -> back to Black's turn
  assert.strictEqual(main.variables.turn, 'b');
  assert.ok(main.methods.getThreatenedSquares('b').includes('5_5'), 'Threat on e5 restored on redo');
});

runTest('51. Threatened Piece: En Passant Threat Detection', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' }); // 1... h6
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' }); // 2. e5
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 2... d5 (En Passant available)

  // It is White's turn: White pawn on e5 can capture Black pawn on d5 via en passant
  // From Black's perspective or White's turn, Black pawn on d5 is under threat
  let whiteThreatsOnBlack = main.methods.getThreatenedSquares('w');
  // On White's turn, getThreatenedSquares('w') evaluates Black's threats on White
  let blackThreats = main.methods.getThreatenedSquares('b');
  assert.ok(blackThreats.includes('4_5'), 'Black pawn on d5 is under en-passant threat from White pawn on e5');
});

runTest('52. Threatened Piece: Board Flip Preserves Threat Detection', () => {
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '7_1'; main.methods.move({ id: '6_3' }); // 2. Nf3 (threatens e5)

  main.methods.flipBoard(); // Flip board to Black orientation
  assert.strictEqual(main.variables.orientation, 'b');

  let threatened = main.methods.getThreatenedSquares('b');
  assert.ok(threatened.includes('5_5'), 'Threatened coordinate 5_5 is invariant to visual flip');

  main.methods.flipBoard();
});

runTest('53. Threatened Piece: Theme Switching Preserves Threat Highlighting', () => {
  ThemeManager.apply('neon');
  assert.strictEqual(ThemeManager.current, 'neon');

  ThemeManager.apply('wood');
  assert.strictEqual(ThemeManager.current, 'wood');

  ThemeManager.apply('slate');
  assert.strictEqual(ThemeManager.current, 'slate');

  ThemeManager.apply('classic');
  assert.strictEqual(ThemeManager.current, 'classic');
});

runTest('54. Threatened Piece: Checkmate Threat State Cleanup', () => {
  // Fool's Mate
  main.variables.selectedpiece = '6_2'; main.methods.move({ id: '6_3' }); // 1. f3
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5
  main.variables.selectedpiece = '7_2'; main.methods.move({ id: '7_4' }); // 2. g4
  main.variables.selectedpiece = '4_8'; main.methods.move({ id: '8_4' }); // 2... Qh4#

  assert.strictEqual(main.variables.gameOver, true);
  let kingCell = main.methods.findKingCell('w', main.methods.getBoard());
  assert.strictEqual(kingCell, '5_1');
  assert.ok(dom.cells['5_1'].classes.has('red'), 'King in checkmate has red check highlight');
});

console.log('\n------------------------------------');
console.log('TOTAL PASSED: ' + passedTests);
console.log('TOTAL FAILED: ' + failedTests);
console.log('------------------------------------');

if (failedTests > 0) process.exit(1);

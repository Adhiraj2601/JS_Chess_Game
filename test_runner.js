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
    className: 'theme-wood'
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
          append: function() { return this; },
          find: function() {
            return {
              addClass: function() { return this; },
              removeClass: function() { return this; },
              length: 1
            };
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
    text: function(t) { if (t !== undefined) return this; return ''; },
    html: function(h) { if (h !== undefined) return this; return ''; },
    val: function() { return ''; },
    css: function() { return this; },
    fadeIn: function(d, cb) { if (cb) cb(); return this; },
    fadeOut: function(d, cb) { if (cb) cb(); return this; },
    hide: function() { return this; },
    show: function() { return this; },
    append: function() { return this; },
    find: function() { return this; },
    remove: function() { return this; },
    data: function() { return null; },
    closest: function() { return this; },
    length: 0
  };
};

const { main, ClockManager, AudioManager, DragManager, GameModeManager } = require('./script.js');
const UnoMode = require('./uno_mode.js');
GameModeManager.register('uno', UnoMode);
const PotholeMode = require('./pothole_mode.js');
GameModeManager.register('pothole', PotholeMode);

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

console.log('=== CHESS ADVANCED COMPREHENSIVE TEST SUITE (71 TESTS) ===\n');

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

runTest('27. Theme System: Permanent Wood Theme Loaded at Startup', () => {
  assert.strictEqual(global.document.body.className, 'theme-wood');
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

runTest('53. Move Selection Highlighting: Legal Moves Green and Capture Targets Red', () => {
  // 1. d4 e5
  main.variables.selectedpiece = '4_2'; main.methods.move({ id: '4_4' }); // 1. d4
  main.variables.selectedpiece = '5_7'; main.methods.move({ id: '5_5' }); // 1... e5

  // Before selection: verify no passive threat outlines are applied
  main.methods.updateVisualHighlights();
  assert.ok(!dom.cells['4_4'].classes.has('threatened-piece'), 'White pawn has no passive red outline');
  assert.ok(!dom.cells['5_5'].classes.has('threatened-piece'), 'Black pawn has no passive red outline');

  // White selects pawn on d4 (4_4)
  main.methods.selectPiece('4_4');
  assert.ok(dom.cells['4_4'].classes.has('yellow'), 'Selected piece on d4 has yellow highlight');
  assert.ok(dom.cells['4_5'].classes.has('green'), 'Quiet legal move to d5 has green highlight');
  assert.ok(dom.cells['5_5'].classes.has('red'), 'Capture target e5 (black pawn) has red highlight');

  // Test En Passant capture highlighting
  main.methods.resetGame();
  main.variables.selectedpiece = '5_2'; main.methods.move({ id: '5_4' }); // 1. e4
  main.variables.selectedpiece = '8_7'; main.methods.move({ id: '8_6' }); // 1... h6
  main.variables.selectedpiece = '5_4'; main.methods.move({ id: '5_5' }); // 2. e5
  main.variables.selectedpiece = '4_7'; main.methods.move({ id: '4_5' }); // 2... d5

  main.methods.selectPiece('5_5'); // Select e5 pawn
  assert.ok(dom.cells['4_6'].classes.has('red'), 'En passant capture destination d6 has red highlight');

  main.methods.clearSelection();
  assert.ok(!dom.cells['4_6'].classes.has('red'), 'Clearing selection removes red capture highlight');
  assert.ok(!dom.cells['5_5'].classes.has('yellow'), 'Clearing selection removes yellow highlight');
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

// ==========================================================
// 55 - 66: CHESS UNO MODE TEST SUITE
// ==========================================================
runTest('55. Chess UNO: Deck Generation (108 cards with correct distribution)', () => {
  let deck = UnoMode.buildDeck();
  assert.strictEqual(deck.length, 108);
  assert.strictEqual(deck.filter(c => c.type === 'number').length, 76);
  assert.strictEqual(deck.filter(c => c.value === 0).length, 4);
  assert.strictEqual(deck.filter(c => c.type === 'skip').length, 8);
  assert.strictEqual(deck.filter(c => c.type === 'reverse').length, 8);
  assert.strictEqual(deck.filter(c => c.type === 'drawTwo').length, 8);
  assert.strictEqual(deck.filter(c => c.type === 'wild').length, 4);
  assert.strictEqual(deck.filter(c => c.type === 'wildDrawFour').length, 4);
});

runTest('56. Chess UNO: Initial Deal & Max Hand Size Cap (5)', () => {
  UnoMode.startNewGame();
  assert.strictEqual(UnoMode.state.hands.w.length, 3);
  assert.strictEqual(UnoMode.state.hands.b.length, 3);
  assert.strictEqual(UnoMode.state.deck.length, 102);

  UnoMode.drawCard('w');
  UnoMode.drawCard('w');
  assert.strictEqual(UnoMode.state.hands.w.length, 5);

  let blocked = UnoMode.drawCard('w');
  assert.strictEqual(blocked, null);
  assert.strictEqual(UnoMode.state.hands.w.length, 5);
});

runTest('57. Chess UNO: Number Card Grants Energy with 20 Cap', () => {
  UnoMode.startNewGame();
  main.variables.turn = 'w';
  UnoMode.state.hands.w = [
    { id: 'c_test_8', color: 'green', type: 'number', value: 8, label: '8', title: 'Number 8' }
  ];
  UnoMode.state.energy.w = 0;

  UnoMode.playCard('c_test_8', 'w');
  assert.strictEqual(UnoMode.state.energy.w, 8);
  assert.strictEqual(UnoMode.state.hands.w.length, 0);
  assert.strictEqual(UnoMode.state.discardPile.length, 1);

  UnoMode.addEnergy('w', 15);
  assert.strictEqual(UnoMode.state.energy.w, 20);
});

runTest('58. Chess UNO: Spending Energy (Draw 6E & Recycle 3E)', () => {
  UnoMode.startNewGame();
  main.variables.turn = 'w';
  UnoMode.state.energy.w = 9;
  UnoMode.state.hands.w = [
    { id: 'c_recycle', color: 'red', type: 'number', value: 2, label: '2', title: 'Card 2' }
  ];

  let drawn = UnoMode.spendEnergy('draw_card', 'w');
  assert.strictEqual(drawn, true);
  assert.strictEqual(UnoMode.state.energy.w, 3);
  assert.strictEqual(UnoMode.state.hands.w.length, 2);

  let recycleStarted = UnoMode.spendEnergy('recycle', 'w');
  assert.strictEqual(recycleStarted, true);
  UnoMode.executeRecycleCard('c_recycle', 'w');
  assert.strictEqual(UnoMode.state.energy.w, 3);
  assert.strictEqual(UnoMode.state.hands.w.length, 2);
});

runTest('59. Chess UNO: Auto-Draw Every 3 Turns', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  UnoMode.state.hands.w = [];
  UnoMode.state.hands.b = [];

  UnoMode.onTurnEnd('w', 'b');
  assert.strictEqual(UnoMode.state.hands.w.length, 0);
  UnoMode.onTurnEnd('b', 'w');
  assert.strictEqual(UnoMode.state.hands.b.length, 0);
  UnoMode.onTurnEnd('w', 'b');
  assert.strictEqual(UnoMode.state.hands.w.length, 1);
});

runTest('60. Chess UNO: Reshuffle Discard Pile on Empty Deck', () => {
  UnoMode.startNewGame();
  UnoMode.state.deck = [];
  UnoMode.state.discardPile = [
    { id: 'cd1', color: 'blue', type: 'number', value: 5, label: '5', title: 'Card 5' },
    { id: 'cd2', color: 'yellow', type: 'number', value: 6, label: '6', title: 'Card 6' }
  ];

  let drawn = UnoMode.drawCard('w');
  assert.notStrictEqual(drawn, null);
  assert.strictEqual(UnoMode.state.deck.length, 1);
});

runTest('61. Chess UNO: Skip Card (Immune King, Freezes Enemy Piece, Turn Expiration)', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  main.variables.turn = 'w';

  UnoMode.setPendingEffect({ type: 'skip', card: {}, cardIdx: 0, color: 'w' });
  UnoMode.executeSkipOnPiece('5_8', 'b_king');
  assert.strictEqual(UnoMode.state.skippedPiece, null);

  UnoMode.state.hands.w = [{ id: 'c_sk', type: 'skip', color: 'red', label: '⊘', title: 'Skip' }];
  UnoMode.initiateSkipCard(UnoMode.state.hands.w[0], 'w', 0);
  UnoMode.executeSkipOnPiece('2_8', 'b_knight1');
  assert.strictEqual(UnoMode.state.skippedPiece.pieceKey, 'b_knight1');

  main.variables.turn = 'b';
  let moves = main.methods.getLegalMoves('b_knight1');
  assert.strictEqual(moves.length, 0);

  UnoMode.onTurnEnd('b', 'w');
  assert.strictEqual(UnoMode.state.skippedPiece, null);
});

runTest('62. Chess UNO: Reverse Card Swaps Friendly Pieces without Leaving King in Check', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  main.variables.turn = 'w';

  UnoMode.state.hands.w = [{ id: 'c_rev', type: 'reverse', color: 'blue', label: '⇄', title: 'Reverse' }];
  UnoMode.initiateReverseCard(UnoMode.state.hands.w[0], 'w', 0);

  UnoMode.handleReverseSelection('1_1', 'w_rook1');
  UnoMode.handleReverseSelection('2_1', 'w_knight1');

  assert.strictEqual(main.variables.pieces['w_rook1'].position, '2_1');
  assert.strictEqual(main.variables.pieces['w_knight1'].position, '1_1');
  assert.strictEqual(UnoMode.state.cardPlayedThisTurn, true);
});

runTest('63. Chess UNO: Draw Two Revives Friendly Pawn to Starting File', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  main.variables.turn = 'w';

  main.variables.pieces['w_pawn4'].captured = true;
  main.variables.pieces['w_pawn4'].position = '';
  $('#4_2').html('&nbsp;').attr('chess', 'null');
  UnoMode.state.graveyard.w.push({ key: 'w_pawn4', type: 'w_pawn', img: '&#9817;' });

  UnoMode.state.hands.w = [{ id: 'c_dt', type: 'drawTwo', color: 'yellow', label: '+2', title: 'Draw Two' }];
  UnoMode.executeDrawTwoCard(UnoMode.state.hands.w[0], 'w', 0);

  assert.strictEqual(main.variables.pieces['w_pawn4'].captured, false);
  assert.strictEqual(main.variables.pieces['w_pawn4'].position, '4_2');
  assert.strictEqual(UnoMode.state.graveyard.w.length, 0);
});

runTest('64. Chess UNO: Wild Draw Four Revives Captured Queen', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  main.variables.turn = 'w';

  main.variables.pieces['w_queen'].captured = true;
  main.variables.pieces['w_queen'].position = '';
  UnoMode.state.graveyard.w.push({ key: 'w_queen', type: 'w_queen', img: '&#9813;' });

  UnoMode.state.hands.w = [{ id: 'c_w4', type: 'wildDrawFour', color: 'wild', label: '★+4', title: 'Wild Draw Four' }];
  UnoMode.setPendingEffect({
    type: 'wildDrawFour',
    step: 2,
    card: UnoMode.state.hands.w[0],
    cardIdx: 0,
    color: 'w',
    revivePiece: UnoMode.state.graveyard.w[0],
    graveIdx: 0
  });

  UnoMode.executeWildDrawFourPlacement('4_4');
  assert.strictEqual(main.variables.pieces['w_queen'].captured, false);
  assert.strictEqual(main.variables.pieces['w_queen'].position, '4_4');
  assert.strictEqual(UnoMode.state.graveyard.w.length, 0);
});

runTest('65. Chess UNO: Snapshots (Undo/Redo State Fidelity)', () => {
  GameModeManager.setMode('uno');
  UnoMode.startNewGame();
  main.variables.turn = 'w';
  UnoMode.state.energy.w = 12;
  UnoMode.state.hands.w = [{ id: 'snap_card', color: 'red', type: 'number', value: 5, label: '5', title: 'Card 5' }];

  let snap = main.methods.createSnapshot();
  assert.ok(snap.modeSnapshot);
  assert.strictEqual(snap.modeSnapshot.energy.w, 12);

  UnoMode.state.energy.w = 2;
  UnoMode.state.hands.w = [];

  main.methods.restoreSnapshot(snap);
  assert.strictEqual(UnoMode.state.energy.w, 12);
  assert.strictEqual(UnoMode.state.hands.w.length, 1);
  assert.strictEqual(UnoMode.state.hands.w[0].id, 'snap_card');
});

runTest('66. Standard Chess Mode: Zero Card Interference', () => {
  GameModeManager.setMode('standard');
  assert.strictEqual(GameModeManager.activeMode, 'standard');
  let moves = main.methods.getLegalMoves('w_knight1');
  assert.strictEqual(moves.length, 2);
});

// ==========================================================
// 67 - 71: HELP & ONBOARDING SYSTEM TESTS
// ==========================================================
runTest('67. Chess UNO: Help Modal & Tab Navigation (6 Tabs)', () => {
  UnoMode.help.open('overview');
  assert.ok(UnoMode.help, 'Help controller exists');

  // Verify all 6 tabs can be switched
  const tabs = ['overview', 'turnflow', 'cards', 'energy', 'graveyard', 'faq'];
  tabs.forEach(tab => {
    UnoMode.help.switchTab(tab);
  });

  UnoMode.help.close();
});

runTest('68. Chess UNO: Interactive Tutorial (7 Step Guided Tour)', () => {
  UnoMode.tutorial.start(true);
  assert.strictEqual(UnoMode.tutorial.active, true);
  assert.strictEqual(UnoMode.tutorial.currentStep, 0);
  assert.strictEqual(UnoMode.tutorial.steps.length, 7);

  // Step through each of the 7 steps
  for (let i = 0; i < 6; i++) {
    UnoMode.tutorial.next();
    assert.strictEqual(UnoMode.tutorial.currentStep, i + 1);
  }

  // Stepping back
  UnoMode.tutorial.prev();
  assert.strictEqual(UnoMode.tutorial.currentStep, 5);

  // Finishing
  UnoMode.tutorial.finish();
  assert.strictEqual(UnoMode.tutorial.active, false);
  assert.strictEqual(storage['chess_uno_tutorial_seen'], 'true');
});

runTest('69. Chess UNO: Tutorial Skip Updates LocalStorage', () => {
  storage['chess_uno_tutorial_seen'] = 'false';
  UnoMode.tutorial.start(true);
  assert.strictEqual(UnoMode.tutorial.active, true);

  UnoMode.tutorial.skip();
  assert.strictEqual(UnoMode.tutorial.active, false);
  assert.strictEqual(storage['chess_uno_tutorial_seen'], 'true');
});

runTest('70. Chess UNO: Replay Tutorial Trigger', () => {
  storage['chess_uno_tutorial_seen'] = 'true';
  // Force start via replay
  UnoMode.tutorial.start(true);
  assert.strictEqual(UnoMode.tutorial.active, true);
  assert.strictEqual(UnoMode.tutorial.currentStep, 0);
  UnoMode.tutorial.finish();
});

runTest('71. Chess UNO: First-Time Auto-Trigger Guard', () => {
  storage['chess_uno_tutorial_seen'] = 'true';
  // Normal start without force should not activate if already seen
  UnoMode.tutorial.start(false);
  assert.strictEqual(UnoMode.tutorial.active, false);
});

// ==========================================================
// POTHOLE CHESS MODE TESTS (R1–R11)
// ==========================================================

runTest('72. Pothole Chess: Mode Activation & Plugin Registration', () => {
  GameModeManager.setMode('pothole');
  assert.strictEqual(GameModeManager.activeMode, 'pothole');
  assert.strictEqual(PotholeMode.state.active, true);
  assert.strictEqual(PotholeMode.config.DIE_SIDES, 8);
  assert.strictEqual(PotholeMode.config.PLACE_ON, 'even');
  GameModeManager.setMode('standard');
});

runTest('73. Pothole Chess: R2 Gate Roll (Even places, Odd places nothing)', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Odd gate roll (e.g. 3) -> Places nothing
  PotholeMode.onTurnStart('w', { gate: 3 });
  assert.strictEqual(PotholeMode.state.potholes.length, 0);
  assert.strictEqual(PotholeMode.state.lastRoll.placed, false);
  assert.strictEqual(PotholeMode.state.lastRoll.gate, 3);

  // Even gate roll (e.g. 4) -> Places pothole on specified square (rank 4, file 5 = e4)
  PotholeMode.onTurnStart('w', { gate: 4, rank: 4, file: 5 });
  assert.strictEqual(PotholeMode.state.potholes.length, 1);
  assert.strictEqual(PotholeMode.state.lastRoll.placed, true);
  assert.strictEqual(PotholeMode.state.potholes[0].square, 'e4');
  assert.strictEqual(PotholeMode.state.potholes[0].cellId, '5_4');
  assert.strictEqual(PotholeMode.state.potholes[0].owner, 'w');

  GameModeManager.setMode('standard');
});

runTest('74. Pothole Chess: R3 Square Selection (Rank 1-8, File 1-8 to Coords)', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Test corners: (rank 1, file 1 = a1)
  PotholeMode.onTurnStart('w', { gate: 2, rank: 1, file: 1 });
  assert.strictEqual(PotholeMode.state.potholes[0].square, 'a1');
  assert.strictEqual(PotholeMode.state.potholes[0].cellId, '1_1');

  // Test (rank 8, file 8 = h8)
  PotholeMode.onTurnStart('w', { gate: 6, rank: 8, file: 8 });
  let h8Pothole = PotholeMode.state.potholes.find(p => p.square === 'h8');
  assert(h8Pothole, 'h8 pothole should exist');
  assert.strictEqual(h8Pothole.cellId, '8_8');

  GameModeManager.setMode('standard');
});

runTest('75. Pothole Chess: R4 & R5 Ownership Lifetime (Owner is Timer, Max 2 Potholes)', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Turn 1 (White): White rolls even (4) and places W1 on e4 (5_4)
  PotholeMode.onTurnStart('w', { gate: 4, rank: 4, file: 5 });
  assert.strictEqual(PotholeMode.state.potholes.length, 1);
  assert.strictEqual(PotholeMode.state.potholes[0].square, 'e4');
  assert.strictEqual(PotholeMode.state.potholes[0].owner, 'w');

  // Turn 1 completes: White ends turn -> next is Black
  // White removes all potholes owned by OPPONENT (Black). W1 is owned by White, so W1 remains!
  PotholeMode.onTurnEnd('w', 'b');
  assert.strictEqual(PotholeMode.state.potholes.length, 1, 'W1 must survive White turn completion');

  // Turn 2 (Black): Black rolls even (2) and places B1 on d5 (4_5)
  PotholeMode.onTurnStart('b', { gate: 2, rank: 5, file: 4 });
  assert.strictEqual(PotholeMode.state.potholes.length, 2, 'Max 2 active potholes concurrently');
  assert.strictEqual(PotholeMode.state.potholes.some(p => p.square === 'e4' && p.owner === 'w'), true);
  assert.strictEqual(PotholeMode.state.potholes.some(p => p.square === 'd5' && p.owner === 'b'), true);

  // Turn 2 completes: Black ends turn -> next is White
  // Black removes all potholes owned by OPPONENT (White). W1 is removed! B1 remains!
  PotholeMode.onTurnEnd('b', 'w');
  assert.strictEqual(PotholeMode.state.potholes.length, 1, 'W1 must be removed at end of opponent Black turn');
  assert.strictEqual(PotholeMode.state.potholes[0].square, 'd5');
  assert.strictEqual(PotholeMode.state.potholes[0].owner, 'b');

  // Turn 3 (White): White rolls odd (1) -> places nothing
  PotholeMode.onTurnStart('w', { gate: 1 });
  assert.strictEqual(PotholeMode.state.potholes.length, 1, 'B1 still active during White turn');

  // Turn 3 completes: White ends turn -> next is Black
  // White removes all potholes owned by OPPONENT (Black). B1 is removed!
  PotholeMode.onTurnEnd('w', 'b');
  assert.strictEqual(PotholeMode.state.potholes.length, 0, 'B1 must be removed at end of opponent White turn');

  GameModeManager.setMode('standard');
});

runTest('76. Pothole Chess: R6 Non-King Piece Falls Through Board and is Removed', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Square 4_2 holds White Pawn 4 (d2) in starting position
  let d2PieceBefore = main.variables.pieces['w_pawn4'];
  assert.strictEqual(d2PieceBefore.captured, false);
  assert.strictEqual(d2PieceBefore.position, '4_2');

  // White rolls even (6) landing on d2 (rank 2, file 4)
  PotholeMode.onTurnStart('w', { gate: 6, rank: 2, file: 4 });

  // Piece must fall through board and be removed from the game!
  let d2PieceAfter = main.variables.pieces['w_pawn4'];
  assert.strictEqual(d2PieceAfter.captured, true, 'Swallowed piece must have captured: true');
  assert.strictEqual(d2PieceAfter.position, null, 'Swallowed piece must have position: null');
  assert.strictEqual(PotholeMode.state.lastRoll.fell.key, 'w_pawn4');

  GameModeManager.setMode('standard');
});

runTest('77. Pothole Chess: R7 Potholes Block Landing and Passing Through (Sliding & Knights)', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Clear path for White Queen on d1 (4_1) by removing pawn on d2
  main.variables.pieces['w_pawn4'].captured = true;
  main.variables.pieces['w_pawn4'].position = null;
  $('#4_2').attr('chess', 'null');

  // Place pothole on d4 (4_4)
  PotholeMode.onTurnStart('w', { gate: 4, rank: 4, file: 4 });
  PotholeMode.state.isRolling = false;
  assert.strictEqual(GameModeManager.isPothole('4_4'), true);

  // Queen pseudo moves along d-file: d2 (4_2), d3 (4_3) are legal; d4 (4_4) is pothole and blocks!
  let qMoves = main.methods.getPseudoMoves('w_queen');
  assert(qMoves.includes('4_2'), 'Queen can move to d2');
  assert(qMoves.includes('4_3'), 'Queen can move to d3');
  assert(!qMoves.includes('4_4'), 'Queen CANNOT land on pothole d4');
  assert(!qMoves.includes('4_5'), 'Queen CANNOT pass through pothole d4 to d5');
  assert(!qMoves.includes('4_6'), 'Queen CANNOT pass through pothole d4 to d6');

  // Knight jump test: Place pothole on f3 (6_3).
  // Knight on g1 (7_1) normally jumps to f3 (6_3) and h3 (8_3).
  let bKnightMovesBefore = main.methods.getPseudoMoves('w_knight2');
  assert(bKnightMovesBefore.includes('6_3'), 'Knight can normally reach f3');

  PotholeMode.state.potholes.push({ square: 'f3', cellId: '6_3', owner: 'b' });
  let bKnightMovesAfter = main.methods.getPseudoMoves('w_knight2');
  assert(!bKnightMovesAfter.includes('6_3'), 'Knight cannot land on pothole f3');
  assert(bKnightMovesAfter.includes('8_3'), 'Knight can still reach h3');

  GameModeManager.setMode('standard');
});

runTest('78. Pothole Chess: R7 Castling & Pawn Pushes Blocked by Pothole', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();
  PotholeMode.state.isRolling = false;

  // Pawn push e2 -> e4: if e3 (5_3) is a pothole, both single and double push blocked
  PotholeMode.state.potholes.push({ square: 'e3', cellId: '5_3', owner: 'b' });
  let pawnMoves = main.methods.getPseudoMoves('w_pawn5');
  assert(!pawnMoves.includes('5_3'), 'Pawn single push blocked by pothole on e3');
  assert(!pawnMoves.includes('5_4'), 'Pawn double push blocked when crossing pothole on e3');

  // Castling: Clear f1 and g1 for Kingside castling
  PotholeMode.resetState();
  PotholeMode.state.isRolling = false;
  main.variables.pieces['w_bishop2'].captured = true;
  main.variables.pieces['w_bishop2'].position = null;
  $('#6_1').attr('chess', 'null');
  main.variables.pieces['w_knight2'].captured = true;
  main.variables.pieces['w_knight2'].position = null;
  $('#7_1').attr('chess', 'null');

  let kingMovesClear = main.methods.getPseudoMoves('w_king');
  assert(kingMovesClear.includes('7_1_castleKS'), 'Kingside castle should be legal when path is clear');

  // Place pothole on transit square f1 (6_1)
  PotholeMode.state.potholes.push({ square: 'f1', cellId: '6_1', owner: 'b' });
  let kingMovesBlocked = main.methods.getPseudoMoves('w_king');
  assert(!kingMovesBlocked.includes('7_1_castleKS'), 'Castling illegal when transit square is a pothole');

  GameModeManager.setMode('standard');
});

runTest('79. Pothole Chess: R7 Attack Ray Blocked by Pothole Stops Check', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();
  PotholeMode.state.isRolling = false;

  // Clear e-file completely between White King on e1 (5_1) and Black King on e8 (5_8)
  main.variables.pieces['w_pawn5'].captured = true;
  main.variables.pieces['w_pawn5'].position = null;
  $('#5_2').attr('chess', 'null');
  main.variables.pieces['b_pawn5'].captured = true;
  main.variables.pieces['b_pawn5'].position = null;
  $('#5_7').attr('chess', 'null');

  // Place Black Rook on e5 (5_5)
  main.variables.pieces['b_rook1'].position = '5_5';
  main.variables.pieces['b_rook1'].captured = false;
  $('#5_5').attr('chess', 'b_rook1');
  $('#1_8').attr('chess', 'null');

  // Without pothole: Black Rook on e5 directly attacks White King on e1 (Check!)
  assert.strictEqual(main.methods.isInCheck('w'), true, 'White King should be in check from Black Rook on e5');

  // Place pothole on e3 (5_3) between Rook (5_5) and King (5_1)
  PotholeMode.state.potholes.push({ square: 'e3', cellId: '5_3', owner: 'w' });

  // Attack ray must be blocked by the pothole at e3: White King is NO LONGER in check!
  assert.strictEqual(main.methods.isInCheck('w'), false, 'Pothole blocks attack ray, preventing check');

  GameModeManager.setMode('standard');
});

runTest('80. Pothole Chess: R8 Overlap Transfer (Rolling onto active pothole transfers ownership)', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // White places pothole on c4 (3_4)
  PotholeMode.onTurnStart('w', { gate: 4, rank: 4, file: 3 });
  assert.strictEqual(PotholeMode.state.potholes.length, 1);
  assert.strictEqual(PotholeMode.state.potholes[0].owner, 'w');

  // Black rolls same square c4 (3_4)
  PotholeMode.onTurnStart('b', { gate: 2, rank: 4, file: 3 });
  assert.strictEqual(PotholeMode.state.potholes.length, 1, 'Still only one pothole on square');
  assert.strictEqual(PotholeMode.state.potholes[0].owner, 'b', 'Ownership transferred to Black');
  assert.strictEqual(PotholeMode.state.lastRoll.isOverlap, true);

  GameModeManager.setMode('standard');
});

runTest('81. Pothole Chess: R9 King Never Falls; Standing King is Frozen', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // White King is at e1 (5_1). Roll lands on e1!
  PotholeMode.onTurnStart('w', { gate: 4, rank: 1, file: 5 });
  PotholeMode.state.isRolling = false; // Dice roll finished

  let king = main.variables.pieces['w_king'];
  assert.strictEqual(king.captured, false, 'King NEVER falls through board');
  assert.strictEqual(king.position, '5_1', 'King remains on the board');
  assert.strictEqual(PotholeMode.isKingFrozen('w'), true, 'White King is frozen');

  // Frozen King has 0 moves (cannot step, cannot capture, cannot castle)
  let kingMoves = main.methods.getLegalMoves('w_king');
  assert.strictEqual(kingMoves.length, 0, 'Frozen king has 0 legal moves');

  // Other pieces can still move normally
  let knightMoves = main.methods.getLegalMoves('w_knight1');
  assert(knightMoves.length > 0, 'Non-king pieces can move normally while king is frozen');

  GameModeManager.setMode('standard');
});

runTest('82. Pothole Chess: R10 True Checkmate with Frozen King', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();
  PotholeMode.state.isRolling = false;

  // White King at e1 (5_1) is frozen
  PotholeMode.state.potholes.push({ square: 'e1', cellId: '5_1', owner: 'w' });
  assert.strictEqual(PotholeMode.isKingFrozen('w'), true);

  // Clear e-file pawns
  main.variables.pieces['w_pawn5'].captured = true;
  main.variables.pieces['w_pawn5'].position = null;
  $('#5_2').attr('chess', 'null');
  main.variables.pieces['b_pawn5'].captured = true;
  main.variables.pieces['b_pawn5'].position = null;
  $('#5_7').attr('chess', 'null');

  // Place Black Queen on e2 (5_2), supported by Black Rook on e8 (5_8)
  main.variables.pieces['b_queen'].position = '5_2';
  main.variables.pieces['b_queen'].captured = false;
  $('#5_2').attr('chess', 'b_queen');
  $('#4_8').attr('chess', 'null');

  main.variables.pieces['b_rook1'].position = '5_8';
  main.variables.pieces['b_rook1'].captured = false;
  $('#5_8').attr('chess', 'b_rook1');
  $('#1_8').attr('chess', 'null');

  // Remove other white pieces that could capture on e2
  ['w_queen', 'w_bishop1', 'w_bishop2', 'w_knight1', 'w_knight2', 'w_pawn4', 'w_pawn6'].forEach(k => {
    let p = main.variables.pieces[k];
    if (p.position) $('#' + p.position).attr('chess', 'null');
    p.captured = true;
    p.position = null;
  });

  // White King is in check, frozen (cannot capture Queen or escape), and no other piece can block/capture
  assert.strictEqual(main.methods.isInCheck('w'), true);
  assert.strictEqual(main.methods.hasAnyLegalMoves('w'), false);

  GameModeManager.setMode('standard');
});

runTest('83. Pothole Chess: R11 Stalemate Detection with Frozen King', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  // Freeze White King at e1 (5_1)
  PotholeMode.state.potholes.push({ square: 'e1', cellId: '5_1', owner: 'w' });

  // Remove ALL other White pieces from the board
  Object.keys(main.variables.pieces).forEach(key => {
    if (key.startsWith('w_') && key !== 'w_king') {
      main.variables.pieces[key].captured = true;
      main.variables.pieces[key].position = null;
    }
  });

  // Not in check!
  assert.strictEqual(main.methods.isInCheck('w'), false);
  // King has 0 moves and no other pieces exist -> 0 legal moves total!
  assert.strictEqual(main.methods.hasAnyLegalMoves('w'), false);

  GameModeManager.setMode('standard');
});

runTest('84. Pothole Chess: Undo / Redo Snapshot Preservation', () => {
  GameModeManager.setMode('pothole');
  PotholeMode.resetState();

  PotholeMode.state.potholes = [
    { square: 'e4', cellId: '5_4', owner: 'w' },
    { square: 'c6', cellId: '3_6', owner: 'b' }
  ];
  PotholeMode.state.turnCount = 5;

  let snap = PotholeMode.createSnapshot();
  assert.strictEqual(snap.potholes.length, 2);
  assert.strictEqual(snap.turnCount, 5);

  // Mutate state
  PotholeMode.resetState();
  assert.strictEqual(PotholeMode.state.potholes.length, 0);

  // Restore snapshot
  PotholeMode.restoreSnapshot(snap);
  assert.strictEqual(PotholeMode.state.potholes.length, 2);
  assert.strictEqual(PotholeMode.state.potholes[0].square, 'e4');
  assert.strictEqual(PotholeMode.state.potholes[1].square, 'c6');
  assert.strictEqual(PotholeMode.state.turnCount, 5);

  GameModeManager.setMode('standard');
});

runTest('85. Classic Chess Regression Check (Clean Separation)', () => {
  GameModeManager.setMode('standard');
  assert.strictEqual(GameModeManager.activeMode, 'standard');
  assert.strictEqual(GameModeManager.isPothole('5_4'), false);
  assert.strictEqual(GameModeManager.isKingFrozen('w'), false);
  assert.strictEqual(GameModeManager.isActionBlocked(), false);

  // Standard move generation works normally
  let e2Moves = main.methods.getLegalMoves('w_pawn5');
  assert(e2Moves.includes('5_3'), 'Standard e2-e3');
  assert(e2Moves.includes('5_4'), 'Standard e2-e4');
});

runTest('86. Pothole Chess: Interactive Tutorial (7 Step Guided Tour)', () => {
  PotholeMode.tutorial.start(true);
  assert.strictEqual(PotholeMode.tutorial.active, true);
  assert.strictEqual(PotholeMode.tutorial.currentStep, 0);
  assert.strictEqual(PotholeMode.tutorial.steps.length, 7);

  // Step through each of the 7 steps
  for (let i = 0; i < 6; i++) {
    PotholeMode.tutorial.next();
    assert.strictEqual(PotholeMode.tutorial.currentStep, i + 1);
  }

  // Stepping back
  PotholeMode.tutorial.prev();
  assert.strictEqual(PotholeMode.tutorial.currentStep, 5);

  // Finishing
  PotholeMode.tutorial.finish();
  assert.strictEqual(PotholeMode.tutorial.active, false);
  assert.strictEqual(storage['chess_pothole_tutorial_seen'], 'true');
});

runTest('87. Pothole Chess: Tutorial Skip Updates LocalStorage', () => {
  storage['chess_pothole_tutorial_seen'] = 'false';
  PotholeMode.tutorial.start(true);
  assert.strictEqual(PotholeMode.tutorial.active, true);

  PotholeMode.tutorial.skip();
  assert.strictEqual(PotholeMode.tutorial.active, false);
  assert.strictEqual(storage['chess_pothole_tutorial_seen'], 'true');
});

runTest('88. Pothole Chess: Replay Tutorial Trigger', () => {
  storage['chess_pothole_tutorial_seen'] = 'true';
  // Force start via replay
  PotholeMode.tutorial.start(true);
  assert.strictEqual(PotholeMode.tutorial.active, true);
  assert.strictEqual(PotholeMode.tutorial.currentStep, 0);
  PotholeMode.tutorial.finish();
});

runTest('89. Pothole Chess: First-Time Auto-Trigger Guard', () => {
  storage['chess_pothole_tutorial_seen'] = 'true';
  // Normal start without force should not activate if already seen
  PotholeMode.tutorial.start(false);
  assert.strictEqual(PotholeMode.tutorial.active, false);
});

runTest('90. Pothole Chess: Tutorial Prompt Card Preferences', () => {
  storage['chess_pothole_tutorial_prompt_seen'] = 'false';
  let dummyCard = {
    find: (sel) => ({
      is: (state) => state === ':checked'
    }),
    remove: () => {}
  };
  PotholeMode._handleTutorialDismiss(dummyCard);
  assert.strictEqual(storage['chess_pothole_tutorial_prompt_seen'], 'true');
});

console.log('\n------------------------------------');
console.log('TOTAL PASSED: ' + passedTests);
console.log('TOTAL FAILED: ' + failedTests);
console.log('------------------------------------');

if (failedTests > 0) process.exit(1);


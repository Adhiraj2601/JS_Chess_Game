// ==========================================================
// AUDIO MANAGER (Web Audio API - Zero External Dependencies)
// ==========================================================
const AudioManager = {
  ctx: null,
  enabled: true,

  init: function () {
    let saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('chess_sound') : null;
    this.enabled = saved !== null ? saved === 'true' : true;
    this.updateToggleUI();
  },

  _getAudioContext: function () {
    if (!this.ctx && (typeof window !== 'undefined')) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  playTone: function (freq, type, duration, gainLevel, startTimeOffset = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffset);

      gain.gain.setValueAtTime(gainLevel, ctx.currentTime + startTimeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTimeOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTimeOffset);
      osc.stop(ctx.currentTime + startTimeOffset + duration);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  },

  playMove: function () {
    this.playTone(320, 'triangle', 0.08, 0.25);
  },

  playCapture: function () {
    this.playTone(180, 'sine', 0.12, 0.4);
    this.playTone(120, 'triangle', 0.15, 0.35, 0.02);
  },

  playCheck: function () {
    this.playTone(550, 'sine', 0.1, 0.3);
    this.playTone(880, 'sine', 0.15, 0.35, 0.08);
  },

  playCastle: function () {
    this.playTone(300, 'triangle', 0.09, 0.25);
    this.playTone(420, 'triangle', 0.12, 0.3, 0.08);
  },

  playGameOver: function () {
    this.playTone(523.25, 'sine', 0.18, 0.3, 0);
    this.playTone(440.00, 'sine', 0.18, 0.3, 0.15);
    this.playTone(349.23, 'sine', 0.35, 0.35, 0.30);
  },

  playTimeout: function () {
    this.playTone(220, 'sawtooth', 0.2, 0.35, 0);
    this.playTone(180, 'sawtooth', 0.3, 0.4, 0.2);
  },

  toggleSound: function () {
    this.enabled = !this.enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chess_sound', this.enabled);
    }
    this.updateToggleUI();
    if (this.enabled) {
      this.playMove();
    }
  },

  updateToggleUI: function () {
    if (typeof $ !== 'undefined') {
      $('#sound-toggle').text(this.enabled ? '🔊 Sound' : '🔇 Muted');
    }
  }
};

// ==========================================================
// THEME MANAGER
// ==========================================================
const ThemeManager = {
  current: 'classic',
  themes: ['classic', 'wood', 'neon', 'slate'],

  init: function () {
    let saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('chess_theme') || 'classic' : 'classic';
    this.apply(saved);
  },

  apply: function (theme) {
    if (!this.themes.includes(theme)) theme = 'classic';
    this.current = theme;
    if (typeof document !== 'undefined' && document.body) {
      document.body.className = `theme-${theme}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chess_theme', theme);
      }
      if (typeof $ !== 'undefined') {
        $('#theme-select').val(theme);
      }
    }
  }
};

// ==========================================================
// CHESS CLOCK MANAGER (Drift-free timestamp timing)
// ==========================================================
const ClockManager = {
  state: {
    isTimed: false,
    preset: 'untimed',
    whiteMs: 0,
    blackMs: 0,
    incrementMs: 0,
    activeColor: null,
    running: false,
    lastTimestamp: null,
    rafId: null
  },

  init: function () {
    this.setPreset('untimed');
  },

  setPreset: function (preset, customMins = 5, customInc = 0) {
    this.stop();
    this.state.preset = preset;

    if (preset === 'untimed') {
      this.state.isTimed = false;
      this.state.whiteMs = 0;
      this.state.blackMs = 0;
      this.state.incrementMs = 0;
    } else if (preset === '1+0') {
      this.state.isTimed = true;
      this.state.whiteMs = 1 * 60 * 1000;
      this.state.blackMs = 1 * 60 * 1000;
      this.state.incrementMs = 0;
    } else if (preset === '3+0') {
      this.state.isTimed = true;
      this.state.whiteMs = 3 * 60 * 1000;
      this.state.blackMs = 3 * 60 * 1000;
      this.state.incrementMs = 0;
    } else if (preset === '3+2') {
      this.state.isTimed = true;
      this.state.whiteMs = 3 * 60 * 1000;
      this.state.blackMs = 3 * 60 * 1000;
      this.state.incrementMs = 2 * 1000;
    } else if (preset === '10+0') {
      this.state.isTimed = true;
      this.state.whiteMs = 10 * 60 * 1000;
      this.state.blackMs = 10 * 60 * 1000;
      this.state.incrementMs = 0;
    } else if (preset === 'custom') {
      this.state.isTimed = true;
      let mins = Math.max(1, Math.min(180, parseInt(customMins, 10) || 5));
      let inc = Math.max(0, Math.min(60, parseInt(customInc, 10) || 0));
      this.state.whiteMs = mins * 60 * 1000;
      this.state.blackMs = mins * 60 * 1000;
      this.state.incrementMs = inc * 1000;
    }

    this.state.activeColor = null;
    this.state.running = false;
    this.state.lastTimestamp = null;
    this.updateDisplay();
  },

  onMoveMade: function (playerWhoMoved, nextPlayer) {
    if (!this.state.isTimed || main.variables.gameOver) return;

    if (this.state.running && this.state.incrementMs > 0) {
      if (playerWhoMoved === 'w') {
        this.state.whiteMs += this.state.incrementMs;
      } else if (playerWhoMoved === 'b') {
        this.state.blackMs += this.state.incrementMs;
      }
    }

    this.state.activeColor = nextPlayer;
    this.state.running = true;
    this.state.lastTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    this.startLoop();
    this.updateDisplay();
  },

  startLoop: function () {
    if (this.state.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.state.rafId);
    }

    const loop = (now) => {
      if (!this.state.running || !this.state.activeColor) return;

      const currentTimestamp = now || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (this.state.lastTimestamp !== null) {
        const elapsed = currentTimestamp - this.state.lastTimestamp;
        if (this.state.activeColor === 'w') {
          this.state.whiteMs = Math.max(0, this.state.whiteMs - elapsed);
          if (this.state.whiteMs <= 0) {
            this.handleTimeout('w');
            return;
          }
        } else if (this.state.activeColor === 'b') {
          this.state.blackMs = Math.max(0, this.state.blackMs - elapsed);
          if (this.state.blackMs <= 0) {
            this.handleTimeout('b');
            return;
          }
        }
      }

      this.state.lastTimestamp = currentTimestamp;
      this.updateDisplay();

      if (typeof requestAnimationFrame !== 'undefined') {
        this.state.rafId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.state.rafId = requestAnimationFrame(loop);
    }
  },

  handleTimeout: function (timedOutColor) {
    this.stop();
    this.updateDisplay();

    main.variables.gameOver = true;
    const winner = timedOutColor === 'w' ? 'Black' : 'White';
    $('#turn').addClass('turnhighlight').text(`TIME OUT — ${winner.toUpperCase()} WINS!`);

    AudioManager.playTimeout();
    main.methods.updateNavButtons();
  },

  stop: function () {
    this.state.running = false;
    if (this.state.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = null;
    }
  },

  reset: function () {
    this.setPreset(this.state.preset);
  },

  formatTime: function (ms) {
    if (!this.state.isTimed) return '--:--';
    let totalSeconds = Math.ceil(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  updateDisplay: function () {
    if (typeof $ === 'undefined') return;

    const wText = this.formatTime(this.state.whiteMs);
    const bText = this.formatTime(this.state.blackMs);

    $('#clock-white-time').text(wText);
    $('#clock-black-time').text(bText);

    $('#clock-white, #clock-black').removeClass('active warning critical');

    if (this.state.isTimed) {
      if (this.state.running) {
        if (this.state.activeColor === 'w') $('#clock-white').addClass('active');
        if (this.state.activeColor === 'b') $('#clock-black').addClass('active');
      }

      if (this.state.whiteMs <= 10000 && this.state.whiteMs > 0) {
        $('#clock-white').addClass('critical');
      } else if (this.state.whiteMs <= 30000 && this.state.whiteMs > 0) {
        $('#clock-white').addClass('warning');
      }

      if (this.state.blackMs <= 10000 && this.state.blackMs > 0) {
        $('#clock-black').addClass('critical');
      } else if (this.state.blackMs <= 30000 && this.state.blackMs > 0) {
        $('#clock-black').addClass('warning');
      }
    }
  }
};

// ==========================================================
// DRAG AND DROP MANAGER (Pointer Events - Mouse, Touch, Stylus)
// ==========================================================
const DragManager = {
  active: false,
  pieceKey: null,
  fromCellId: null,
  startX: 0,
  startY: 0,
  thresholdMet: false,
  justDropped: false,
  ghostEl: null,

  init: function () {
    if (typeof document === 'undefined') return;
    this.ghostEl = document.getElementById('drag-ghost');

    $(document).on('pointerdown', '.gamecell', function (e) {
      DragManager.handlePointerDown(e, this);
    });

    $(document).on('pointermove', function (e) {
      DragManager.handlePointerMove(e);
    });

    $(document).on('pointerup pointercancel', function (e) {
      DragManager.handlePointerUp(e);
    });
  },

  handlePointerDown: function (e, cellEl) {
    if (main.variables.gameOver || main.variables.isPromoting) return;

    let cellId = $(cellEl).attr('id');
    let chessPiece = $(cellEl).attr('chess');

    if (!chessPiece || chessPiece === 'null') return;
    if (main.methods.pieceColor(chessPiece) !== main.variables.turn) return;

    this.active = true;
    this.pieceKey = chessPiece;
    this.fromCellId = cellId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.thresholdMet = false;
  },

  handlePointerMove: function (e) {
    if (!this.active) return;

    let dx = e.clientX - this.startX;
    let dy = e.clientY - this.startY;

    if (!this.thresholdMet) {
      if (Math.hypot(dx, dy) > 6) {
        this.thresholdMet = true;
        main.methods.selectPiece(this.fromCellId);
        let pieceObj = main.variables.pieces[this.pieceKey];
        if (pieceObj && this.ghostEl) {
          this.ghostEl.innerHTML = pieceObj.img;
          this.ghostEl.style.display = 'block';
          $('#' + this.fromCellId).addClass('dragging-source');
        }
      }
    }

    if (this.thresholdMet && this.ghostEl) {
      this.ghostEl.style.left = e.clientX + 'px';
      this.ghostEl.style.top = e.clientY + 'px';
    }
  },

  handlePointerUp: function (e) {
    if (!this.active) return;

    let wasDragging = this.thresholdMet;
    let fromId = this.fromCellId;

    if (this.ghostEl) {
      this.ghostEl.style.display = 'none';
      this.ghostEl.innerHTML = '';
    }
    $('.gamecell').removeClass('dragging-source');

    this.active = false;
    this.thresholdMet = false;
    this.pieceKey = null;
    this.fromCellId = null;

    if (wasDragging) {
      this.justDropped = true;
      setTimeout(() => { DragManager.justDropped = false; }, 80);

      let targetEl = (typeof document !== 'undefined' && document.elementFromPoint) ?
                     document.elementFromPoint(e.clientX, e.clientY) : null;
      let cellEl = targetEl ? $(targetEl).closest('.gamecell') : null;

      if (cellEl && cellEl.length > 0) {
        let toCellId = cellEl.attr('id');
        let targetChess = cellEl.attr('chess');

        if (toCellId === fromId) {
          return;
        }

        let match = main.variables.highlighted.find(h => {
          let baseTarget = h.indexOf('_') !== -1 ? h.split('_').slice(0, 2).join('_') : h;
          return baseTarget === toCellId;
        });

        if (match) {
          let selectedKey = $('#' + fromId).attr('chess');
          if (match.indexOf('_castleKS') !== -1) {
            main.methods.performCastle(selectedKey, 'KS');
          } else if (match.indexOf('_castleQS') !== -1) {
            main.methods.performCastle(selectedKey, 'QS');
          } else if (match.indexOf('_ep') !== -1) {
            main.methods.performEnPassant(selectedKey, toCellId);
          } else if (!targetChess || targetChess === 'null') {
            main.methods.move({ id: toCellId });
          } else {
            main.methods.capture({ id: toCellId, name: targetChess });
          }
          return;
        }
      }

      main.methods.clearSelection();
    }
  }
};

// ==========================================================
// MAIN CHESS GAME OBJECT
// ==========================================================
let main = {
  variables: {
    turn: 'w',
    selectedpiece: '',
    highlighted: [],
    gameOver: false,
    isPromoting: false,
    enPassantTarget: null,
    orientation: 'w',
    autoFlip: false,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    positionCounts: {},
    positionHistory: [],
    moveHistory: [],
    historyStack: [],
    redoStack: [],
    lastMove: null,
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

    renderBoard: function () {
      let isWhite = main.variables.orientation === 'w';
      let rowOrder = isWhite ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
      let colOrder = isWhite ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
      let colLabels = isWhite ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

      let html = '<div class="board-grid">';
      rowOrder.forEach(r => {
        html += `<div class="rank-label">${r}</div>`;
        colOrder.forEach(c => {
          let isGrey = (c + r) % 2 === 0;
          let cellCls = 'gamecell' + (isGrey ? ' grey' : '');
          html += `<div class="${cellCls}" id="${c}_${r}" chess="null">&nbsp;</div>`;
        });
      });

      html += '<div class="corner-label"></div>';
      colLabels.forEach(l => {
        html += `<div class="file-label">${l}</div>`;
      });
      html += '</div>';

      $('#game').html(html);
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

    // ---------- Helper Functions ----------
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

    toAlgebraic: function (id) {
      let { col, row } = main.methods.parseCell(id);
      return String.fromCharCode(96 + col) + row;
    },

    fromAlgebraic: function (alg) {
      let col = alg.charCodeAt(0) - 96;
      let row = parseInt(alg.charAt(1), 10);
      return main.methods.cellId(col, row);
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
            if (board[id]) break;
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

        let oneStep = main.methods.cellId(col, row + dir);
        if (main.methods.inBounds(col, row + dir) && !board[oneStep]) {
          moves.push(oneStep);
          let twoStep = main.methods.cellId(col, row + 2 * dir);
          if (row === startRow && !board[twoStep]) {
            moves.push(twoStep);
          }
        }

        [[col - 1, row + dir], [col + 1, row + dir]].forEach(([c, r]) => {
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (board[id] && main.methods.pieceColor(board[id]) !== color) {
              moves.push(id);
            }
          }
        });

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

        if (!obj.moved && !obj.captured) {
          let oppColor = color === 'w' ? 'b' : 'w';
          let rank = color === 'w' ? 1 : 8;
          let kingStart = main.methods.cellId(5, rank);

          if (board[kingStart] === pieceKey && !main.methods.isSquareAttacked(kingStart, oppColor, board)) {
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

    isInCheck: function (color, optBoard) {
      let board = optBoard || main.methods.getBoard();
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

    // ---------- SAN Generator ----------
    getDisambiguation: function (pieceKey, fromCell, toCell) {
      let type = main.methods.pieceTypeOf(pieceKey);
      if (type === 'pawn' || type === 'king') return '';

      let color = main.methods.pieceColor(pieceKey);
      let fromAlg = main.methods.toAlgebraic(fromCell);
      let candidates = [];

      for (let otherKey in main.variables.pieces) {
        if (otherKey === pieceKey) continue;
        let otherP = main.variables.pieces[otherKey];
        if (otherP.captured || !otherP.position) continue;
        if (main.methods.pieceColor(otherKey) !== color) continue;
        if (main.methods.pieceTypeOf(otherKey) !== type) continue;
        let otherLegal = main.methods.getLegalMoves(otherKey);
        if (otherLegal.some(m => (m.indexOf('_') !== -1 ? m.split('_').slice(0, 2).join('_') : m) === toCell)) {
          candidates.push(otherP.position);
        }
      }

      if (candidates.length === 0) return '';

      let fromPos = main.methods.parseCell(fromCell);
      let sameCol = candidates.some(pos => main.methods.parseCell(pos).col === fromPos.col);
      let sameRow = candidates.some(pos => main.methods.parseCell(pos).row === fromPos.row);

      if (!sameCol) {
        return fromAlg.charAt(0);
      } else if (!sameRow) {
        return fromAlg.charAt(1);
      } else {
        return fromAlg;
      }
    },

    generateSAN: function (pieceKey, fromCell, toCell, isCapture, isCastling, promotionType, resultingBoard, oppColor, preDisambig) {
      if (isCastling === 'KS') {
        let san = 'O-O';
        if (main.methods.isInCheck(oppColor, resultingBoard)) {
          san += main.methods.hasAnyLegalMoves(oppColor) ? '+' : '#';
        }
        return san;
      }
      if (isCastling === 'QS') {
        let san = 'O-O-O';
        if (main.methods.isInCheck(oppColor, resultingBoard)) {
          san += main.methods.hasAnyLegalMoves(oppColor) ? '+' : '#';
        }
        return san;
      }

      let type = main.methods.pieceTypeOf(pieceKey);
      let fromAlg = main.methods.toAlgebraic(fromCell);
      let toAlg = main.methods.toAlgebraic(toCell);
      let san = '';

      if (type === 'pawn') {
        if (isCapture) {
          san += fromAlg.charAt(0) + 'x' + toAlg;
        } else {
          san += toAlg;
        }
        if (promotionType) {
          let promoLetter = promotionType.split('_')[1].charAt(0).toUpperCase();
          if (promotionType.includes('knight')) promoLetter = 'N';
          san += '=' + promoLetter;
        }
      } else {
        let pieceLetters = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' };
        san += pieceLetters[type] || '';

        if (preDisambig) {
          san += preDisambig;
        }

        if (isCapture) san += 'x';
        san += toAlg;
      }

      if (main.methods.isInCheck(oppColor, resultingBoard)) {
        san += main.methods.hasAnyLegalMoves(oppColor) ? '+' : '#';
      }

      return san;
    },

    // ---------- Position Key & Draw Detection ----------
    getPositionKey: function (board, turn, enPassantTarget) {
      let fenRows = [];
      let charMap = {
        w_pawn: 'P', w_knight: 'N', w_bishop: 'B', w_rook: 'R', w_queen: 'Q', w_king: 'K',
        b_pawn: 'p', b_knight: 'n', b_bishop: 'b', b_rook: 'r', b_queen: 'q', b_king: 'k'
      };

      for (let r = 8; r >= 1; r--) {
        let emptyCount = 0;
        let rowStr = '';
        for (let c = 1; c <= 8; c++) {
          let key = board[c + '_' + r];
          if (!key) {
            emptyCount++;
          } else {
            if (emptyCount > 0) {
              rowStr += emptyCount;
              emptyCount = 0;
            }
            let pObj = main.variables.pieces[key];
            let pType = pObj ? pObj.type : (main.methods.pieceColor(key) + '_' + main.methods.pieceTypeOf(key));
            rowStr += (charMap[pType] || 'P');
          }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        fenRows.push(rowStr);
      }

      let placement = fenRows.join('/');

      let castling = '';
      let wk = main.variables.pieces['w_king'];
      let wr1 = main.variables.pieces['w_rook1'];
      let wr2 = main.variables.pieces['w_rook2'];
      let bk = main.variables.pieces['b_king'];
      let br1 = main.variables.pieces['b_rook1'];
      let br2 = main.variables.pieces['b_rook2'];

      if (wk && !wk.moved && !wk.captured) {
        if (wr2 && !wr2.moved && !wr2.captured && board['8_1'] === 'w_rook2') castling += 'K';
        if (wr1 && !wr1.moved && !wr1.captured && board['1_1'] === 'w_rook1') castling += 'Q';
      }
      if (bk && !bk.moved && !bk.captured) {
        if (br2 && !br2.moved && !br2.captured && board['8_8'] === 'b_rook2') castling += 'k';
        if (br1 && !br1.moved && !br1.captured && board['1_8'] === 'b_rook1') castling += 'q';
      }
      if (!castling) castling = '-';

      let epStr = '-';
      if (enPassantTarget) {
        epStr = main.methods.toAlgebraic(enPassantTarget.cell);
      }

      return `${placement} ${turn} ${castling} ${epStr}`;
    },

    checkDrawConditions: function (color) {
      if (main.variables.halfmoveClock >= 100) {
        main.variables.gameOver = true;
        ClockManager.stop();
        $('#turn').addClass('turnhighlight').text('DRAW BY 50-MOVE RULE');
        AudioManager.playGameOver();
        return true;
      }

      let currentKey = main.methods.getPositionKey(main.methods.getBoard(), color, main.variables.enPassantTarget);
      let count = (main.variables.positionCounts[currentKey] || 0) + 1;
      main.variables.positionCounts[currentKey] = count;
      main.variables.positionHistory.push(currentKey);

      if (count >= 3) {
        main.variables.gameOver = true;
        ClockManager.stop();
        $('#turn').addClass('turnhighlight').text('DRAW BY THREEFOLD REPETITION');
        AudioManager.playGameOver();
        return true;
      }

      return false;
    },

    // ---------- State Snapshot, Undo & Redo ----------
    createSnapshot: function () {
      return {
        pieces: JSON.parse(JSON.stringify(main.variables.pieces)),
        turn: main.variables.turn,
        gameOver: main.variables.gameOver,
        statusText: $('#turn').text(),
        statusClass: $('#turn').hasClass('turnhighlight'),
        enPassantTarget: main.variables.enPassantTarget ? Object.assign({}, main.variables.enPassantTarget) : null,
        halfmoveClock: main.variables.halfmoveClock,
        fullmoveNumber: main.variables.fullmoveNumber,
        positionCounts: Object.assign({}, main.variables.positionCounts),
        positionHistory: [...main.variables.positionHistory],
        capturedBlackHtml: $('#captured-black .captured-pieces-list').html(),
        capturedWhiteHtml: $('#captured-white .captured-pieces-list').html(),
        lastMove: main.variables.lastMove ? Object.assign({}, main.variables.lastMove) : null,
        moveHistory: JSON.parse(JSON.stringify(main.variables.moveHistory)),
        clockWhiteMs: ClockManager.state.whiteMs,
        clockBlackMs: ClockManager.state.blackMs
      };
    },

    restoreSnapshot: function (snap) {
      main.variables.pieces = snap.pieces;
      main.variables.turn = snap.turn;
      main.variables.gameOver = snap.gameOver;
      main.variables.enPassantTarget = snap.enPassantTarget;
      main.variables.halfmoveClock = snap.halfmoveClock;
      main.variables.fullmoveNumber = snap.fullmoveNumber;
      main.variables.positionCounts = snap.positionCounts;
      main.variables.positionHistory = snap.positionHistory;
      main.variables.lastMove = snap.lastMove;
      main.variables.moveHistory = snap.moveHistory;
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.variables.isPromoting = false;

      if (snap.clockWhiteMs !== undefined) ClockManager.state.whiteMs = snap.clockWhiteMs;
      if (snap.clockBlackMs !== undefined) ClockManager.state.blackMs = snap.clockBlackMs;
      ClockManager.state.activeColor = snap.gameOver ? null : snap.turn;
      ClockManager.updateDisplay();

      main.methods.gamesetup();
      $('#captured-black .captured-pieces-list').html(snap.capturedBlackHtml || '');
      $('#captured-white .captured-pieces-list').html(snap.capturedWhiteHtml || '');
      $('#promotion-modal').css('display', 'none');

      if (snap.statusClass) {
        $('#turn').addClass('turnhighlight').text(snap.statusText);
      } else {
        $('#turn').removeClass('turnhighlight').text(snap.statusText);
      }

      main.methods.updateVisualHighlights();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();
    },

    undo: function () {
      if (main.variables.historyStack.length === 0 || main.variables.isPromoting) return;
      let currentSnap = main.methods.createSnapshot();
      main.variables.redoStack.push(currentSnap);

      let prevSnap = main.variables.historyStack.pop();
      main.methods.restoreSnapshot(prevSnap);
      AudioManager.playMove();
    },

    redo: function () {
      if (main.variables.redoStack.length === 0 || main.variables.isPromoting) return;
      let currentSnap = main.methods.createSnapshot();
      main.variables.historyStack.push(currentSnap);

      let nextSnap = main.variables.redoStack.pop();
      main.methods.restoreSnapshot(nextSnap);
      AudioManager.playMove();
    },

    updateNavButtons: function () {
      $('#undo-btn').prop('disabled', main.variables.historyStack.length === 0);
      $('#redo-btn').prop('disabled', main.variables.redoStack.length === 0);
    },

    // ---------- Move History UI & PGN Export ----------
    updateMoveHistoryUI: function () {
      let html = '<table class="history-table"><tbody>';
      let history = main.variables.moveHistory;

      for (let i = 0; i < history.length; i += 2) {
        let moveNum = Math.floor(i / 2) + 1;
        let whiteMove = history[i] ? history[i].san : '';
        let blackMove = history[i + 1] ? history[i + 1].san : '';

        let isLatestWhite = i === history.length - 1;
        let isLatestBlack = (i + 1) === history.length - 1;

        html += `
          <tr>
            <td class="hist-num">${moveNum}.</td>
            <td class="hist-san ${isLatestWhite ? 'active-move' : ''}">${whiteMove}</td>
            <td class="hist-san ${isLatestBlack ? 'active-move' : ''}">${blackMove}</td>
          </tr>
        `;
      }
      html += '</tbody></table>';

      $('#move-history-list').html(html);
      let listEl = (typeof document !== 'undefined') ? document.getElementById('move-history-list') : null;
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    },

    exportPGN: function () {
      let result = '*';
      let text = $('#turn').text();
      if (text.includes('White wins') || text.includes('WHITE WINS')) result = '1-0';
      else if (text.includes('Black wins') || text.includes('BLACK WINS')) result = '0-1';
      else if (text.includes('draw') || text.includes('Stalemate') || text.includes('DRAW')) result = '1/2-1/2';

      let d = new Date();
      let dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

      let pgn = `[Event "Casual Game"]\n[Site "JS Chess Game"]\n[Date "${dateStr}"]\n[White "White"]\n[Black "Black"]\n[Result "${result}"]\n\n`;

      let movePairs = [];
      let history = main.variables.moveHistory;
      for (let i = 0; i < history.length; i += 2) {
        let num = Math.floor(i / 2) + 1;
        let w = history[i].san;
        let b = history[i + 1] ? ' ' + history[i + 1].san : '';
        movePairs.push(`${num}. ${w}${b}`);
      }

      pgn += movePairs.join(' ') + (movePairs.length > 0 ? ' ' : '') + result;
      return pgn;
    },

    copyPGNToClipboard: function () {
      let pgn = main.methods.exportPGN();
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pgn).then(() => {
          let prevText = $('#pgn-btn').text();
          $('#pgn-btn, #export-pgn-btn').text('✓ Copied!');
          setTimeout(() => $('#pgn-btn, #export-pgn-btn').text(prevText), 1500);
        }).catch(() => {
          prompt('Copy PGN below:', pgn);
        });
      } else {
        if (typeof prompt !== 'undefined') {
          prompt('Copy PGN below:', pgn);
        }
      }
    },

    // ---------- Visual Highlights & Flip ----------
    flipBoard: function () {
      main.variables.orientation = main.variables.orientation === 'w' ? 'b' : 'w';
      main.methods.renderBoard();
      main.methods.gamesetup();
      main.methods.updateVisualHighlights();
      main.methods.updateNavButtons();
    },

    performCastle: function (kingKey, side) {
      let color = main.methods.pieceColor(kingKey);
      let rank = color === 'w' ? 1 : 8;
      let rookKey = side === 'KS' ? color + '_rook2' : color + '_rook1';
      let kingTarget = side === 'KS' ? main.methods.cellId(7, rank) : main.methods.cellId(3, rank);
      let rookTarget = side === 'KS' ? main.methods.cellId(6, rank) : main.methods.cellId(4, rank);
      let kingObj = main.variables.pieces[kingKey];
      let rookObj = main.variables.pieces[rookKey];
      let fromCell = kingObj.position;

      main.variables.historyStack.push(main.methods.createSnapshot());
      main.variables.redoStack = [];

      $('#' + kingObj.position).html('&nbsp;').attr('chess', 'null');
      $('#' + rookObj.position).html('&nbsp;').attr('chess', 'null');

      $('#' + kingTarget).html(kingObj.img).attr('chess', kingKey);
      $('#' + rookTarget).html(rookObj.img).attr('chess', rookKey);

      kingObj.position = kingTarget;
      kingObj.moved = true;
      rookObj.position = rookTarget;
      rookObj.moved = true;

      main.variables.lastMove = { from: fromCell, to: kingTarget };
      main.variables.halfmoveClock += 1;

      let resultingBoard = main.methods.getBoard();
      let oppColor = color === 'w' ? 'b' : 'w';
      let san = main.methods.generateSAN(kingKey, fromCell, kingTarget, false, side, null, resultingBoard, oppColor, '');

      main.variables.moveHistory.push({
        moveNumber: main.variables.fullmoveNumber,
        color: color,
        san: san,
        from: fromCell,
        to: kingTarget,
        pieceKey: kingKey,
        pieceType: kingObj.type,
        capturedKey: null,
        promotion: null,
        isCastling: side,
        isEnPassant: false
      });

      AudioManager.playCastle();
      main.methods.endturn(null);
    },

    performEnPassant: function (selectedKey, targetCellId) {
      let pieceObj = main.variables.pieces[selectedKey];
      let ep = main.variables.enPassantTarget;
      if (!ep) return;

      let fromCell = pieceObj.position;
      let capturedPawnCell = ep.pawnCell;
      let capturedPieceName = $('#' + capturedPawnCell).attr('chess');
      let capturedPieceObj = main.variables.pieces[capturedPieceName];
      let color = main.methods.pieceColor(selectedKey);

      main.variables.historyStack.push(main.methods.createSnapshot());
      main.variables.redoStack = [];

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

      $('#' + targetCellId).html(pieceObj.img).attr('chess', selectedKey);
      $('#' + fromCell).html('&nbsp;').attr('chess', 'null');

      pieceObj.position = targetCellId;
      pieceObj.moved = true;

      main.variables.lastMove = { from: fromCell, to: targetCellId };
      main.variables.halfmoveClock = 0;

      let resultingBoard = main.methods.getBoard();
      let oppColor = color === 'w' ? 'b' : 'w';
      let san = main.methods.generateSAN(selectedKey, fromCell, targetCellId, true, null, null, resultingBoard, oppColor, '');

      main.variables.moveHistory.push({
        moveNumber: main.variables.fullmoveNumber,
        color: color,
        san: san,
        from: fromCell,
        to: targetCellId,
        pieceKey: selectedKey,
        pieceType: pieceObj.type,
        capturedKey: capturedPieceName,
        promotion: null,
        isCastling: null,
        isEnPassant: true
      });

      AudioManager.playCapture();
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
      $('.gamecell').removeClass('green yellow last-move-from last-move-to');

      if (main.variables.lastMove) {
        $('#' + main.variables.lastMove.from).addClass('last-move-from');
        $('#' + main.variables.lastMove.to).addClass('last-move-to');
      }

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

    // ---------- Move Execution ----------
    move: function (target) {
      let selectedpiece = $('#' + main.variables.selectedpiece).attr('chess');
      let pieceObj = main.variables.pieces[selectedpiece];
      let fromCell = main.variables.selectedpiece;
      let fromPos = main.methods.parseCell(fromCell);
      let toPos = main.methods.parseCell(target.id);
      let targetRank = target.id.split('_')[1];
      let color = main.methods.pieceColor(selectedpiece);

      let preDisambig = main.methods.getDisambiguation(selectedpiece, fromCell, target.id);

      main.variables.historyStack.push(main.methods.createSnapshot());
      main.variables.redoStack = [];

      let nextEnPassant = null;
      let isPawn = pieceObj.type.endsWith('_pawn');
      if (isPawn && Math.abs(toPos.row - fromPos.row) === 2) {
        let epRow = pieceObj.type.startsWith('w_') ? 3 : 6;
        nextEnPassant = {
          cell: main.methods.cellId(fromPos.col, epRow),
          pawnCell: target.id,
          col: fromPos.col,
          color: color
        };
      }

      if (isPawn) {
        main.variables.halfmoveClock = 0;
      } else {
        main.variables.halfmoveClock += 1;
      }

      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedpiece);

      $('#' + fromCell).html('&nbsp;');
      $('#' + fromCell).attr('chess', 'null');

      pieceObj.position = target.id;
      pieceObj.moved = true;

      main.variables.lastMove = { from: fromCell, to: target.id };

      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') ||
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function (chosenType) {
          let resultingBoard = main.methods.getBoard();
          let oppColor = color === 'w' ? 'b' : 'w';
          let san = main.methods.generateSAN(selectedpiece, fromCell, target.id, false, null, chosenType, resultingBoard, oppColor, preDisambig);
          main.variables.moveHistory.push({
            moveNumber: main.variables.fullmoveNumber,
            color: color,
            san: san,
            from: fromCell,
            to: target.id,
            pieceKey: selectedpiece,
            pieceType: chosenType,
            capturedKey: null,
            promotion: chosenType,
            isCastling: null,
            isEnPassant: false
          });
          AudioManager.playMove();
          main.methods.endturn(nextEnPassant);
        });
      } else {
        let resultingBoard = main.methods.getBoard();
        let oppColor = color === 'w' ? 'b' : 'w';
        let san = main.methods.generateSAN(selectedpiece, fromCell, target.id, false, null, null, resultingBoard, oppColor, preDisambig);
        main.variables.moveHistory.push({
          moveNumber: main.variables.fullmoveNumber,
          color: color,
          san: san,
          from: fromCell,
          to: target.id,
          pieceKey: selectedpiece,
          pieceType: pieceObj.type,
          capturedKey: null,
          promotion: null,
          isCastling: null,
          isEnPassant: false
        });
        AudioManager.playMove();
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
      let color = main.methods.pieceColor(selectedKey);

      let preDisambig = main.methods.getDisambiguation(selectedKey, fromCell, target.id);

      main.variables.historyStack.push(main.methods.createSnapshot());
      main.variables.redoStack = [];

      main.variables.halfmoveClock = 0;

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

      main.variables.lastMove = { from: fromCell, to: target.id };

      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') ||
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function (chosenType) {
          let resultingBoard = main.methods.getBoard();
          let oppColor = color === 'w' ? 'b' : 'w';
          let san = main.methods.generateSAN(selectedKey, fromCell, target.id, true, null, chosenType, resultingBoard, oppColor, preDisambig);
          main.variables.moveHistory.push({
            moveNumber: main.variables.fullmoveNumber,
            color: color,
            san: san,
            from: fromCell,
            to: target.id,
            pieceKey: selectedKey,
            pieceType: chosenType,
            capturedKey: capturedPieceName,
            promotion: chosenType,
            isCastling: null,
            isEnPassant: false
          });
          AudioManager.playCapture();
          main.methods.endturn(null);
        });
      } else {
        let resultingBoard = main.methods.getBoard();
        let oppColor = color === 'w' ? 'b' : 'w';
        let san = main.methods.generateSAN(selectedKey, fromCell, target.id, true, null, null, resultingBoard, oppColor, preDisambig);
        main.variables.moveHistory.push({
          moveNumber: main.variables.fullmoveNumber,
          color: color,
          san: san,
          from: fromCell,
          to: target.id,
          pieceKey: selectedKey,
          pieceType: pieceObj.type,
          capturedKey: capturedPieceName,
          promotion: null,
          isCastling: null,
          isEnPassant: false
        });
        AudioManager.playCapture();
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
        if (callback) callback(chosenType);
      });
    },

    endturn: function (nextEnPassant) {
      let previousColor = main.variables.turn;
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.variables.enPassantTarget = nextEnPassant || null;

      if (main.variables.turn === 'b') {
        main.variables.fullmoveNumber += 1;
      }
      main.variables.turn = main.variables.turn === 'w' ? 'b' : 'w';
      let color = main.variables.turn;

      let inCheck = main.methods.isInCheck(color);
      let hasMoves = main.methods.hasAnyLegalMoves(color);

      main.methods.updateVisualHighlights();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();

      if (inCheck && !hasMoves) {
        main.variables.gameOver = true;
        ClockManager.stop();
        let winner = color === 'w' ? 'Black' : 'White';
        $('#turn').addClass('turnhighlight').text('Checkmate! ' + winner + ' wins!');
        AudioManager.playGameOver();
      } else if (!inCheck && !hasMoves) {
        main.variables.gameOver = true;
        ClockManager.stop();
        $('#turn').addClass('turnhighlight').text("Stalemate! It's a draw.");
        AudioManager.playGameOver();
      } else if (main.methods.checkDrawConditions(color)) {
        // Draw handled inside checkDrawConditions
      } else if (inCheck) {
        $('#turn').removeClass('turnhighlight').text((color === 'w' ? "White" : "Black") + "'s turn \u2014 Check!");
        AudioManager.playCheck();
        ClockManager.onMoveMade(previousColor, color);
      } else {
        $('#turn').removeClass('turnhighlight').text(color === 'w' ? "It's White's Turn!" : "It's Black's Turn!");
        ClockManager.onMoveMade(previousColor, color);
      }

      if (main.variables.autoFlip && !main.variables.gameOver) {
        if (main.variables.orientation !== color) {
          main.methods.flipBoard();
        }
      }
    },

    resetGame: function () {
      main.variables.turn = 'w';
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
      main.variables.gameOver = false;
      main.variables.isPromoting = false;
      main.variables.enPassantTarget = null;
      main.variables.halfmoveClock = 0;
      main.variables.fullmoveNumber = 1;
      main.variables.positionCounts = {};
      main.variables.positionHistory = [];
      main.variables.moveHistory = [];
      main.variables.historyStack = [];
      main.variables.redoStack = [];
      main.variables.lastMove = null;
      main.variables.pieces = main.methods.getInitialPieces();

      $('#captured-black .captured-pieces-list').empty();
      $('#captured-white .captured-pieces-list').empty();
      $('#promotion-modal').css('display', 'none');
      $('.gamecell').removeClass('green yellow red last-move-from last-move-to');
      $('#turn').removeClass('turnhighlight').text("It's White's Turn!");

      ClockManager.reset();

      main.methods.renderBoard();
      main.methods.gamesetup();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();

      let initialKey = main.methods.getPositionKey(main.methods.getBoard(), 'w', null);
      main.variables.positionCounts[initialKey] = 1;
      main.variables.positionHistory.push(initialKey);
    }
  }
};

// Initialize pieces at startup
main.variables.pieces = main.methods.getInitialPieces();

if (typeof $ !== 'undefined') {
  $(document).ready(function () {
    AudioManager.init();
    ThemeManager.init();
    ClockManager.init();
    DragManager.init();

    main.methods.renderBoard();
    main.methods.gamesetup();

    let initialKey = main.methods.getPositionKey(main.methods.getBoard(), 'w', null);
    main.variables.positionCounts[initialKey] = 1;
    main.variables.positionHistory.push(initialKey);
    main.methods.updateNavButtons();
    main.methods.updateMoveHistoryUI();

    // Click handler for Click-to-Move
    $(document).on('click', '.gamecell', function (e) {
      if (main.variables.gameOver || main.variables.isPromoting) return;
      if (DragManager.justDropped) return; // Ignore synthetic click immediately following a drop

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
            } else if (match.indexOf('_castleQS') !== -1) {
              main.methods.performCastle(selectedKey, 'QS');
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

    // Action buttons
    $(document).on('click', '#undo-btn', function () {
      main.methods.undo();
    });

    $(document).on('click', '#redo-btn', function () {
      main.methods.redo();
    });

    $(document).on('click', '#flip-btn', function () {
      main.methods.flipBoard();
    });

    $(document).on('click', '#pgn-btn, #export-pgn-btn', function () {
      main.methods.copyPGNToClipboard();
    });

    $(document).on('click', '#reset-btn', function () {
      main.methods.resetGame();
    });

    $(document).on('change', '#autoflip-check', function () {
      main.variables.autoFlip = $(this).is(':checked');
    });

    // Theme selector
    $(document).on('change', '#theme-select', function () {
      ThemeManager.apply($(this).val());
    });

    // Sound toggle
    $(document).on('click', '#sound-toggle', function () {
      AudioManager.toggleSound();
    });

    // Time Control Presets
    $(document).on('change', '#time-preset', function () {
      let val = $(this).val();
      if (val === 'custom') {
        $('#custom-time-inputs').css('display', 'flex');
      } else {
        $('#custom-time-inputs').css('display', 'none');
        ClockManager.setPreset(val);
      }
    });

    $(document).on('click', '#apply-custom-time', function () {
      let mins = $('#custom-mins').val();
      let inc = $('#custom-inc').val();
      ClockManager.setPreset('custom', mins, inc);
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    main,
    ClockManager,
    AudioManager,
    ThemeManager,
    DragManager
  };
}

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
      const soundSvg = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
      const muteSvg = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
      const icon = this.enabled ? soundSvg : muteSvg;
      const label = this.enabled ? 'Sound' : 'Muted';
      const $el = $('#sound-toggle');
      if ($el.html) {
        $el.html(`${icon} <span>${label}</span>`);
      } else if ($el.text) {
        $el.text(label);
      }
    }
  }
};


// ==========================================================
// BOARD STATUS OVERLAY COMPONENT (<BoardStatusOverlay />)
// Displays frosted-glass centered status card over the chessboard
// ==========================================================
const BoardStatusOverlay = {
  transientTimer: null,
  currentMessage: '',
  currentSubtitle: '',

  /**
   * Show a status message in the center board frosted-glass overlay
   * @param {string} message - Primary title string (e.g. "Time out", "Checkmate!", "Check", "Draw", "Stalemate")
   * @param {string} [subtitle] - Optional descriptive subtitle (e.g. "White ran out of time", "Black wins by checkmate")
   * @param {object} [options] - Options: { isGameOver, transient, durationMs }
   */
  show: function (message, subtitle = '', options = {}) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      this.hide();
      return;
    }

    if (this.transientTimer) {
      clearTimeout(this.transientTimer);
      this.transientTimer = null;
    }

    if (typeof $ === 'undefined') return;

    const $overlay = $('#board-status-overlay');
    const $title = $('#board-status-title');
    const $subtitle = $('#board-status-subtitle');

    if (!$overlay.length || !$title.length) return;

    const isGameOver = options.isGameOver !== undefined
      ? options.isGameOver
      : (typeof main !== 'undefined' && main.variables && main.variables.gameOver);
    const isTransient = options.transient !== undefined ? options.transient : !isGameOver;

    const isAlreadyActive = $overlay.hasClass('active');
    const textChanged = (this.currentMessage !== message || this.currentSubtitle !== subtitle);

    this.currentMessage = message;
    this.currentSubtitle = subtitle || '';

    const applyContent = () => {
      if (typeof $title.text === 'function') $title.text(message);
      if (subtitle) {
        if (typeof $subtitle.text === 'function') $subtitle.text(subtitle);
        if (typeof $subtitle.css === 'function') $subtitle.css('display', 'block');
      } else {
        if (typeof $subtitle.text === 'function') $subtitle.text('');
        if (typeof $subtitle.css === 'function') $subtitle.css('display', 'none');
      }
      if (typeof $title.css === 'function') $title.css('opacity', '1');
      if (typeof $subtitle.css === 'function') $subtitle.css('opacity', '1');
    };

    if (isAlreadyActive && textChanged) {
      if (typeof $title.css === 'function') $title.css('opacity', '0');
      if (typeof $subtitle.css === 'function') $subtitle.css('opacity', '0');
      setTimeout(applyContent, 150);
    } else {
      applyContent();
    }

    if (typeof $overlay.css === 'function') $overlay.css('display', 'flex');

    if (isTransient) {
      if (typeof $overlay.addClass === 'function') {
        $overlay.addClass('transient').removeClass('has-scrim');
      }
      if ($overlay[0] && typeof $overlay[0].offsetWidth !== 'undefined') {
        void $overlay[0].offsetWidth; // Force layout
      }
      if (typeof $overlay.addClass === 'function') {
        $overlay.addClass('active');
      }

      const duration = options.durationMs || 1500;
      this.transientTimer = setTimeout(() => {
        BoardStatusOverlay.hide();
      }, duration);
    } else {
      if (typeof $overlay.addClass === 'function') {
        $overlay.removeClass('transient').addClass('has-scrim');
      }
      if ($overlay[0] && typeof $overlay[0].offsetWidth !== 'undefined') {
        void $overlay[0].offsetWidth; // Force layout
      }
      if (typeof $overlay.addClass === 'function') {
        $overlay.addClass('active');
      }
    }
  },

  hide: function () {
    if (this.transientTimer) {
      clearTimeout(this.transientTimer);
      this.transientTimer = null;
    }
    this.currentMessage = '';
    this.currentSubtitle = '';

    if (typeof $ === 'undefined') return;
    const $overlay = $('#board-status-overlay');
    if (!$overlay.length) return;

    if (typeof $overlay.removeClass === 'function') {
      $overlay.removeClass('active');
    }

    setTimeout(() => {
      if (!$overlay.hasClass || !$overlay.hasClass('active')) {
        if (typeof $overlay.css === 'function') $overlay.css('display', 'none');
        if (typeof $overlay.removeClass === 'function') $overlay.removeClass('has-scrim transient');
        const $title = $('#board-status-title');
        const $subtitle = $('#board-status-subtitle');
        if (typeof $title.text === 'function') $title.text('');
        if (typeof $subtitle.text === 'function') $subtitle.text('');
        if (typeof $subtitle.css === 'function') $subtitle.css('display', 'none');
      }
    }, 250);
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
    initialMs: 0,
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

    this.state.initialMs = this.state.whiteMs;
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
    if (typeof ChessClock !== 'undefined' && ChessClock.onMoveMade) {
      ChessClock.onMoveMade(playerWhoMoved, nextPlayer);
    }
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
    const loser = timedOutColor === 'w' ? 'White' : 'Black';
    $('#turn').addClass('turnhighlight').text(`TIME OUT — ${winner.toUpperCase()} WINS!`);

    BoardStatusOverlay.show('Time out', `${loser} ran out of time`, { isGameOver: true });
    $('#rematch-btn').addClass('highlight-rematch');

    AudioManager.playTimeout();
    main.methods.updateMoveHistoryUI();
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
    if (typeof ChessClock !== 'undefined' && ChessClock.onReset) {
      ChessClock.onReset();
    }
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

    if (!this.state.isTimed) {
      $('#clock-white, #clock-black').css('display', 'none');
      if (typeof ChessClock !== 'undefined' && ChessClock.update) ChessClock.update();
      return;
    }

    $('#clock-white, #clock-black').css('display', 'flex');

    let wText = this.formatTime(this.state.whiteMs);
    let bText = this.formatTime(this.state.blackMs);

    $('#clock-white-time').text(wText);
    $('#clock-black-time').text(bText);

    $('#clock-white, #clock-black').removeClass('active warning critical');

    if (this.state.running) {
      if (this.state.activeColor === 'w') $('#clock-white').addClass('active');
      if (this.state.activeColor === 'b') $('#clock-black').addClass('active');
    } else {
      if (typeof main !== 'undefined' && main.variables) {
        if (main.variables.turn === 'w') $('#clock-white').addClass('active');
        else $('#clock-black').addClass('active');
      }
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

    if (typeof ChessClock !== 'undefined' && ChessClock.update) {
      ChessClock.update();
    }
  }
};

// ==========================================================

// ==========================================================
// REUSABLE ANALOG CHESS CLOCK COMPONENT (<chess-clock>)
// ==========================================================
const ChessClock = {
  elements: null,
  isInitialized: false,
  lastSpinnerAngle: 0,
  svgTemplate: `<svg id="analog-chess-clock" class="analog-chess-clock" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Analog Chess Clock">
  <defs>
    <!-- Drop shadow for active dial glow -->
    <filter id="clock-dial-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Feet at bottom -->
  <g class="clock-feet" fill="none" stroke="#f5c400" stroke-width="1.5">
    <rect x="76" y="184" width="24" height="10" rx="1.5" />
    <rect x="300" y="184" width="24" height="10" rx="1.5" />
  </g>

  <!-- Left Pusher Button (White by default) -->
  <g id="pusher-left" class="clock-pusher pusher-up">
    <rect class="pusher-stem" x="120" y="10" width="12" height="22" fill="#181716" stroke="#f5c400" stroke-width="1.5" />
    <rect class="pusher-cap" x="114" y="4" width="24" height="6" rx="1" fill="#1e1e1e" stroke="#f5c400" stroke-width="1.5" />
    <line x1="117" y1="7" x2="135" y2="7" stroke="#f5c400" stroke-width="1" />
  </g>

  <!-- Right Pusher Button (Black by default) -->
  <g id="pusher-right" class="clock-pusher pusher-down">
    <rect class="pusher-stem" x="268" y="10" width="12" height="22" fill="#181716" stroke="#f5c400" stroke-width="1.5" />
    <rect class="pusher-cap" x="262" y="4" width="24" height="6" rx="1" fill="#1e1e1e" stroke="#f5c400" stroke-width="1.5" />
    <line x1="265" y1="7" x2="283" y2="7" stroke="#f5c400" stroke-width="1" />
  </g>

  <!-- Outer Frame -->
  <rect class="clock-outer-case" x="30" y="32" width="340" height="152" rx="4" fill="#161514" fill-opacity="0.95" stroke="#f5c400" stroke-width="1.5" />

  <!-- Inner Panel Outline -->
  <rect class="clock-inner-panel" x="52" y="40" width="296" height="136" rx="2" fill="none" stroke="#f5c400" stroke-width="1.5" />

  <!-- Left Horizontal Ridges -->
  <g class="clock-ridges">
    <line x1="30" y1="56" x2="45" y2="56" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="70" x2="45" y2="70" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="84" x2="45" y2="84" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="98" x2="45" y2="98" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="112" x2="45" y2="112" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="126" x2="45" y2="126" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="140" x2="45" y2="140" stroke="#f5c400" stroke-width="1.5" />
      <line x1="30" y1="154" x2="45" y2="154" stroke="#f5c400" stroke-width="1.5" />
  </g>

  <!-- Right Horizontal Ridges -->
  <g class="clock-ridges">
    <line x1="355" y1="56" x2="370" y2="56" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="70" x2="370" y2="70" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="84" x2="370" y2="84" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="98" x2="370" y2="98" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="112" x2="370" y2="112" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="126" x2="370" y2="126" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="140" x2="370" y2="140" stroke="#f5c400" stroke-width="1.5" />
      <line x1="355" y1="154" x2="370" y2="154" stroke="#f5c400" stroke-width="1.5" />
  </g>

  <!-- Center Divider Line -->
  <line class="clock-divider" x1="200" y1="62" x2="200" y2="160" stroke="#f5c400" stroke-width="1.2" />

  <!-- Header Labels: Left Player, Center CHESS, Right Player -->
  <text id="dial-tag-left" class="dial-tag" x="126" y="55" text-anchor="middle" font-family="'Inter', sans-serif" font-size="9" font-weight="600" letter-spacing="1.2px" fill="#88847c">WHITE</text>
  <text class="clock-brand-label" x="200" y="55" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="12" letter-spacing="2.5px" fill="#a09a8e">CHESS</text>
  <text id="dial-tag-right" class="dial-tag" x="274" y="55" text-anchor="middle" font-family="'Inter', sans-serif" font-size="9" font-weight="600" letter-spacing="1.2px" fill="#88847c">BLACK</text>

  <!-- ================= LEFT DIAL ================= -->
  <g id="dial-group-left" class="clock-dial-group dial-active" data-side="left">
    <!-- Active Glow Background -->
    <circle class="dial-glow-bg" cx="126" cy="110" r="46" fill="rgba(245, 196, 0, 0.05)" />
    
    <!-- Dial Ticks -->
    <g class="dial-ticks">
      <line x1="126.0" y1="80.0" x2="126.0" y2="72.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="129.5" y1="76.7" x2="130.0" y2="72.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="133.0" y1="77.2" x2="133.9" y2="72.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="136.4" y1="78.1" x2="137.7" y2="73.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="139.6" y1="79.4" x2="141.5" y2="75.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="141.0" y1="84.0" x2="145.0" y2="77.1" stroke="#f5c400" stroke-width="1.4" />
        <line x1="145.7" y1="82.9" x2="148.3" y2="79.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="148.4" y1="85.1" x2="151.4" y2="81.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="150.9" y1="87.6" x2="154.2" y2="84.6" stroke="#d4a900" stroke-width="0.75" />
        <line x1="153.1" y1="90.3" x2="156.7" y2="87.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="152.0" y1="95.0" x2="158.9" y2="91.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="156.6" y1="96.4" x2="160.7" y2="94.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="157.9" y1="99.6" x2="162.1" y2="98.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="158.8" y1="103.0" x2="163.2" y2="102.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="159.3" y1="106.5" x2="163.8" y2="106.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="156.0" y1="110.0" x2="164.0" y2="110.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="159.3" y1="113.5" x2="163.8" y2="114.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="158.8" y1="117.0" x2="163.2" y2="117.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="157.9" y1="120.4" x2="162.1" y2="121.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="156.6" y1="123.6" x2="160.7" y2="125.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="152.0" y1="125.0" x2="158.9" y2="129.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="153.1" y1="129.7" x2="156.7" y2="132.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="150.9" y1="132.4" x2="154.2" y2="135.4" stroke="#d4a900" stroke-width="0.75" />
        <line x1="148.4" y1="134.9" x2="151.4" y2="138.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="145.7" y1="137.1" x2="148.3" y2="140.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="141.0" y1="136.0" x2="145.0" y2="142.9" stroke="#f5c400" stroke-width="1.4" />
        <line x1="139.6" y1="140.6" x2="141.5" y2="144.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="136.4" y1="141.9" x2="137.7" y2="146.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="133.0" y1="142.8" x2="133.9" y2="147.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="129.5" y1="143.3" x2="130.0" y2="147.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="126.0" y1="140.0" x2="126.0" y2="148.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="122.5" y1="143.3" x2="122.0" y2="147.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="119.0" y1="142.8" x2="118.1" y2="147.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="115.6" y1="141.9" x2="114.3" y2="146.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="112.4" y1="140.6" x2="110.5" y2="144.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="111.0" y1="136.0" x2="107.0" y2="142.9" stroke="#f5c400" stroke-width="1.4" />
        <line x1="106.3" y1="137.1" x2="103.7" y2="140.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="103.6" y1="134.9" x2="100.6" y2="138.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="101.1" y1="132.4" x2="97.8" y2="135.4" stroke="#d4a900" stroke-width="0.75" />
        <line x1="98.9" y1="129.7" x2="95.3" y2="132.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="100.0" y1="125.0" x2="93.1" y2="129.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="95.4" y1="123.6" x2="91.3" y2="125.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="94.1" y1="120.4" x2="89.9" y2="121.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="93.2" y1="117.0" x2="88.8" y2="117.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="92.7" y1="113.5" x2="88.2" y2="114.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="96.0" y1="110.0" x2="88.0" y2="110.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="92.7" y1="106.5" x2="88.2" y2="106.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="93.2" y1="103.0" x2="88.8" y2="102.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="94.1" y1="99.6" x2="89.9" y2="98.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="95.4" y1="96.4" x2="91.3" y2="94.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="100.0" y1="95.0" x2="93.1" y2="91.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="98.9" y1="90.3" x2="95.3" y2="87.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="101.1" y1="87.6" x2="97.8" y2="84.6" stroke="#d4a900" stroke-width="0.75" />
        <line x1="103.6" y1="85.1" x2="100.6" y2="81.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="106.3" y1="82.9" x2="103.7" y2="79.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="111.0" y1="84.0" x2="107.0" y2="77.1" stroke="#f5c400" stroke-width="1.4" />
        <line x1="112.4" y1="79.4" x2="110.5" y2="75.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="115.6" y1="78.1" x2="114.3" y2="73.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="119.0" y1="77.2" x2="118.1" y2="72.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="122.5" y1="76.7" x2="122.0" y2="72.2" stroke="#d4a900" stroke-width="0.75" />
    </g>

    <!-- Dial Numerals -->
    <g class="dial-numbers">
      <text x="149.0" y="74.2" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">1</text>
        <text x="165.8" y="91.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">2</text>
        <text x="172.0" y="114.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">3</text>
        <text x="165.8" y="137.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">4</text>
        <text x="149.0" y="153.8" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">5</text>
        <text x="126.0" y="160.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">6</text>
        <text x="103.0" y="153.8" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">7</text>
        <text x="86.2" y="137.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">8</text>
        <text x="80.0" y="114.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">9</text>
        <text x="86.2" y="91.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">10</text>
        <text x="103.0" y="74.2" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">11</text>
        <text x="126.0" y="68.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">12</text>
    </g>

    <!-- Sub-dial second spinner at 6 o'clock -->
    <g id="spinner-left" class="dial-spinner" transform="translate(126, 131)">
      <circle cx="0" cy="0" r="4.5" fill="none" stroke="#f5c400" stroke-width="0.8" />
      <line x1="-7" y1="0" x2="7" y2="0" stroke="#f5c400" stroke-width="0.8" />
      <line x1="0" y1="-7" x2="0" y2="7" stroke="#f5c400" stroke-width="0.8" />
      <polygon points="0,-3 1,-1 3,0 1,1 0,3 -1,1 -3,0 -1,-1" fill="#f5c400" />
    </g>

    <!-- Flag Marker near 12 (Pivot at 122, 73) -->
    <g id="flag-left" class="clock-flag flag-raised" transform="rotate(-12, 122, 73)">
      <path d="M 122 73 L 126 86 L 121 84 Z" fill="#ffffff" />
      <circle cx="122" cy="73" r="1.3" fill="#f5c400" />
    </g>

    <!-- Hand (Pivot at 126, 110) -->
    <g id="hand-left" class="clock-hand" transform="rotate(0, 126, 110)">
      <polygon points="124,110 125,74 127,74 128,110 127,127 125,127" fill="#f5c400" />
      <circle cx="126" cy="121" r="2.5" fill="#f5c400" />
      <circle cx="126" cy="110" r="5" fill="#f5c400" />
      <circle cx="126" cy="110" r="1.8" fill="#181716" />
    </g>
  </g>

  <!-- ================= RIGHT DIAL ================= -->
  <g id="dial-group-right" class="clock-dial-group dial-inactive" data-side="right">
    <circle class="dial-glow-bg" cx="274" cy="110" r="46" fill="rgba(245, 196, 0, 0.05)" />
    
    <!-- Dial Ticks -->
    <g class="dial-ticks">
      <line x1="274.0" y1="80.0" x2="274.0" y2="72.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="277.5" y1="76.7" x2="278.0" y2="72.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="281.0" y1="77.2" x2="281.9" y2="72.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="284.4" y1="78.1" x2="285.7" y2="73.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="287.6" y1="79.4" x2="289.5" y2="75.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="289.0" y1="84.0" x2="293.0" y2="77.1" stroke="#f5c400" stroke-width="1.4" />
        <line x1="293.7" y1="82.9" x2="296.3" y2="79.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="296.4" y1="85.1" x2="299.4" y2="81.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="298.9" y1="87.6" x2="302.2" y2="84.6" stroke="#d4a900" stroke-width="0.75" />
        <line x1="301.1" y1="90.3" x2="304.7" y2="87.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="300.0" y1="95.0" x2="306.9" y2="91.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="304.6" y1="96.4" x2="308.7" y2="94.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="305.9" y1="99.6" x2="310.1" y2="98.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="306.8" y1="103.0" x2="311.2" y2="102.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="307.3" y1="106.5" x2="311.8" y2="106.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="304.0" y1="110.0" x2="312.0" y2="110.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="307.3" y1="113.5" x2="311.8" y2="114.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="306.8" y1="117.0" x2="311.2" y2="117.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="305.9" y1="120.4" x2="310.1" y2="121.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="304.6" y1="123.6" x2="308.7" y2="125.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="300.0" y1="125.0" x2="306.9" y2="129.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="301.1" y1="129.7" x2="304.7" y2="132.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="298.9" y1="132.4" x2="302.2" y2="135.4" stroke="#d4a900" stroke-width="0.75" />
        <line x1="296.4" y1="134.9" x2="299.4" y2="138.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="293.7" y1="137.1" x2="296.3" y2="140.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="289.0" y1="136.0" x2="293.0" y2="142.9" stroke="#f5c400" stroke-width="1.4" />
        <line x1="287.6" y1="140.6" x2="289.5" y2="144.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="284.4" y1="141.9" x2="285.7" y2="146.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="281.0" y1="142.8" x2="281.9" y2="147.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="277.5" y1="143.3" x2="278.0" y2="147.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="274.0" y1="140.0" x2="274.0" y2="148.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="270.5" y1="143.3" x2="270.0" y2="147.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="267.0" y1="142.8" x2="266.1" y2="147.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="263.6" y1="141.9" x2="262.3" y2="146.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="260.4" y1="140.6" x2="258.5" y2="144.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="259.0" y1="136.0" x2="255.0" y2="142.9" stroke="#f5c400" stroke-width="1.4" />
        <line x1="254.3" y1="137.1" x2="251.7" y2="140.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="251.6" y1="134.9" x2="248.6" y2="138.2" stroke="#d4a900" stroke-width="0.75" />
        <line x1="249.1" y1="132.4" x2="245.8" y2="135.4" stroke="#d4a900" stroke-width="0.75" />
        <line x1="246.9" y1="129.7" x2="243.3" y2="132.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="248.0" y1="125.0" x2="241.1" y2="129.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="243.4" y1="123.6" x2="239.3" y2="125.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="242.1" y1="120.4" x2="237.9" y2="121.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="241.2" y1="117.0" x2="236.8" y2="117.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="240.7" y1="113.5" x2="236.2" y2="114.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="244.0" y1="110.0" x2="236.0" y2="110.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="240.7" y1="106.5" x2="236.2" y2="106.0" stroke="#d4a900" stroke-width="0.75" />
        <line x1="241.2" y1="103.0" x2="236.8" y2="102.1" stroke="#d4a900" stroke-width="0.75" />
        <line x1="242.1" y1="99.6" x2="237.9" y2="98.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="243.4" y1="96.4" x2="239.3" y2="94.5" stroke="#d4a900" stroke-width="0.75" />
        <line x1="248.0" y1="95.0" x2="241.1" y2="91.0" stroke="#f5c400" stroke-width="1.4" />
        <line x1="246.9" y1="90.3" x2="243.3" y2="87.7" stroke="#d4a900" stroke-width="0.75" />
        <line x1="249.1" y1="87.6" x2="245.8" y2="84.6" stroke="#d4a900" stroke-width="0.75" />
        <line x1="251.6" y1="85.1" x2="248.6" y2="81.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="254.3" y1="82.9" x2="251.7" y2="79.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="259.0" y1="84.0" x2="255.0" y2="77.1" stroke="#f5c400" stroke-width="1.4" />
        <line x1="260.4" y1="79.4" x2="258.5" y2="75.3" stroke="#d4a900" stroke-width="0.75" />
        <line x1="263.6" y1="78.1" x2="262.3" y2="73.9" stroke="#d4a900" stroke-width="0.75" />
        <line x1="267.0" y1="77.2" x2="266.1" y2="72.8" stroke="#d4a900" stroke-width="0.75" />
        <line x1="270.5" y1="76.7" x2="270.0" y2="72.2" stroke="#d4a900" stroke-width="0.75" />
    </g>

    <!-- Dial Numerals -->
    <g class="dial-numbers">
      <text x="297.0" y="74.2" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">1</text>
        <text x="313.8" y="91.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">2</text>
        <text x="320.0" y="114.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">3</text>
        <text x="313.8" y="137.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">4</text>
        <text x="297.0" y="153.8" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">5</text>
        <text x="274.0" y="160.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">6</text>
        <text x="251.0" y="153.8" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">7</text>
        <text x="234.2" y="137.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">8</text>
        <text x="228.0" y="114.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">9</text>
        <text x="234.2" y="91.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">10</text>
        <text x="251.0" y="74.2" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">11</text>
        <text x="274.0" y="68.0" text-anchor="middle" font-family="'Bebas Neue', 'Oswald', sans-serif" font-size="11.5" fill="#848076">12</text>
    </g>

    <!-- Sub-dial second spinner at 6 o'clock -->
    <g id="spinner-right" class="dial-spinner" transform="translate(274, 131)">
      <circle cx="0" cy="0" r="4.5" fill="none" stroke="#f5c400" stroke-width="0.8" />
      <line x1="-7" y1="0" x2="7" y2="0" stroke="#f5c400" stroke-width="0.8" />
      <line x1="0" y1="-7" x2="0" y2="7" stroke="#f5c400" stroke-width="0.8" />
      <polygon points="0,-3 1,-1 3,0 1,1 0,3 -1,1 -3,0 -1,-1" fill="#f5c400" />
    </g>

    <!-- Flag Marker near 12 (Pivot at 270, 73) -->
    <g id="flag-right" class="clock-flag flag-raised" transform="rotate(-12, 270, 73)">
      <path d="M 270 73 L 274 86 L 269 84 Z" fill="#ffffff" />
      <circle cx="270" cy="73" r="1.3" fill="#f5c400" />
    </g>

    <!-- Hand (Pivot at 274, 110) -->
    <g id="hand-right" class="clock-hand" transform="rotate(0, 274, 110)">
      <polygon points="272,110 273,74 275,74 276,110 275,127 273,127" fill="#f5c400" />
      <circle cx="274" cy="121" r="2.5" fill="#f5c400" />
      <circle cx="274" cy="110" r="5" fill="#f5c400" />
      <circle cx="274" cy="110" r="1.8" fill="#181716" />
    </g>
  </g>
</svg>`,

  getTemplate: function () {
    return this.svgTemplate;
  },

  init: function () {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
    const clockEl = document.querySelector('.analog-chess-clock');
    if (!clockEl) return;

    this.elements = {
      svg: clockEl,
      dialLeft: document.getElementById('dial-group-left'),
      dialRight: document.getElementById('dial-group-right'),
      tagLeft: document.getElementById('dial-tag-left'),
      tagRight: document.getElementById('dial-tag-right'),
      handLeft: document.getElementById('hand-left'),
      handRight: document.getElementById('hand-right'),
      flagLeft: document.getElementById('flag-left'),
      flagRight: document.getElementById('flag-right'),
      spinnerLeft: document.getElementById('spinner-left'),
      spinnerRight: document.getElementById('spinner-right'),
      pusherLeft: document.getElementById('pusher-left'),
      pusherRight: document.getElementById('pusher-right')
    };

    this.isInitialized = true;
    this.update();
  },

  update: function () {
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) return;
    }
    const els = this.elements;
    if (!els || !els.svg) return;

    const clockState = ClockManager.state;
    const isFlipped = (typeof main !== 'undefined' && main.variables && main.variables.orientation === 'b');

    // Dial side assignment (White vs Black) based on board flip
    const colorLeft = isFlipped ? 'b' : 'w';
    const colorRight = isFlipped ? 'w' : 'b';

    const remLeft = colorLeft === 'w' ? clockState.whiteMs : clockState.blackMs;
    const remRight = colorRight === 'w' ? clockState.whiteMs : clockState.blackMs;

    // Header labels
    if (els.tagLeft) els.tagLeft.textContent = isFlipped ? 'BLACK' : 'WHITE';
    if (els.tagRight) els.tagRight.textContent = isFlipped ? 'WHITE' : 'BLACK';

    // Hand angles: full revolution (360 deg) equals total initial time per side
    // The hand sweeps clockwise toward 12 as time runs out
    const initMs = clockState.initialMs || (clockState.isTimed ? 3 * 60 * 1000 : 5 * 60 * 1000);

    let angleLeft = 0;
    let angleRight = 0;

    if (clockState.isTimed && initMs > 0) {
      const elapsedLeft = Math.max(0, initMs - remLeft);
      angleLeft = (elapsedLeft / initMs) * 360;

      const elapsedRight = Math.max(0, initMs - remRight);
      angleRight = (elapsedRight / initMs) * 360;
    }

    if (els.handLeft) els.handLeft.setAttribute('transform', `rotate(${angleLeft.toFixed(2)}, 126, 110)`);
    if (els.handRight) els.handRight.setAttribute('transform', `rotate(${angleRight.toFixed(2)}, 274, 110)`);

    // Flag marker near 12 (starts raised at -12 deg, falls to 26 deg when time hits 0)
    if (els.flagLeft) {
      const leftTimedOut = clockState.isTimed && remLeft <= 0;
      els.flagLeft.setAttribute('transform', leftTimedOut ? 'rotate(26, 122, 73)' : 'rotate(-12, 122, 73)');
      if (leftTimedOut) els.flagLeft.classList.add('flag-fallen');
      else els.flagLeft.classList.remove('flag-fallen');
    }

    if (els.flagRight) {
      const rightTimedOut = clockState.isTimed && remRight <= 0;
      els.flagRight.setAttribute('transform', rightTimedOut ? 'rotate(26, 270, 73)' : 'rotate(-12, 270, 73)');
      if (rightTimedOut) els.flagRight.classList.add('flag-fallen');
      else els.flagRight.classList.remove('flag-fallen');
    }

    // Active glow and inactive dial dimming (60% opacity)
    let activeColor = null;
    if (typeof main !== 'undefined' && main.variables) {
      if (main.variables.gameOver) {
        activeColor = null;
      } else if (clockState.running) {
        activeColor = clockState.activeColor;
      } else {
        activeColor = main.variables.turn || 'w';
      }
    }

    if (els.dialLeft && els.dialRight) {
      if (activeColor === colorLeft) {
        els.dialLeft.classList.add('dial-active');
        els.dialLeft.classList.remove('dial-inactive');
        els.dialRight.classList.remove('dial-active');
        els.dialRight.classList.add('dial-inactive');
      } else if (activeColor === colorRight) {
        els.dialRight.classList.add('dial-active');
        els.dialRight.classList.remove('dial-inactive');
        els.dialLeft.classList.remove('dial-active');
        els.dialLeft.classList.add('dial-inactive');
      } else {
        els.dialLeft.classList.remove('dial-active', 'dial-inactive');
        els.dialRight.classList.remove('dial-active', 'dial-inactive');
      }
    }

    // Pushers: the active player's button is UP (taller) ready to be pressed
    if (els.pusherLeft && els.pusherRight) {
      if (activeColor === colorLeft) {
        els.pusherLeft.classList.remove('pusher-down');
        els.pusherLeft.classList.add('pusher-up');
        els.pusherRight.classList.remove('pusher-up');
        els.pusherRight.classList.add('pusher-down');
      } else if (activeColor === colorRight) {
        els.pusherRight.classList.remove('pusher-down');
        els.pusherRight.classList.add('pusher-up');
        els.pusherLeft.classList.remove('pusher-up');
        els.pusherLeft.classList.add('pusher-down');
      } else {
        els.pusherLeft.classList.add('pusher-up');
        els.pusherLeft.classList.remove('pusher-down');
        els.pusherRight.classList.add('pusher-down');
        els.pusherRight.classList.remove('pusher-up');
      }
    }

    // Spinner rotation during running clock
    const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (clockState.running && !isReduced) {
      this.lastSpinnerAngle = (this.lastSpinnerAngle + 3) % 360;
      if (activeColor === colorLeft && els.spinnerLeft) {
        els.spinnerLeft.setAttribute('transform', `translate(126, 131) rotate(${this.lastSpinnerAngle})`);
      } else if (activeColor === colorRight && els.spinnerRight) {
        els.spinnerRight.setAttribute('transform', `translate(274, 131) rotate(${this.lastSpinnerAngle})`);
      }
    }
  },

  onMoveMade: function (playerWhoMoved, nextPlayer) {
    if (!this.isInitialized) this.init();
    if (!this.elements || !this.elements.svg) return;

    const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      this.update();
      return;
    }

    const isFlipped = (typeof main !== 'undefined' && main.variables && main.variables.orientation === 'b');
    const movedOnLeft = (!isFlipped && playerWhoMoved === 'w') || (isFlipped && playerWhoMoved === 'b');
    const pusherToPress = movedOnLeft ? this.elements.pusherLeft : this.elements.pusherRight;

    if (pusherToPress) {
      pusherToPress.classList.add('pusher-pressing');
      setTimeout(() => {
        if (pusherToPress) pusherToPress.classList.remove('pusher-pressing');
        this.update();
      }, 120);
    } else {
      this.update();
    }
  },

  onReset: function () {
    if (!this.isInitialized) this.init();
    if (!this.elements || !this.elements.svg) return;

    const svg = this.elements.svg;
    svg.classList.add('clock-resetting');
    this.update();

    setTimeout(() => {
      if (svg) svg.classList.remove('clock-resetting');
    }, 450);
  }
};

class ChessClockElement extends (typeof HTMLElement !== 'undefined' ? HTMLElement : Object) {
  connectedCallback() {
    if (!this.querySelector('svg')) {
      this.innerHTML = ChessClock.getTemplate();
    }
    ChessClock.init();
  }
}

if (typeof window !== 'undefined' && window.customElements && !customElements.get('chess-clock')) {
  customElements.define('chess-clock', ChessClockElement);
}


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
    if (typeof GameModeManager !== 'undefined' && GameModeManager.isActionBlocked()) return;

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
// GAME MODE MANAGER (Extensible Plugin Host)
// ==========================================================
const GameModeManager = {
  activeMode: 'standard', // 'standard' | 'uno'
  modes: {},

  register: function (name, modePlugin) {
    this.modes[name] = modePlugin;
  },

  getMode: function (name) {
    return this.modes[name || this.activeMode];
  },

  getModeToggleBtnHtml: function (modeName) {
    const pawnSvg = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M9 8.5h6l-1 4.5h-4z"/><path d="M7.5 17.5l1.5-4.5h6l1.5 4.5z"/><path d="M6 21h12v-2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v2z"/></svg>`;
    const cardsSvg = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="12" height="15" rx="2"/><path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-2"/></svg>`;
    const potholeSvg = `<svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg>`;
    if (modeName === 'uno') return `${cardsSvg} <span>Chess UNO</span>`;
    if (modeName === 'pothole') return `${potholeSvg} <span>Pothole</span>`;
    return `${pawnSvg} <span>Classic</span>`;
  },

  currentMode: function () {
    return this.activeMode;
  },

  setMode: function (modeName) {
    if (this.activeMode === modeName) return true;
    let oldMode = this.modes[this.activeMode];
    if (oldMode && oldMode.onDeactivate) {
      oldMode.onDeactivate();
    }
    this.activeMode = modeName;
    let newMode = this.modes[this.activeMode];
    if (newMode && newMode.onActivate) {
      newMode.onActivate();
    }

    if (typeof $ !== 'undefined') {
      $('#mode-toggle-btn').html(this.getModeToggleBtnHtml(modeName));
      $('body').removeClass('mode-uno mode-pothole');
      if (modeName === 'uno') {
        $('body').addClass('mode-uno');
      } else if (modeName === 'pothole') {
        $('body').addClass('mode-pothole');
      }
    }
    return true;
  },

  isPothole: function (cellId) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.isPothole) {
      return mode.isPothole(cellId);
    }
    return false;
  },

  isKingFrozen: function (color) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.isKingFrozen) {
      return mode.isKingFrozen(color);
    }
    return false;
  },

  isActionBlocked: function () {
    let mode = this.modes[this.activeMode];
    if (mode && mode.isActionBlocked) {
      return mode.isActionBlocked();
    }
    return false;
  },

  usesPseudoLegal: function () {
    let mode = this.modes[this.activeMode];
    return (mode && mode.usesPseudoLegal) ? mode.usesPseudoLegal() : false;
  },

  nextTurnColor: function (prevColor) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.nextTurnColor) {
      return mode.nextTurnColor(prevColor);
    }
    return prevColor === 'w' ? 'b' : 'w';
  },

  shouldHoldTurn: function () {
    let mode = this.modes[this.activeMode];
    return (mode && mode.shouldHoldTurn) ? mode.shouldHoldTurn() : false;
  },

  onTurnHeld: function () {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onTurnHeld) {
      mode.onTurnHeld();
    }
  },

  suppressesCheckLogic: function () {
    let mode = this.modes[this.activeMode];
    return (mode && mode.suppressesCheckLogic) ? mode.suppressesCheckLogic() : false;
  },

  onTurnStart: function (player) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onTurnStart) {
      mode.onTurnStart(player);
    }
  },

  filterLegalMoves: function (pieceKey, moves) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.filterLegalMoves) {
      return mode.filterLegalMoves(pieceKey, moves);
    }
    return moves;
  },

  onMove: function (fromCell, toCell, pieceKey, isCapture) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onMove) {
      mode.onMove(fromCell, toCell, pieceKey, isCapture);
    }
  },

  onCapture: function (capturedKey, capturedPieceObj, capturingKey) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onCapture) {
      mode.onCapture(capturedKey, capturedPieceObj, capturingKey);
    }
  },

  onTurnEnd: function (previousColor, nextColor) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onTurnEnd) {
      mode.onTurnEnd(previousColor, nextColor);
    }
  },

  onReset: function () {
    let mode = this.modes[this.activeMode];
    if (mode && mode.onReset) {
      mode.onReset();
    }
  },

  createSnapshot: function () {
    let mode = this.modes[this.activeMode];
    if (mode && mode.createSnapshot) {
      return mode.createSnapshot();
    }
    return null;
  },

  restoreSnapshot: function (snap) {
    let mode = this.modes[this.activeMode];
    if (mode && mode.restoreSnapshot) {
      mode.restoreSnapshot(snap);
    }
  }
};

// ==========================================================
// PIECE SET CONFIGURATION & UNIFIED GRAPHIC LOOKUP
// Single switchable constant to toggle between 'new' (vector set) and 'old' (original set)
// ==========================================================
const PIECE_SET = 'new'; // 'new' | 'old'

const PIECE_GEOMETRY = {
  P: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 63.80 86.80 L 56.50 63.00 L 57.17 59.74 L 59.58 57.53 L 61.33 54.78 L 62.31 51.67 L 62.45 48.41 L 61.75 45.22 L 60.24 42.33 L 58.03 39.92 L 55.28 38.17 L 52.17 37.19 L 48.91 37.05 L 45.72 37.75 L 42.83 39.26 L 40.42 41.47 L 38.67 44.22 L 37.69 47.33 L 37.55 50.59 L 38.25 53.78 L 39.76 56.67 L 41.97 59.08 L 43.50 63.00 L 36.20 86.80 L 25.00 86.80 Z",
    shades: [
      "M 58.50 100.00 L 75.00 100.00 L 75.00 86.80 L 63.80 86.80 L 56.50 63.00 L 57.17 59.74 L 59.58 57.53 L 61.33 54.78 L 62.31 51.67 L 62.45 48.41 L 61.75 45.22 L 60.24 42.33 L 43.50 63.00 L 51.50 70.00 L 53.80 86.80 L 58.50 86.80 Z"
    ]
  },
  R: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 65.00 86.80 L 61.50 56.00 L 70.00 50.50 L 70.00 29.30 L 62.50 29.30 L 62.50 36.00 L 55.50 36.00 L 55.50 29.30 L 44.50 29.30 L 44.50 36.00 L 37.50 36.00 L 37.50 29.30 L 30.00 29.30 L 30.00 50.50 L 38.50 56.00 L 35.00 86.80 L 25.00 86.80 Z",
    shades: [
      "M 58.50 100.00 L 75.00 100.00 L 75.00 86.80 L 65.00 86.80 L 61.50 56.00 L 70.00 50.50 L 70.00 29.30 L 62.50 29.30 L 62.50 36.00 L 59.00 36.00 L 59.00 50.50 L 52.50 65.00 L 53.80 86.80 L 58.50 86.80 Z",
      "M 50.00 29.30 L 55.50 29.30 L 55.50 36.00 L 50.00 36.00 Z"
    ]
  },
  N: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 62.40 86.80 L 72.00 76.50 L 66.70 70.40 L 73.30 57.40 L 72.80 45.20 L 68.00 35.60 L 57.50 27.40 L 27.60 46.50 L 34.10 55.20 L 40.20 52.20 L 49.80 54.80 L 28.50 76.50 L 38.00 85.20 L 25.00 86.80 Z",
    shades: [
      "M 56.70 48.70 L 50.60 53.90 L 44.50 61.30 L 56.30 60.90 Z",
      "M 55.80 100.00 L 75.00 100.00 L 75.00 86.80 L 62.40 86.80 L 72.00 76.50 L 66.70 70.40 L 73.30 57.40 L 72.80 45.20 L 68.00 35.60 L 57.50 27.40 L 66.30 40.00 L 67.20 56.10 L 56.70 71.70 L 42.40 76.50 L 45.40 86.50 L 55.80 86.80 Z"
    ]
  },
  B: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 65.50 86.80 L 57.30 52.60 L 67.70 39.20 L 50.00 16.80 L 44.00 23.70 L 46.50 28.90 L 41.40 34.50 L 38.40 31.50 L 32.30 38.80 L 42.20 53.50 L 34.00 86.80 L 25.00 86.80 Z",
    shades: [
      "M 58.50 100.00 L 75.00 100.00 L 75.00 86.80 L 65.50 86.80 L 57.30 52.60 L 67.70 39.20 L 53.00 39.20 L 42.20 53.50 L 51.30 60.30 L 53.50 86.20 L 58.50 86.80 Z",
      "M 46.50 28.90 L 49.10 32.30 L 47.40 35.30 L 42.20 35.30 L 41.40 34.50 Z"
    ]
  },
  Q: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 65.80 86.80 L 59.40 52.60 L 73.30 20.00 L 67.20 21.70 L 59.40 35.60 L 62.00 18.30 L 58.50 11.70 L 49.80 33.90 L 40.60 11.70 L 37.20 18.70 L 40.60 23.00 L 39.80 35.60 L 31.50 21.30 L 25.80 20.00 L 39.80 53.00 L 33.30 86.80 L 25.00 86.80 Z",
    shades: [
      "M 58.50 100.00 L 75.00 100.00 L 75.00 86.80 L 65.80 86.80 L 59.40 52.60 L 73.30 20.00 L 67.20 21.70 L 67.20 27.80 L 58.50 36.10 L 58.50 23.00 L 61.50 20.00 L 58.50 12.20 L 50.60 51.30 L 40.20 51.30 L 40.60 53.90 L 51.10 59.60 L 53.30 86.10 L 58.50 86.80 Z",
      "M 40.60 11.70 L 45.40 17.40 L 44.10 23.50 L 49.40 34.40 L 46.30 41.70 Z"
    ]
  },
  K: {
    sil: "M 25.00 100.00 L 75.00 100.00 L 75.00 86.80 L 66.40 86.80 L 57.30 57.80 L 67.20 37.10 L 52.50 26.50 L 52.50 17.50 L 57.50 17.50 L 57.50 12.50 L 52.50 12.50 L 52.50 7.80 L 47.50 7.80 L 47.50 12.50 L 42.50 12.50 L 42.50 17.50 L 47.50 17.50 L 47.50 26.50 L 32.80 37.10 L 41.80 59.50 L 33.60 86.80 L 25.00 86.80 Z",
    shades: [
      "M 58.50 100.00 L 75.00 100.00 L 75.00 86.80 L 66.40 86.80 L 57.30 57.80 L 67.20 37.10 L 53.90 36.60 L 49.60 56.50 L 42.70 56.50 L 42.70 59.10 L 51.30 65.50 L 53.50 85.00 L 58.50 86.80 Z",
      "M 50.00 7.80 L 52.50 7.80 L 52.50 12.50 L 57.50 12.50 L 57.50 17.50 L 52.50 17.50 L 52.50 26.50 L 50.00 26.50 Z"
    ]
  }
};

const PIECE_META = {
  w_king:   { code: 'wK', alt: 'White King' },
  w_queen:  { code: 'wQ', alt: 'White Queen' },
  w_rook:   { code: 'wR', alt: 'White Rook' },
  w_bishop: { code: 'wB', alt: 'White Bishop' },
  w_knight: { code: 'wN', alt: 'White Knight' },
  w_pawn:   { code: 'wP', alt: 'White Pawn' },
  b_king:   { code: 'bK', alt: 'Black King' },
  b_queen:  { code: 'bQ', alt: 'Black Queen' },
  b_rook:   { code: 'bR', alt: 'Black Rook' },
  b_bishop: { code: 'bB', alt: 'Black Bishop' },
  b_knight: { code: 'bN', alt: 'Black Knight' },
  b_pawn:   { code: 'bP', alt: 'Black Pawn' },
  wK: { code: 'wK', alt: 'White King' },
  wQ: { code: 'wQ', alt: 'White Queen' },
  wR: { code: 'wR', alt: 'White Rook' },
  wB: { code: 'wB', alt: 'White Bishop' },
  wN: { code: 'wN', alt: 'White Knight' },
  wP: { code: 'wP', alt: 'White Pawn' },
  bK: { code: 'bK', alt: 'Black King' },
  bQ: { code: 'bQ', alt: 'Black Queen' },
  bR: { code: 'bR', alt: 'Black Rook' },
  bB: { code: 'bB', alt: 'Black Bishop' },
  bN: { code: 'bN', alt: 'Black Knight' },
  bP: { code: 'bP', alt: 'Black Pawn' }
};

/**
 * Unified lookup function for all chess piece artwork across the application.
 * All piece rendering routes through this single function.
 *
 * @param {string} pieceKey - e.g. 'w_king', 'wK', 'b_pawn', 'bP'
 * @param {object} [options] - Optional rendering settings { className, alt, noFacet }
 * @returns {string} Markup string (SVG or IMG)
 */
function getPieceGraphic(pieceKey, options = {}) {
  const meta = PIECE_META[pieceKey] || { code: pieceKey, alt: pieceKey };
  const code = meta.code;
  const isWhite = code.startsWith('w');
  const typeChar = code.charAt(1).toUpperCase();
  const alt = options.alt || meta.alt;
  const baseClass = options.className || 'chess-piece';
  const colorClass = isWhite ? 'piece-white' : 'piece-black';

  if (PIECE_SET === 'old') {
    return `<img class="${baseClass} ${colorClass}" src="./assets/pieces-old/${code}.svg" alt="${alt}">`;
  }

  const geom = PIECE_GEOMETRY[typeChar];
  if (!geom) {
    return `<img class="${baseClass} ${colorClass}" src="./assets/pieces/${code}.svg" alt="${alt}">`;
  }

  const mainFill = isWhite ? 'var(--piece-w, #f4f4f2)' : 'var(--piece-b, #2b2b2b)';
  const shadeFill = isWhite ? 'var(--piece-w-shade, #d3d5d5)' : 'var(--piece-b-shade, #151515)';

  let shadesHtml = '';
  if (!options.noFacet && geom.shades) {
    for (let s of geom.shades) {
      shadesHtml += `<path class="piece-shade" d="${s}" fill="${shadeFill}" />`;
    }
  }

  return `<svg class="${baseClass} ${colorClass}" viewBox="0 0 100 100" role="img" aria-label="${alt}"><path class="piece-main" d="${geom.sil}" fill="${mainFill}" />${shadesHtml}</svg>`;
}

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
    getPieceGraphic: getPieceGraphic,

    getInitialPieces: function () {
      const pSvg = {
        w_king:    this.getPieceGraphic('w_king'),
        w_queen:   this.getPieceGraphic('w_queen'),
        w_rook:    this.getPieceGraphic('w_rook'),
        w_bishop:  this.getPieceGraphic('w_bishop'),
        w_knight:  this.getPieceGraphic('w_knight'),
        w_pawn:    this.getPieceGraphic('w_pawn'),
        b_king:    this.getPieceGraphic('b_king'),
        b_queen:   this.getPieceGraphic('b_queen'),
        b_rook:    this.getPieceGraphic('b_rook'),
        b_bishop:  this.getPieceGraphic('b_bishop'),
        b_knight:  this.getPieceGraphic('b_knight'),
        b_pawn:    this.getPieceGraphic('b_pawn')
      };

      return {
        w_king:    { position: '5_1', img: pSvg.w_king,   type: 'w_king',   moved: false, captured: false },
        w_queen:   { position: '4_1', img: pSvg.w_queen,  type: 'w_queen',  moved: false, captured: false },
        w_rook1:   { position: '1_1', img: pSvg.w_rook,   type: 'w_rook',   moved: false, captured: false },
        w_rook2:   { position: '8_1', img: pSvg.w_rook,   type: 'w_rook',   moved: false, captured: false },
        w_bishop1: { position: '3_1', img: pSvg.w_bishop, type: 'w_bishop', moved: false, captured: false },
        w_bishop2: { position: '6_1', img: pSvg.w_bishop, type: 'w_bishop', moved: false, captured: false },
        w_knight1: { position: '2_1', img: pSvg.w_knight, type: 'w_knight', moved: false, captured: false },
        w_knight2: { position: '7_1', img: pSvg.w_knight, type: 'w_knight', moved: false, captured: false },
        w_pawn1:   { position: '1_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn2:   { position: '2_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn3:   { position: '3_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn4:   { position: '4_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn5:   { position: '5_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn6:   { position: '6_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn7:   { position: '7_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },
        w_pawn8:   { position: '8_2', img: pSvg.w_pawn,   type: 'w_pawn',   moved: false, captured: false },

        b_king:    { position: '5_8', img: pSvg.b_king,   type: 'b_king',   moved: false, captured: false },
        b_queen:   { position: '4_8', img: pSvg.b_queen,  type: 'b_queen',  moved: false, captured: false },
        b_rook1:   { position: '1_8', img: pSvg.b_rook,   type: 'b_rook',   moved: false, captured: false },
        b_rook2:   { position: '8_8', img: pSvg.b_rook,   type: 'b_rook',   moved: false, captured: false },
        b_bishop1: { position: '3_8', img: pSvg.b_bishop, type: 'b_bishop', moved: false, captured: false },
        b_bishop2: { position: '6_8', img: pSvg.b_bishop, type: 'b_bishop', moved: false, captured: false },
        b_knight1: { position: '2_8', img: pSvg.b_knight, type: 'b_knight', moved: false, captured: false },
        b_knight2: { position: '7_8', img: pSvg.b_knight, type: 'b_knight', moved: false, captured: false },
        b_pawn1:   { position: '1_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn2:   { position: '2_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn3:   { position: '3_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn4:   { position: '4_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn5:   { position: '5_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn6:   { position: '6_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn7:   { position: '7_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false },
        b_pawn8:   { position: '8_7', img: pSvg.b_pawn,   type: 'b_pawn',   moved: false, captured: false }
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

    // ignorePotholesOwnedBy: when supplied, potholes owned by that colour are
    // transparent for attack-ray purposes.  Used by the king-safety check so
    // that the opponent's own potholes cannot act as a temporary shield for the
    // moving side's king (they will be gone when the opponent actually moves).
    getAttackSquaresFrom: function (pieceKey, fromCellId, board, ignorePotholesOwnedBy) {
      let color = main.methods.pieceColor(pieceKey);
      let type = main.methods.pieceTypeOf(pieceKey);
      let { col, row } = main.methods.parseCell(fromCellId);
      let attacks = [];

      // Helper: is this cell an opaque pothole for this call?
      const isBlockingPothole = (id) => {
        if (typeof GameModeManager === 'undefined' || !GameModeManager.isPothole(id)) return false;
        if (ignorePotholesOwnedBy) {
          // Transparent if the pothole belongs to the colour we're ignoring
          let mode = GameModeManager.modes && GameModeManager.modes['pothole'];
          if (mode && mode.state) {
            let ph = mode.state.potholes.find(p => p.cellId === id);
            if (ph && ph.owner === ignorePotholesOwnedBy) return false; // see-through
          }
        }
        return true; // opaque
      };

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
            if (board[id] || isBlockingPothole(id)) break;
            c += dc; r += dr;
          }
        });
      }
      return attacks;
    },

    isSquareAttacked: function (targetCellId, byColor, board, ignorePotholesOwnedBy) {
      for (let cellId in board) {
        let key = board[cellId];
        if (!key) continue;
        if (main.methods.pieceColor(key) !== byColor) continue;
        let attacks = main.methods.getAttackSquaresFrom(key, cellId, board, ignorePotholesOwnedBy);
        if (attacks.indexOf(targetCellId) !== -1) return true;
      }
      return false;
    },

    getPseudoMoves: function (pieceKey, board) {
      if (!board) board = main.methods.getBoard();
      let obj = main.variables.pieces[pieceKey];
      if (!obj || obj.captured || !obj.position) return [];

      let color = main.methods.pieceColor(pieceKey);
      let type = main.methods.pieceTypeOf(pieceKey);
      let { col, row } = main.methods.parseCell(obj.position);
      let moves = [];
      let isPothole = (id) => (typeof GameModeManager !== 'undefined' && GameModeManager.isPothole(id));

      if (type === 'pawn') {
        let dir = color === 'w' ? 1 : -1;
        let startRow = color === 'w' ? 2 : 7;

        let oneStep = main.methods.cellId(col, row + dir);
        if (main.methods.inBounds(col, row + dir) && !board[oneStep] && !isPothole(oneStep)) {
          moves.push(oneStep);
          let twoStep = main.methods.cellId(col, row + 2 * dir);
          if (row === startRow && !board[twoStep] && !isPothole(twoStep)) {
            moves.push(twoStep);
          }
        }

        [[col - 1, row + dir], [col + 1, row + dir]].forEach(([c, r]) => {
          if (main.methods.inBounds(c, r)) {
            let id = main.methods.cellId(c, r);
            if (board[id] && main.methods.pieceColor(board[id]) !== color && !isPothole(id)) {
              moves.push(id);
            }
          }
        });

        if (main.variables.enPassantTarget && main.variables.enPassantTarget.color !== color) {
          let ep = main.variables.enPassantTarget;
          let epRow = color === 'w' ? 5 : 4;
          if (row === epRow && (col - 1 === ep.col || col + 1 === ep.col)) {
            let epDest = main.methods.cellId(ep.col, row + dir);
            if (epDest === ep.cell && !isPothole(epDest)) {
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
            if ((!board[id] || main.methods.pieceColor(board[id]) !== color) && !isPothole(id)) {
              moves.push(id);
            }
          }
        });
      } else if (type === 'king') {
        if (typeof GameModeManager !== 'undefined' && GameModeManager.isKingFrozen(color)) {
          return [];
        }

        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            let c = col + dc, r = row + dr;
            if (main.methods.inBounds(c, r)) {
              let id = main.methods.cellId(c, r);
              if ((!board[id] || main.methods.pieceColor(board[id]) !== color) && !isPothole(id)) {
                moves.push(id);
              }
            }
          }
        }

        if (!obj.moved && !obj.captured) {
          let oppColor = color === 'w' ? 'b' : 'w';
          let rank = color === 'w' ? 1 : 8;
          let kingStart = main.methods.cellId(5, rank);
          let skipAttacked = (typeof GameModeManager !== 'undefined' && GameModeManager.usesPseudoLegal());

          if (board[kingStart] === pieceKey && !isPothole(kingStart) && (skipAttacked || !main.methods.isSquareAttacked(kingStart, oppColor, board, oppColor))) {
            let rookKSKey = color + '_rook2';
            let rookKS = main.variables.pieces[rookKSKey];
            if (rookKS && !rookKS.moved && !rookKS.captured && board[main.methods.cellId(8, rank)] === rookKSKey && !isPothole(main.methods.cellId(8, rank))) {
              let f = main.methods.cellId(6, rank);
              let g = main.methods.cellId(7, rank);
              if (!board[f] && !board[g] && !isPothole(f) && !isPothole(g) &&
                  (skipAttacked || (!main.methods.isSquareAttacked(f, oppColor, board, oppColor) &&
                                    !main.methods.isSquareAttacked(g, oppColor, board, oppColor)))) {
                moves.push(g + '_castleKS');
              }
            }

            let rookQSKey = color + '_rook1';
            let rookQS = main.variables.pieces[rookQSKey];
            if (rookQS && !rookQS.moved && !rookQS.captured && board[main.methods.cellId(1, rank)] === rookQSKey && !isPothole(main.methods.cellId(1, rank))) {
              let d = main.methods.cellId(4, rank);
              let c = main.methods.cellId(3, rank);
              let b = main.methods.cellId(2, rank);
              if (!board[d] && !board[c] && !board[b] && !isPothole(d) && !isPothole(c) && !isPothole(b) &&
                  (skipAttacked || (!main.methods.isSquareAttacked(d, oppColor, board, oppColor) &&
                                    !main.methods.isSquareAttacked(c, oppColor, board, oppColor)))) {
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
            if (isPothole(id)) break;
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
      let oppColor = color === 'w' ? 'b' : 'w';
      let legal = [];

      if (typeof GameModeManager !== 'undefined' && GameModeManager.usesPseudoLegal()) {
        legal = pseudo;
      } else {
        pseudo.forEach(moveToken => {
          let simulated = main.methods.simulateMove(board, pieceKey, moveToken);
          let kingCell = main.methods.findKingCell(color, simulated);
          // In Pothole mode, judge the king's safety as if the opponent's potholes
          // were already gone — they will be removed at the end of this turn before
          // the opponent moves, so they cannot permanently shield our king from attacks.
          // Own potholes are still opaque (they survive into the opponent's turn).
          if (kingCell && !main.methods.isSquareAttacked(kingCell, oppColor, simulated, oppColor)) {
            legal.push(moveToken);
          }
        });
      }
      if (typeof GameModeManager !== 'undefined') {
        legal = GameModeManager.filterLegalMoves(pieceKey, legal);
      }
      return legal;
    },

    isInCheck: function (color, optBoard, ignorePotholesOwnedBy) {
      let board = optBoard || main.methods.getBoard();
      let kingCell = main.methods.findKingCell(color, board);
      if (!kingCell) return false;
      let oppColor = color === 'w' ? 'b' : 'w';
      return main.methods.isSquareAttacked(kingCell, oppColor, board, ignorePotholesOwnedBy);
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

      // Include pothole state so that positions identical on the board but with
      // different potholes are correctly treated as distinct (potholes change
      // which moves are legal, so they must be part of the repetition key).
      let potholeStr = '-';
      if (typeof GameModeManager !== 'undefined' &&
          GameModeManager.activeMode === 'pothole') {
        let mode = GameModeManager.modes['pothole'];
        if (mode && mode.state && mode.state.potholes.length > 0) {
          // Sort so key is order-independent
          potholeStr = mode.state.potholes
            .map(p => p.square + ':' + p.owner)
            .sort()
            .join(',');
        }
      }

      return `${placement} ${turn} ${castling} ${epStr} ${potholeStr}`;
    },

    checkDrawConditions: function (color) {
      if (main.variables.halfmoveClock >= 100) {
        main.variables.gameOver = true;
        ClockManager.stop();
        $('#turn').addClass('turnhighlight').text('DRAW BY 50-MOVE RULE');
        BoardStatusOverlay.show('Draw', '50-move rule', { isGameOver: true });
        $('#rematch-btn').addClass('highlight-rematch');
        main.methods.updateMoveHistoryUI();
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
        BoardStatusOverlay.show('Draw', 'Threefold repetition', { isGameOver: true });
        $('#rematch-btn').addClass('highlight-rematch');
        main.methods.updateMoveHistoryUI();
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
        clockBlackMs: ClockManager.state.blackMs,
        orientation: main.variables.orientation,
        modeSnapshot: (typeof GameModeManager !== 'undefined') ? GameModeManager.createSnapshot() : null
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

      if (snap.orientation !== undefined) {
        let prevOrient = main.variables.orientation;
        main.variables.orientation = snap.orientation;
        if (snap.orientation === 'b') {
          $('#board-stage').addClass('orientation-black');
        } else {
          $('#board-stage').removeClass('orientation-black');
        }
        if (prevOrient !== snap.orientation) {
          main.methods.renderBoard();
          main.methods.updatePlayerBars();
        }
      }

      if (snap.clockWhiteMs !== undefined) ClockManager.state.whiteMs = snap.clockWhiteMs;
      if (snap.clockBlackMs !== undefined) ClockManager.state.blackMs = snap.clockBlackMs;
      ClockManager.state.activeColor = snap.gameOver ? null : snap.turn;
      ClockManager.updateDisplay();

      if (typeof GameModeManager !== 'undefined' && snap.modeSnapshot) {
        GameModeManager.restoreSnapshot(snap.modeSnapshot);
      }

      main.methods.gamesetup();
      $('#captured-black .captured-pieces-list').html(snap.capturedBlackHtml || '');
      $('#captured-white .captured-pieces-list').html(snap.capturedWhiteHtml || '');
      $('#promotion-modal').css('display', 'none');

      if (snap.statusClass) {
        $('#turn').addClass('turnhighlight').text(snap.statusText);
      } else {
        $('#turn').removeClass('turnhighlight').text(snap.statusText);
      }

      if (snap.gameOver) {
        let t = snap.statusText || '';
        let bannerText = 'Checkmate!';
        let subText = '';
        if (t.includes('Checkmate')) {
          bannerText = 'Checkmate!';
          subText = t.replace('Checkmate!', '').trim() || 'Wins by checkmate';
        } else if (t.includes('Stalemate')) {
          bannerText = 'Stalemate';
          subText = "Draw by stalemate";
        } else if (t.includes('TIME OUT') || t.includes('Time out')) {
          bannerText = 'Time out';
          subText = t.replace('TIME OUT —', '').trim();
        } else if (t.includes('DRAW') || t.includes('draw')) {
          bannerText = 'Draw';
          subText = t.replace('DRAW BY', '').trim();
        } else if (t.includes('Resign') || t.includes('resign')) {
          bannerText = 'Resigned';
          subText = t;
        } else {
          bannerText = 'Game over';
          subText = t;
        }
        BoardStatusOverlay.show(bannerText, subText, { isGameOver: true });
        $('#rematch-btn').addClass('highlight-rematch');
      } else {
        BoardStatusOverlay.hide();
        $('#rematch-btn').removeClass('highlight-rematch');
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
    formatSANWithIcon: function (san, color) {
      if (!san) return '';
      let rest = san;
      let prefix = color === 'w' ? 'w' : 'b';
      let pieceLetter = '';

      if (san.startsWith('N')) {
        pieceLetter = 'N';
        rest = san.slice(1);
      } else if (san.startsWith('B')) {
        pieceLetter = 'B';
        rest = san.slice(1);
      } else if (san.startsWith('R')) {
        pieceLetter = 'R';
        rest = san.slice(1);
      } else if (san.startsWith('Q')) {
        pieceLetter = 'Q';
        rest = san.slice(1);
      } else if (san.startsWith('K')) {
        pieceLetter = 'K';
        rest = san.slice(1);
      } else {
        pieceLetter = '';
        rest = san;
      }

      if (pieceLetter) {
        let iconHtml = this.getPieceGraphic(prefix + pieceLetter, {
          className: 'hist-piece-icon ' + (color === 'w' ? 'icon-white' : 'icon-black') + ' no-facet',
          noFacet: true
        });
        return `${iconHtml}<span class="move-text">${rest}</span>`;
      }
      return `<span class="move-text">${rest}</span>`;
    },

    updateMoveHistoryUI: function () {
      let html = '<table class="history-table"><tbody>';
      let history = main.variables.moveHistory;

      for (let i = 0; i < history.length; i += 2) {
        let moveNum = Math.floor(i / 2) + 1;
        let isLatestWhite = i === history.length - 1;
        let isLatestBlack = (i + 1) === history.length - 1;

        let whiteFormatted = history[i] ? main.methods.formatSANWithIcon(history[i].san, 'w') : '';
        let blackFormatted = history[i + 1] ? main.methods.formatSANWithIcon(history[i + 1].san, 'b') : '';

        html += `
          <tr>
            <td class="hist-num">${moveNum}</td>
            <td class="hist-san ${isLatestWhite ? 'current-move' : ''}">${whiteFormatted}</td>
            <td class="hist-san ${isLatestBlack ? 'current-move' : ''}">${blackFormatted}</td>
          </tr>
        `;
      }
      html += '</tbody></table>';

      $('#move-history-list').html(html);
      let listEl = (typeof document !== 'undefined') ? document.getElementById('move-history-list') : null;
      if (listEl) listEl.scrollTop = listEl.scrollHeight;

      let resEl = $('#history-result');
      if (main.variables.gameOver) {
        let text = $('#turn').text();
        let res = '½–½';
        if (text.includes('White wins') || text.includes('WHITE WINS')) {
          res = '1–0';
        } else if (text.includes('Black wins') || text.includes('BLACK WINS')) {
          res = '0–1';
        }
        resEl.text(res);
        if (typeof resEl.css === 'function') resEl.css('display', 'inline-block');
      } else {
        resEl.text('');
        if (typeof resEl.css === 'function') resEl.css('display', 'none');
      }
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

    // ---------- Visual Highlights & Flip ----------
    flipBoard: function () {
      main.variables.orientation = main.variables.orientation === 'w' ? 'b' : 'w';
      if (main.variables.orientation === 'b') {
        $('#board-stage').addClass('orientation-black');
      } else {
        $('#board-stage').removeClass('orientation-black');
      }
      main.methods.renderBoard();
      main.methods.gamesetup();
      main.methods.updateVisualHighlights();
      main.methods.updateNavButtons();
      main.methods.updatePlayerBars();
    },

    updatePlayerBars: function () {
      if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
      let isWhite = main.variables.orientation === 'w';

      let topMeta = document.getElementById('top-player-meta');
      let botMeta = document.getElementById('bottom-player-meta');
      let topClockSlot = document.getElementById('top-clock-slot');
      let botClockSlot = document.getElementById('bottom-clock-slot');
      let topMatSlot = document.getElementById('top-material-slot');
      let botMatSlot = document.getElementById('bottom-material-slot');
      let clockWhite = document.getElementById('clock-white');
      let clockBlack = document.getElementById('clock-black');
      let matWhite = document.getElementById('material-group-white');
      let matBlack = document.getElementById('material-group-black');

      if (isWhite) {
        if (topMeta) topMeta.textContent = 'Black';
        if (botMeta) botMeta.textContent = 'White';
        if (topClockSlot && clockBlack && clockBlack.parentNode !== topClockSlot) topClockSlot.appendChild(clockBlack);
        if (botClockSlot && clockWhite && clockWhite.parentNode !== botClockSlot) botClockSlot.appendChild(clockWhite);
        if (topMatSlot && matBlack && matBlack.parentNode !== topMatSlot) topMatSlot.appendChild(matBlack);
        if (botMatSlot && matWhite && matWhite.parentNode !== botMatSlot) botMatSlot.appendChild(matWhite);
      } else {
        if (topMeta) topMeta.textContent = 'White';
        if (botMeta) botMeta.textContent = 'Black';
        if (topClockSlot && clockWhite && clockWhite.parentNode !== topClockSlot) topClockSlot.appendChild(clockWhite);
        if (botClockSlot && clockBlack && clockBlack.parentNode !== botClockSlot) botClockSlot.appendChild(clockBlack);
        if (topMatSlot && matWhite && matWhite.parentNode !== topMatSlot) topMatSlot.appendChild(matWhite);
        if (botMatSlot && matBlack && matBlack.parentNode !== botMatSlot) botMatSlot.appendChild(matBlack);
      }
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
      let rookFrom = rookObj.position;

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

      main.methods.animatePieceSlide(fromCell, kingTarget);
      main.methods.animatePieceSlide(rookFrom, rookTarget);

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
        if (typeof GameModeManager !== 'undefined') {
          GameModeManager.onCapture(capturedPieceName, capturedPieceObj, selectedKey);
        }
        if (main.variables.gameOver) {
          $('#' + targetCellId).html(pieceObj.img).attr('chess', selectedKey);
          $('#' + fromCell).html('&nbsp;').attr('chess', 'null');
          pieceObj.position = targetCellId;
          pieceObj.moved = true;
          main.variables.lastMove = { from: fromCell, to: targetCellId };
          main.methods.updateVisualHighlights();
          return;
        }
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

      main.methods.animatePieceSlide(fromCell, targetCellId);

      if (typeof GameModeManager !== 'undefined') {
        GameModeManager.onMove(fromCell, targetCellId, selectedKey, true);
      }

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

    getThreatenedSquares: function (color) {
      let board = main.methods.getBoard();
      let oppColor = color === 'w' ? 'b' : 'w';
      let threatenedSet = new Set();

      for (let pieceKey in main.variables.pieces) {
        let p = main.variables.pieces[pieceKey];
        if (p.captured || !p.position) continue;
        if (main.methods.pieceColor(pieceKey) !== oppColor) continue;

        let legalMoves = main.methods.getLegalMoves(pieceKey);
        legalMoves.forEach(moveToken => {
          if (moveToken.includes('_castle')) return;

          if (moveToken.includes('_ep')) {
            if (main.variables.enPassantTarget && main.variables.enPassantTarget.color === color) {
              threatenedSet.add(main.variables.enPassantTarget.pawnCell);
            }
          } else {
            let targetId = moveToken.indexOf('_') !== -1 ? moveToken.split('_').slice(0, 2).join('_') : moveToken;
            let occupantKey = board[targetId];
            if (occupantKey && occupantKey !== 'null' && main.methods.pieceColor(occupantKey) === color) {
              threatenedSet.add(targetId);
            }
          }
        });
      }

      return Array.from(threatenedSet);
    },

    getThreatHighlightSquares: function () {
      let board = main.methods.getBoard();
      let highlightSet = new Set();

      for (let pieceKey in main.variables.pieces) {
        let p = main.variables.pieces[pieceKey];
        if (p.captured || !p.position) continue;
        let pColor = main.methods.pieceColor(pieceKey);

        let legalMoves = main.methods.getLegalMoves(pieceKey);
        legalMoves.forEach(moveToken => {
          if (moveToken.includes('_castle')) return;

          if (moveToken.includes('_ep')) {
            if (main.variables.enPassantTarget && main.variables.enPassantTarget.color !== pColor) {
              highlightSet.add(p.position);
              highlightSet.add(main.variables.enPassantTarget.pawnCell);
            }
          } else {
            let targetId = moveToken.indexOf('_') !== -1 ? moveToken.split('_').slice(0, 2).join('_') : moveToken;
            let occupantKey = board[targetId];
            if (occupantKey && occupantKey !== 'null' && main.methods.pieceColor(occupantKey) !== pColor) {
              highlightSet.add(p.position);
              highlightSet.add(targetId);
            }
          }
        });
      }

      return Array.from(highlightSet);
    },

    updateVisualHighlights: function () {
      $('.gamecell').removeClass('green yellow red in-check last-move-from last-move-to threatened-piece');

      let color = main.variables.turn;

      // 1. Highlight previous move squares
      if (main.variables.lastMove) {
        $('#' + main.variables.lastMove.from).addClass('last-move-from');
        $('#' + main.variables.lastMove.to).addClass('last-move-to');
      }

      // 2. Highlight selected square and legal destination targets (green for quiet moves, red for captures)
      if (main.variables.selectedpiece) {
        $('#' + main.variables.selectedpiece).addClass('yellow');
        let key = $('#' + main.variables.selectedpiece).attr('chess');
        let legal = main.methods.getLegalMoves(key);
        main.variables.highlighted = legal;
        let board = main.methods.getBoard();
        let myColor = main.methods.pieceColor(key);

        legal.forEach(m => {
          let target = m.indexOf('_') !== -1 ? m.split('_').slice(0, 2).join('_') : m;
          let isCapture = false;

          if (m.includes('_ep')) {
            isCapture = true;
          } else {
            let occupant = board[target];
            if (occupant && occupant !== 'null' && main.methods.pieceColor(occupant) !== myColor) {
              isCapture = true;
            }
          }

          if (isCapture) {
            $('#' + target).addClass('red');
          } else {
            $('#' + target).addClass('green');
          }
        });
      }

      // 3. King in check takes top priority for red check danger highlight
      let suppressCheck = (typeof GameModeManager !== 'undefined' && GameModeManager.suppressesCheckLogic());
      if (!suppressCheck && main.methods.isInCheck(color)) {
        let kingCell = main.methods.findKingCell(color, main.methods.getBoard());
        if (kingCell) {
          $('#' + kingCell).addClass('red in-check');
        }
      }

      // 4. Update avatar active-turn ring on the side to move
      let isWhite = main.variables.orientation === 'w';
      let isBottomTurn = (isWhite && color === 'w') || (!isWhite && color === 'b');
      $('#top-avatar, #bottom-avatar, .avatar-circle').removeClass('active-turn');
      if (isBottomTurn) {
        $('#bottom-avatar').addClass('active-turn');
      } else {
        $('#top-avatar').addClass('active-turn');
      }

      main.methods.updateLastMoveArrow();
      main.methods.updateMaterialAdvantage();
    },

    updateLastMoveArrow: function () {
      if (typeof document === 'undefined') return;
      let arrow = document.getElementById('last-move-arrow');
      if (!arrow) return;

      if (!main.variables.lastMove || !main.variables.lastMove.from || !main.variables.lastMove.to) {
        arrow.style.display = 'none';
        return;
      }

      let fromEl = document.getElementById(main.variables.lastMove.from);
      let toEl = document.getElementById(main.variables.lastMove.to);
      let wrapperEl = document.getElementById('board-wrapper');

      if (!fromEl || !toEl || !wrapperEl) {
        arrow.style.display = 'none';
        return;
      }

      let wrapRect = wrapperEl.getBoundingClientRect();
      let fromRect = fromEl.getBoundingClientRect();
      let toRect = toEl.getBoundingClientRect();

      if (wrapRect.width === 0 || wrapRect.height === 0) {
        arrow.style.display = 'none';
        return;
      }

      let overlaySvg = document.getElementById('board-arrow-overlay');
      if (overlaySvg) {
        overlaySvg.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
      }

      let x1 = fromRect.left + fromRect.width / 2 - wrapRect.left;
      let y1 = fromRect.top + fromRect.height / 2 - wrapRect.top;
      let x2 = toRect.left + toRect.width / 2 - wrapRect.left;
      let y2 = toRect.top + toRect.height / 2 - wrapRect.top;

      let dx = x2 - x1;
      let dy = y2 - y1;
      let dist = Math.hypot(dx, dy);

      if (dist < 8) {
        arrow.style.display = 'none';
        return;
      }

      // Shorten so arrowhead stops at destination square edge and does not cover piece
      let sqRadius = toRect.width * 0.48;
      let shorten = Math.min(dist * 0.45, sqRadius + 4);
      let arrowX2 = x2 - (dx / dist) * shorten;
      let arrowY2 = y2 - (dy / dist) * shorten;

      arrow.setAttribute('x1', x1);
      arrow.setAttribute('y1', y1);
      arrow.setAttribute('x2', arrowX2);
      arrow.setAttribute('y2', arrowY2);
      arrow.style.display = 'block';
    },

    updateMaterialAdvantage: function () {
      if (typeof $ === 'undefined') return;
      let pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 };
      let whiteScore = 0;
      let blackScore = 0;

      for (let key in main.variables.pieces) {
        let p = main.variables.pieces[key];
        if (p.captured) {
          let type = p.type.split('_')[1];
          let val = pieceValues[type] || 0;
          if (p.type.startsWith('b_')) {
            whiteScore += val;
          } else if (p.type.startsWith('w_')) {
            blackScore += val;
          }
        }
      }

      let whiteAdv = whiteScore - blackScore;
      let blackAdv = blackScore - whiteScore;

      if (whiteAdv > 0) {
        let elW = $('#material-white');
        elW.text('+' + whiteAdv);
        if (typeof elW.css === 'function') elW.css('display', 'inline-flex');
        $('#material-group-white').css('display', 'inline-flex');
        $('#material-group-black').css('display', 'none');
      } else if (blackAdv > 0) {
        let elB = $('#material-black');
        elB.text('+' + blackAdv);
        if (typeof elB.css === 'function') elB.css('display', 'inline-flex');
        $('#material-group-black').css('display', 'inline-flex');
        $('#material-group-white').css('display', 'none');
      } else {
        $('#material-group-white').css('display', 'none');
        $('#material-group-black').css('display', 'none');
      }
    },

    animatePieceSlide: function (fromCellId, toCellId) {
      if (typeof document === 'undefined' || typeof window === 'undefined') return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      let fromEl = document.getElementById(fromCellId);
      let toEl = document.getElementById(toCellId);
      if (!fromEl || !toEl) return;

      let fromRect = fromEl.getBoundingClientRect();
      let toRect = toEl.getBoundingClientRect();
      if (!fromRect.left || !toRect.left) return;

      let pieceImg = toEl.querySelector('.chess-piece');
      if (!pieceImg) return;

      let dx = fromRect.left - toRect.left;
      let dy = fromRect.top - toRect.top;

      pieceImg.style.transform = `translate(${dx}px, ${dy}px)`;
      pieceImg.style.transition = 'none';

      requestAnimationFrame(() => {
        pieceImg.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0.2, 1)';
        pieceImg.style.transform = 'translate(0, 0)';
      });
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

      main.methods.animatePieceSlide(fromCell, target.id);

      if (typeof GameModeManager !== 'undefined') {
        GameModeManager.onMove(fromCell, target.id, selectedpiece, false);
      }

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

      main.methods.animatePieceSlide(fromCell, target.id);

      if (capturedPieceObj) {
        capturedPieceObj.captured = true;
        capturedPieceObj.moved = true;
        capturedPieceObj.position = '';

        if (typeof GameModeManager !== 'undefined') {
          GameModeManager.onCapture(capturedPieceName, capturedPieceObj, selectedKey);
        }
        if (main.variables.gameOver) {
          main.variables.lastMove = { from: fromCell, to: target.id };
          main.methods.updateVisualHighlights();
          return;
        }
        if (capturedPieceName.startsWith('b_')) {
          $('#captured-black .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        } else if (capturedPieceName.startsWith('w_')) {
          $('#captured-white .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
        }
      }

      if (typeof GameModeManager !== 'undefined') {
        GameModeManager.onMove(fromCell, target.id, selectedKey, true);
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
      let prefix = isWhite ? 'w_' : 'b_';
      let qImg = this.getPieceGraphic(prefix + 'queen');
      let rImg = this.getPieceGraphic(prefix + 'rook');
      let bImg = this.getPieceGraphic(prefix + 'bishop');
      let nImg = this.getPieceGraphic(prefix + 'knight');

      let optionsHtml = `
        <div class="promo-choice" data-type="${prefix}queen">${qImg}</div>
        <div class="promo-choice" data-type="${prefix}rook">${rImg}</div>
        <div class="promo-choice" data-type="${prefix}bishop">${bImg}</div>
        <div class="promo-choice" data-type="${prefix}knight">${nImg}</div>
      `;

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

      if (typeof GameModeManager !== 'undefined' && GameModeManager.shouldHoldTurn()) {
        main.methods.updateVisualHighlights();
        main.methods.updateMoveHistoryUI();
        main.methods.updateNavButtons();
        if (GameModeManager.onTurnHeld) {
          GameModeManager.onTurnHeld();
        }
        return;
      }

      if (main.variables.gameOver) {
        return;
      }

      if (main.variables.turn === 'b') {
        main.variables.fullmoveNumber += 1;
      }
      main.variables.turn = (typeof GameModeManager !== 'undefined')
        ? GameModeManager.nextTurnColor(previousColor)
        : (previousColor === 'w' ? 'b' : 'w');
      let color = main.variables.turn;

      // In Pothole mode, defer checkmate/stalemate to evaluatePostRollGameStatus
      // which runs AFTER pothole removal (onTurnEnd) and the new roll. Evaluating
      // here would see stale potholes still on the board, causing false stalemates
      // or ending the game before the incoming player has a chance to roll (R5, R10, R11).
      let potholeActive = (typeof GameModeManager !== 'undefined' &&
                           GameModeManager.currentMode() === 'pothole');
      let suppressCheck = (typeof GameModeManager !== 'undefined' &&
                           GameModeManager.suppressesCheckLogic());

      // In Pothole mode also judge check with the opponent's (= previousColor's) potholes
      // treated as transparent — they will be gone before the opponent moves.
      let oppColorForCheck = color === 'w' ? 'b' : 'w';
      let inCheck = (!suppressCheck && potholeActive)
        ? main.methods.isInCheck(color, null, oppColorForCheck)
        : (!suppressCheck ? main.methods.isInCheck(color) : false);
      let hasMoves = !suppressCheck ? main.methods.hasAnyLegalMoves(color) : true;

      main.methods.updateVisualHighlights();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();

      if (suppressCheck) {
        $('#turn').removeClass('turnhighlight').text(color === 'w' ? "It's White's Turn!" : "It's Black's Turn!");
        ClockManager.onMoveMade(previousColor, color);
      } else if (!potholeActive && inCheck && !hasMoves) {
        main.variables.gameOver = true;
        ClockManager.stop();
        let winner = color === 'w' ? 'Black' : 'White';
        $('#turn').addClass('turnhighlight').text('Checkmate! ' + winner + ' wins!');
        BoardStatusOverlay.show('Checkmate!', `${winner} wins by checkmate`, { isGameOver: true });
        $('#rematch-btn').addClass('highlight-rematch');
        main.methods.updateMoveHistoryUI();
        AudioManager.playGameOver();
      } else if (!potholeActive && !inCheck && !hasMoves) {
        main.variables.gameOver = true;
        ClockManager.stop();
        $('#turn').addClass('turnhighlight').text("Stalemate! It's a draw.");
        BoardStatusOverlay.show('Stalemate', "Draw by stalemate", { isGameOver: true });
        $('#rematch-btn').addClass('highlight-rematch');
        main.methods.updateMoveHistoryUI();
        AudioManager.playGameOver();
      } else if (main.methods.checkDrawConditions(color)) {
        // Draw handled inside checkDrawConditions
      } else if (inCheck) {
        $('#turn').removeClass('turnhighlight').text((color === 'w' ? "White" : "Black") + "'s turn \u2014 Check!");
        BoardStatusOverlay.show('Check', `${color === 'w' ? 'White' : 'Black'} King is under attack`, { transient: true, durationMs: 1500 });
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

      if (typeof GameModeManager !== 'undefined') {
        GameModeManager.onTurnEnd(previousColor, color);
        if (!main.variables.gameOver) {
          GameModeManager.onTurnStart(color);
        }
      }
    },

    resetGame: function () {
      main.variables.turn = 'w';
      main.variables.orientation = 'w';
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
      main.methods.updateLastMoveArrow(); // hide the SVG arrow immediately
      main.variables.pieces = main.methods.getInitialPieces();

      $('#captured-black .captured-pieces-list').empty();
      $('#captured-white .captured-pieces-list').empty();
      $('#material-group-white, #material-group-black').css('display', 'none');
      let matW = $('#material-white');
      let matB = $('#material-black');
      matW.text('');
      matB.text('');
      if (typeof matW.css === 'function') matW.css('display', 'none');
      if (typeof matB.css === 'function') matB.css('display', 'none');
      $('#promotion-modal').css('display', 'none');
      $('.gamecell').removeClass('green yellow red last-move-from last-move-to');
      $('#turn').removeClass('turnhighlight').text("It's White's Turn!");
      $('#board-stage').removeClass('orientation-black');

      BoardStatusOverlay.hide();
      $('#rematch-btn').removeClass('highlight-rematch');

      ClockManager.reset();

      main.methods.renderBoard();
      main.methods.gamesetup();
      main.methods.updateMoveHistoryUI();
      main.methods.updateNavButtons();
      main.methods.updatePlayerBars();

      let initialKey = main.methods.getPositionKey(main.methods.getBoard(), 'w', null);
      main.variables.positionCounts[initialKey] = 1;
      main.variables.positionHistory.push(initialKey);

      if (typeof GameModeManager !== 'undefined') {
        GameModeManager.onReset();
        if (!main.variables.gameOver) {
          GameModeManager.onTurnStart('w');
        }
      }
    }
  }
};

// Initialize pieces at startup
main.variables.pieces = main.methods.getInitialPieces();

if (typeof $ !== 'undefined') {
  $(document).ready(function () {
    AudioManager.init();
    if (typeof document !== 'undefined' && document.body) {
      document.body.className = 'theme-wood';
    }
    ClockManager.init();
    DragManager.init();

    let showAnalogClock = (typeof localStorage !== 'undefined') ? localStorage.getItem('chess_show_analog_clock') : null;
    if (showAnalogClock === 'false') {
      $('body').addClass('hide-analog-clock');
      $('#show-analog-clock-check').prop('checked', false);
    } else {
      $('body').removeClass('hide-analog-clock');
      $('#show-analog-clock-check').prop('checked', true);
    }

    main.methods.renderBoard();
    main.methods.gamesetup();

    let initialKey = main.methods.getPositionKey(main.methods.getBoard(), 'w', null);
    main.variables.positionCounts[initialKey] = 1;
    main.variables.positionHistory.push(initialKey);
    main.methods.updateNavButtons();
    main.methods.updateMoveHistoryUI();
    main.methods.updatePlayerBars();

    // Click handler for Click-to-Move
    $(document).on('click', '.gamecell', function (e) {
      if (main.variables.gameOver || main.variables.isPromoting) return;
      if (typeof GameModeManager !== 'undefined' && GameModeManager.isActionBlocked()) return;
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

    $(document).on('click', '#reset-btn', function () {
      main.methods.resetGame();
    });

    $(document).on('change', '#autoflip-check', function () {
      main.variables.autoFlip = $(this).is(':checked');
    });

    $(document).on('change', '#show-analog-clock-check', function () {
      let show = $(this).is(':checked');
      $('body').toggleClass('hide-analog-clock', !show);
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('chess_show_analog_clock', String(show));
      } catch (err) {}
    });

    // Sound toggle
    $(document).on('click', '#sound-toggle', function () {
      AudioManager.toggleSound();
    });

    // Helper to determine if a match has started or is in progress
    function isGameInProgress() {
      if (main.variables.gameOver) return true;
      if (main.variables.moveHistory && main.variables.moveHistory.length > 0) return true;
      if (main.variables.halfmoveClock > 0 || main.variables.fullmoveNumber > 1 || main.variables.turn !== 'w') return true;
      if (main.variables.capturedWhite && main.variables.capturedWhite.length > 0) return true;
      if (main.variables.capturedBlack && main.variables.capturedBlack.length > 0) return true;
      if (ClockManager.state.running) return true;
      if (ClockManager.state.isTimed && ClockManager.state.initialMs > 0) {
        if (ClockManager.state.whiteMs < ClockManager.state.initialMs || ClockManager.state.blackMs < ClockManager.state.initialMs) {
          return true;
        }
      }
      if (typeof UnoMode !== 'undefined' && UnoMode.state) {
        if (UnoMode.state.discardPile && UnoMode.state.discardPile.length > 0) return true;
        if (UnoMode.state.turnCount > 1) return true;
      }
      return false;
    }

    // Time Control Presets
    $(document).on('change', '#time-preset', function () {
      let val = $(this).val();
      if (val === 'custom') {
        $('#custom-time-inputs').css('display', 'flex');
        return;
      }
      $('#custom-time-inputs').css('display', 'none');

      if (val === ClockManager.state.preset) return;

      const inProgress = isGameInProgress();
      if (inProgress) {
        const wasRunning = ClockManager.state.running;
        ClockManager.stop();
        const confirmed = (typeof confirm === 'function') ? confirm("Switching game modes will reset the current match. Do you want to proceed and start fresh?") : true;
        if (!confirmed) {
          $(this).val(ClockManager.state.preset);
          if (wasRunning) ClockManager.start(ClockManager.state.activeColor);
          return;
        }
      }

      ClockManager.setPreset(val);
      main.methods.resetGame();
      $('#settings-modal').css('display', 'none');
    });

    $(document).on('click', '#apply-custom-time', function () {
      let mins = parseInt($('#custom-mins').val(), 10) || 5;
      let inc = parseInt($('#custom-inc').val(), 10) || 0;

      const inProgress = isGameInProgress();
      if (inProgress) {
        const wasRunning = ClockManager.state.running;
        ClockManager.stop();
        const confirmed = (typeof confirm === 'function') ? confirm("Switching game modes will reset the current match. Do you want to proceed and start fresh?") : true;
        if (!confirmed) {
          if (wasRunning) ClockManager.start(ClockManager.state.activeColor);
          return;
        }
      }

      ClockManager.setPreset('custom', mins, inc);
      main.methods.resetGame();
      $('#settings-modal').css('display', 'none');
    });

    // Game Mode Selection Modal
    $(document).on('click', '#mode-toggle-btn', function () {
      $('.mode-card-btn').removeClass('active');
      $(`.mode-card-btn[data-mode="${GameModeManager.activeMode}"]`).addClass('active');
      $('#mode-select-modal').css('display', 'flex');
    });

    $(document).on('click', '#close-mode-modal, #mode-select-modal .modal-close-btn', function () {
      $('#mode-select-modal').css('display', 'none');
    });

    $(document).on('click', '.mode-card-btn', function () {
      let targetMode = $(this).data('mode');
      if (targetMode === GameModeManager.activeMode) {
        $('#mode-select-modal').css('display', 'none');
        return;
      }

      const inProgress = isGameInProgress();
      if (inProgress) {
        const wasRunning = ClockManager.state.running;
        ClockManager.stop();
        let confirmed = (typeof confirm === 'function') ? confirm("Switching game modes will reset the current match. Do you want to proceed and start fresh?") : true;
        if (!confirmed) {
          $('.mode-card-btn').removeClass('active');
          $(`.mode-card-btn[data-mode="${GameModeManager.activeMode}"]`).addClass('active');
          if (wasRunning) ClockManager.start(ClockManager.state.activeColor);
          return;
        }
      }

      GameModeManager.setMode(targetMode);
      main.methods.resetGame();
      $('#mode-select-modal').css('display', 'none');
      $('#settings-modal').css('display', 'none');
    });

    // Rematch button
    $(document).on('click', '#rematch-btn', function () {
      main.methods.resetGame();
    });

    // Settings modal
    $(document).on('click', '#settings-btn', function () {
      $('#time-preset').val(ClockManager.state.preset);
      if (ClockManager.state.preset === 'custom') {
        $('#custom-time-inputs').css('display', 'flex');
        $('#custom-mins').val(ClockManager.state.customMins || 5);
        $('#custom-inc').val(ClockManager.state.customIncSecs || 0);
      } else {
        $('#custom-time-inputs').css('display', 'none');
      }
      $('#mode-toggle-btn').html(GameModeManager.getModeToggleBtnHtml(GameModeManager.activeMode));
      $('#show-analog-clock-check').prop('checked', !$('body').hasClass('hide-analog-clock'));
      $('#settings-modal').css('display', 'flex');
    });

    $(document).on('click', '#close-settings-modal, #settings-modal .modal-close-btn', function () {
      $('#settings-modal').css('display', 'none');
    });

    // Copy PGN
    $(document).on('click', '#copy-pgn-btn', function () {
      let pgn = main.methods.exportPGN();
      let btn = $(this);
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pgn).then(() => {
          let orig = btn.html();
          btn.html('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!');
          setTimeout(() => btn.html(orig), 1500);
        });
      }
    });

    // Share Game Link
    $(document).on('click', '#share-btn', function () {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        let url = (typeof window !== 'undefined' && window.location) ? window.location.href : '';
        navigator.clipboard.writeText(url).then(() => {
          let orig = $('#share-btn-label').text();
          $('#share-btn-label').text('Copied!');
          setTimeout(() => $('#share-btn-label').text(orig), 1500);
        });
      }
    });

    // Keyboard shortcut [F] to flip board
    $(document).on('keydown', function (e) {
      if (e.key === 'f' || e.key === 'F') {
        let tag = (document.activeElement && document.activeElement.tagName) ? document.activeElement.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          main.methods.flipBoard();
        }
      }
    });

    // Resize listener for arrow repositioning
    if (typeof window !== 'undefined') {
      $(window).on('resize', function () {
        main.methods.updateLastMoveArrow();
      });
    }

    // Initialize UNO Plugin if available
    if (typeof UnoMode !== 'undefined') {
      GameModeManager.register('uno', UnoMode);
      UnoMode.init();
    }

    // Initialize Pothole Plugin if available
    if (typeof PotholeMode !== 'undefined') {
      GameModeManager.register('pothole', PotholeMode);
      PotholeMode.init();
    }
  });
}

// Reusable <chess-wordmark> Web Component
class ChessWordmark extends (typeof HTMLElement !== 'undefined' ? HTMLElement : Object) {
  connectedCallback() {
    if (!this.querySelector('svg')) {
      this.innerHTML = `<svg class="chess-wordmark" viewBox="0 0 396 154" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CHESS">
  <defs>
    <clipPath id="chess-wordmark-clip">
      <rect x="245" y="0" width="75" height="77" />
      <rect x="320" y="77" width="75" height="77" />
    </clipPath>
  </defs>
  <rect class="wm-tile" x="245" y="0" width="75" height="77" fill="var(--wordmark-light, #eeeeee)" />
  <rect class="wm-tile" x="320" y="77" width="75" height="77" fill="var(--wordmark-light, #eeeeee)" />
  <path class="wm-base-text" d="M 173 4 L 173 151 L 234 151 L 234 129 L 196 128 L 197 87 L 222 87 L 221 64 L 196 63 L 197 26 L 234 26 L 234 4 Z M 86 4 L 86 151 L 108 151 L 109 87 L 133 88 L 133 151 L 155 151 L 155 4 L 133 4 L 132 64 L 108 63 L 108 4 Z M 355 2 L 347 4 L 339 8 L 331 17 L 330 21 L 328 24 L 326 34 L 326 45 L 327 52 L 329 58 L 333 66 L 336 70 L 346 79 L 349 80 L 351 82 L 361 87 L 370 95 L 373 101 L 374 106 L 374 119 L 373 124 L 369 129 L 363 131 L 355 130 L 351 127 L 349 123 L 348 98 L 326 99 L 326 119 L 327 127 L 329 133 L 332 139 L 337 145 L 341 148 L 347 151 L 355 153 L 367 153 L 375 151 L 384 146 L 390 139 L 395 128 L 395 97 L 393 91 L 389 83 L 385 78 L 375 69 L 363 63 L 357 59 L 353 55 L 349 47 L 349 32 L 350 30 L 354 26 L 356 25 L 367 25 L 373 32 L 374 51 L 395 51 L 395 27 L 391 17 L 383 8 L 375 4 L 368 2 Z M 30 2 L 22 4 L 13 9 L 6 17 L 5 21 L 2 27 L 2 31 L 0 32 L 0 123 L 2 124 L 2 128 L 6 138 L 14 147 L 25 152 L 30 153 L 42 153 L 50 151 L 59 146 L 66 138 L 69 131 L 71 121 L 71 98 L 48 98 L 48 123 L 46 127 L 44 129 L 42 130 L 30 130 L 24 123 L 24 32 L 30 25 L 36 24 L 44 26 L 46 28 L 48 32 L 48 51 L 71 51 L 71 34 L 69 24 L 67 21 L 67 19 L 64 14 L 59 9 L 50 4 L 43 2 Z M 246 1 L 275 2 L 270 3 L 262 6 L 259 8 L 252 15 L 250 18 L 247 26 L 246 31 L 246 48 L 249 59 L 254 68 L 264 78 L 270 82 L 275 84 L 277 86 L 282 88 L 289 95 L 291 98 L 293 105 L 293 121 L 291 126 L 286 130 L 275 130 L 270 126 L 268 120 L 268 98 L 246 98 L 246 125 L 247 130 L 252 140 L 260 148 L 266 151 L 274 153 L 287 153 L 295 151 L 301 148 L 309 140 L 313 133 L 315 125 L 315 99 L 313 92 L 307 81 L 298 72 L 294 69 L 282 63 L 276 59 L 273 56 L 268 46 L 268 34 L 269 30 L 273 26 L 278 24 L 283 24 L 287 25 L 292 30 L 293 33 L 293 50 L 315 50 L 315 31 L 313 23 L 308 14 L 299 6 L 291 3 L 286 2 L 320 0 Z" fill="var(--wordmark-light, #eeeeee)" fill-rule="evenodd" />
  <path class="wm-inverted-text" d="M 173 4 L 173 151 L 234 151 L 234 129 L 196 128 L 197 87 L 222 87 L 221 64 L 196 63 L 197 26 L 234 26 L 234 4 Z M 86 4 L 86 151 L 108 151 L 109 87 L 133 88 L 133 151 L 155 151 L 155 4 L 133 4 L 132 64 L 108 63 L 108 4 Z M 355 2 L 347 4 L 339 8 L 331 17 L 330 21 L 328 24 L 326 34 L 326 45 L 327 52 L 329 58 L 333 66 L 336 70 L 346 79 L 349 80 L 351 82 L 361 87 L 370 95 L 373 101 L 374 106 L 374 119 L 373 124 L 369 129 L 363 131 L 355 130 L 351 127 L 349 123 L 348 98 L 326 99 L 326 119 L 327 127 L 329 133 L 332 139 L 337 145 L 341 148 L 347 151 L 355 153 L 367 153 L 375 151 L 384 146 L 390 139 L 395 128 L 395 97 L 393 91 L 389 83 L 385 78 L 375 69 L 363 63 L 357 59 L 353 55 L 349 47 L 349 32 L 350 30 L 354 26 L 356 25 L 367 25 L 373 32 L 374 51 L 395 51 L 395 27 L 391 17 L 383 8 L 375 4 L 368 2 Z M 30 2 L 22 4 L 13 9 L 6 17 L 5 21 L 2 27 L 2 31 L 0 32 L 0 123 L 2 124 L 2 128 L 6 138 L 14 147 L 25 152 L 30 153 L 42 153 L 50 151 L 59 146 L 66 138 L 69 131 L 71 121 L 71 98 L 48 98 L 48 123 L 46 127 L 44 129 L 42 130 L 30 130 L 24 123 L 24 32 L 30 25 L 36 24 L 44 26 L 46 28 L 48 32 L 48 51 L 71 51 L 71 34 L 69 24 L 67 21 L 67 19 L 64 14 L 59 9 L 50 4 L 43 2 Z M 246 1 L 275 2 L 270 3 L 262 6 L 259 8 L 252 15 L 250 18 L 247 26 L 246 31 L 246 48 L 249 59 L 254 68 L 264 78 L 270 82 L 275 84 L 277 86 L 282 88 L 289 95 L 291 98 L 293 105 L 293 121 L 291 126 L 286 130 L 275 130 L 270 126 L 268 120 L 268 98 L 246 98 L 246 125 L 247 130 L 252 140 L 260 148 L 266 151 L 274 153 L 287 153 L 295 151 L 301 148 L 309 140 L 313 133 L 315 125 L 315 99 L 313 92 L 307 81 L 298 72 L 294 69 L 282 63 L 276 59 L 273 56 L 268 46 L 268 34 L 269 30 L 273 26 L 278 24 L 283 24 L 287 25 L 292 30 L 293 33 L 293 50 L 315 50 L 315 31 L 313 23 L 308 14 L 299 6 L 291 3 L 286 2 L 320 0 Z" fill="var(--wordmark-dark, #161514)" fill-rule="evenodd" clip-path="url(#chess-wordmark-clip)" />
</svg>`;
    }
  }
}

if (typeof window !== 'undefined' && window.customElements && !customElements.get('chess-wordmark')) {
  customElements.define('chess-wordmark', ChessWordmark);
}

if (typeof global !== 'undefined') {
  global.main = main;
  global.GameModeManager = GameModeManager;
  global.ClockManager = ClockManager;
  global.AudioManager = AudioManager;
  global.DragManager = DragManager;
  global.ChessWordmark = ChessWordmark;
  global.ChessClock = ChessClock;
}
if (typeof window !== 'undefined') {
  window.main = main;
  window.GameModeManager = GameModeManager;
  window.ChessWordmark = ChessWordmark;
  window.ChessClock = ChessClock;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    main,
    ClockManager,
    AudioManager,
    DragManager,
    GameModeManager,
    ChessWordmark,
    ChessClock
  };
}



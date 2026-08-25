# ♟️ JavaScript Chess Game

<p align="center">
  <a href="https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-30%20Passed-brightgreen?style=for-the-badge" />
</p>

<p align="center">
A modern, fully playable browser-based Chess game built with HTML5, CSS3, JavaScript (ES6+), and jQuery, featuring complete FIDE chess rules, SAN move notation, PGN export, Undo/Redo, Threefold Repetition, 50-Move draw rule, Chess Clocks, Web Audio sound effects, Drag-and-Drop, Themes, and Responsive Mobile Design.
</p>

---

## 🌐 Live Demo

🚀 [Play Here!](https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/)

---

## 📖 Overview

This project is an advanced, production-quality implementation of Chess that runs entirely in the client-side browser without requiring any backend.

The engine accurately computes legal moves, manages turns, enforces King safety, supports all special moves (Castling, En Passant, Pawn Promotion), records moves in Standard Algebraic Notation (SAN), allows infinite Undo/Redo via immutable state snapshots, detects Threefold Repetition and the 50-Move Draw rule, provides drift-free high-precision Chess Clocks with increments, plays zero-dependency Web Audio sound effects, supports seamless Drag-and-Drop and Click-to-Move, offers 4 customizable board themes, and is fully responsive on mobile, tablet, and desktop devices.

---

## ✨ Features

- **⏱️ Chess Clocks & Time Controls**:
  - Drift-free timestamp-based timer countdown with `requestAnimationFrame`.
  - Presets: **Bullet (1+0)**, **Blitz (3+0)**, **Blitz (3+2 with increment)**, **Rapid (10+0)**, and **Custom** (configurable minutes & increment).
  - Active player visual indicator, low-time warning (<30s) and critical (<10s) pulsing state.
  - Automatic Flag Fall (Timeout) detection with instant game-over announcement.
  - Clock stops automatically on checkmate, stalemate, and draws.
- **🔊 Web Audio API Sound Effects**:
  - Zero-dependency generated tones for standard moves, captures, check alerts, castling, game-over fanfare, and timeout buzzer.
  - Single shared `AudioContext` with mute toggle and `localStorage` persistence.
- **🖐️ Drag-and-Drop & Click-to-Move**:
  - Unified Pointer Events (`pointerdown`, `pointermove`, `pointerup`) supporting mouse, touch, and stylus.
  - Floating drag ghost element with smooth snapping and illegal move cancellation.
  - Touch-action optimization preventing unwanted mobile scrolling.
  - Fully compatible with 180° board flipping.
- **🎨 Theme Selector**:
  - 4 themes styled via CSS variables: **Classic**, **Wood**, **Neon Cyberpunk**, and **Slate Dark**.
  - Dynamic palette updates for squares, highlights, panels, clocks, and text with `localStorage` persistence.
- **📍 Last-Move Highlighting**:
  - Subtle translucent highlights for source (`.last-move-from`) and destination (`.last-move-to`) squares.
  - Works across normal moves, captures, castling, en passant, promotion, undo, redo, and board flips.
- **📱 Responsive Mobile & Tablet Design**:
  - Adaptive viewport sizing, touch-friendly button targets (min 44px), and vertical stacking on mobile.
- **♟️ Full FIDE Chess Engine & Rules**:
  - Legal move generation, pin protection, checkmate, stalemate, castling, en passant, and pawn promotion modal.
- **📜 Move History & SAN / PGN**:
  - Live move sidebar in Standard Algebraic Notation with file/rank disambiguation (e.g. `Ndf3`, `Bxc6`).
  - One-click PGN export to clipboard with standard headers.
- **↺ State Snapshot Undo & Redo**:
  - Full state restoration (board, turn, en passant, clocks, captured pieces, and move history).
- **⚖️ Draw Detection**:
  - Threefold Repetition (FEN hashing) & 50-Move Rule (100 halfmoves).

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic layout, Board structure, Clocks & Toolbar |
| **CSS3** | CSS Variables, Theme palettes, Grid/Flex layout, Animations, Media Queries |
| **JavaScript (ES6+)** | Core Chess Engine, ClockManager, AudioManager, DragManager, ThemeManager |
| **Web Audio API** | Procedural tone synthesis for movement and game events |
| **jQuery** | Lightweight DOM event delegation & manipulation |
| **Node.js** | Automated headless test suite runner |

---

## 📂 Project Structure

```text
JS_Chess_Game/
│
├── index.html         # Main UI layout (Toolbar, Clocks, Board, Captures, History)
├── style.css          # Theme stylesheets, CSS variables, Clocks, Ghost, Media Queries
├── script.js          # Core Engine, ClockManager, AudioManager, ThemeManager, DragManager
├── test_runner.js     # 30-case automated test suite (Node.js)
└── README.md          # Comprehensive documentation
```

---

## 🧪 Automated Testing

The repository contains an automated test suite verifying all 30 core engine features, clocks, audio, themes, drag-and-drop, history, undo/redo, draw detection, and board orientation.

### Running the Test Suite:

```bash
node test_runner.js
```

### Verified Test Cases:
1. `Initial Setup & Piece Count`
2. `Initial Legal Moves for White`
3. `Move History & Standard Algebraic Notation (SAN)`
4. `SAN Disambiguation (Two Knights Reaching Same Square - Ndf3)`
5. `Fool's Mate (Checkmate Detection & # Suffix)`
6. `Scholar's Mate & PGN Export`
7. `White Kingside Castling (Execution & O-O)`
8. `White Queenside Castling (Execution & O-O-O)`
9. `Castling Prevented When Transit Squares Attacked`
10. `En Passant Capture (White capturing Black pawn)`
11. `Absolute Pin Prevents Exposing King to Check`
12. `Stalemate Detection`
13. `Move Undo and Redo Mechanics`
14. `Capture Undo Restores Captured Pieces & UI`
15. `Castling Undo Restores King & Rook State`
16. `New Move Clears Redo Stack`
17. `Threefold Repetition Draw Detection`
18. `50-Move Rule (100 Half-Moves Draw & Resets)`
19. `Board Flip Orientation & Coordinate Invariance`
20. `Game Reset Clears History and Snapshots`
21. `Chess Clock: Initial State & Untimed Mode`
22. `Chess Clock: Presets (1+0, 3+2, 10+0, Custom)`
23. `Chess Clock: Starts on First Move & Applies Increment`
24. `Chess Clock: Flag Fall (Timeout) Ends Game`
25. `Chess Clock: Stops on Checkmate`
26. `Audio Manager: Sound Triggering & Mute Toggle`
27. `Theme Manager: Theme Switching & Persistence`
28. `Last-Move Highlighting: Normal, Capture & Castling`
29. `Last-Move Highlighting Preserved Across Undo and Redo`
30. `Drag Manager: Interaction State & Cleanup`

---

## 🚀 Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Adhiraj2601/JS_Chess_Game.git
   cd JS_Chess_Game
   ```

2. **Open in Browser**:
   Simply open `index.html` in your browser.

---

## 📄 License

Open source and available under the standard MIT license.

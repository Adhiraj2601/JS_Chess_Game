# ♟️ JavaScript Chess Game

<p align="center">
  <a href="https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-40%20Passed-brightgreen?style=for-the-badge" />
</p>

<p align="center">
A modern, fully playable browser-based Chess game built with HTML5, CSS3, JavaScript (ES6+), and jQuery, featuring complete FIDE chess rules, SAN move notation, PGN export, Undo/Redo, Threefold Repetition, 50-Move draw rule, Chess Clocks, Web Audio sound effects, unified Click-to-Move and Drag-and-Drop interaction, Theme Selector, and a tightly centered, responsive workspace layout.
</p>

---

## 🌐 Live Demo

🚀 [Play Here!](https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/)

---

## 📖 Overview

This project is an advanced, production-quality implementation of Chess designed around the chessboard as the central focal point.

The interface eliminates excessive whitespace by organizing all gameplay elements into a balanced 3-column CSS Grid:
- **Left Column**: White Captures
- **Center Column**: Black Clock, Board, Turn Status Banner, Control Buttons, Auto-Flip option, and White Clock sharing the exact same width
- **Right Column**: Black Captures and Live Game History

Players can seamlessly use both **Click-to-Move** and **Drag-and-Drop** piece interactions interchangeably in both standard and 180° flipped board orientations.

---

## ✨ Features

- **🎯 Centered 3-Column Workspace Layout**:
  - Balanced `max-width: 1140px` workspace container eliminating wasted side margins.
  - Black and White clocks, status banner, and control buttons precisely match the chessboard width.
  - Symmetrical side panels for captured pieces and game history.
- **🖐️ Unified Click-to-Move & Drag-and-Drop**:
  - **Click-to-Move**: Single-click selection, legal target indicators, friendly piece switching, and deselect on click.
  - **Drag-and-Drop**: Pointer Events (`pointerdown`, `pointermove`, `pointerup`) with a smooth floating ghost, drop target detection, and touch-action optimization.
  - **Interchangeable Input**: Use Click or Drag at any moment without configuration or interference.
  - **180° Board Flip Compatibility**: Flawless coordinate resolution regardless of orientation.
- **⏱️ Chess Clocks & Time Controls**:
  - High-precision timestamp timing with `requestAnimationFrame` UI updates.
  - Presets: **Bullet (1+0)**, **Blitz (3+0)**, **Blitz (3+2 with increment)**, **Rapid (10+0)**, and **Custom** (configurable minutes & increment).
  - Active turn highlighting, warning states (<30s), critical countdown pulsing (<10s), and automatic timeout flag fall.
- **🔊 Web Audio API Procedural Sound Effects**:
  - Synthesized tones for standard moves, captures, check alerts, castling, victory fanfare, and timeout alarm.
  - Single shared `AudioContext` with mute toggle and `localStorage` persistence.
- **🎨 Theme Selector**:
  - 4 customizable themes styled via CSS variables: **Classic**, **Wood**, **Neon Cyberpunk**, and **Slate Dark**.
- **📍 Last-Move Highlighting**:
  - Translucent highlights for source (`.last-move-from`) and target (`.last-move-to`) squares preserved across all moves, undo, redo, and flips.
- **📱 Responsive Mobile & Tablet Layout**:
  - Adaptive CSS Grid / Flexbox breakpoints with smooth scaling down to mobile viewports.
- **♟️ Complete FIDE Chess Engine & Rules**:
  - Full movement calculation, pin protection, checkmate, stalemate, castling (`O-O`, `O-O-O`), en passant, and pawn promotion modal.
- **📜 Move History, SAN & PGN Export**:
  - Live move list in Standard Algebraic Notation with disambiguation (`Ndf3`, `Bxc6`) and one-click PGN clipboard copy.
- **↺ Full State Undo & Redo**:
  - Immutable snapshots restoring board, turn, en passant, clocks, captured pieces, and move history.
- **⚖️ Draw Detection**:
  - Threefold Repetition (FEN position hashing) and 50-Move Rule (100 halfmoves).

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure, Centered Workspace, Clocks & Toolbar |
| **CSS3** | CSS Variables, 3-Column Grid, Theme palettes, Animations, Media Queries |
| **JavaScript (ES6+)** | Core Chess Engine, ClockManager, AudioManager, ThemeManager, DragManager |
| **Web Audio API** | Procedural tone synthesis for movement and game events |
| **jQuery** | Lightweight DOM event delegation & manipulation |
| **Node.js** | Automated headless test suite runner (40 tests) |

---

## 📂 Project Structure

```text
JS_Chess_Game/
│
├── index.html         # Main UI layout (Toolbar, 3-Column Workspace, Clocks, Board, Captures, History)
├── style.css          # Theme stylesheets, CSS variables, Workspace Grid, Board Grid, Media Queries
├── script.js          # Core Engine, ClockManager, AudioManager, ThemeManager, DragManager
├── test_runner.js     # 40-case automated test suite (Node.js)
└── README.md          # Comprehensive documentation
```

---

## 🧪 Automated Testing

The repository contains an automated test suite verifying all 40 core engine features, layout coordinates, clocks, audio, themes, click-to-move, drag-and-drop, history, undo/redo, draw detection, and board orientation.

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
31. `Board Grid Rendering & Coordinates`
32. `Click-to-Move: Select and Execute Move`
33. `Click-to-Move: Friendly Piece Selection Switch`
34. `Click-to-Move: Deselecting Selected Piece`
35. `Click-to-Move: Pawn Promotion Flow`
36. `Drag-and-Drop: Threshold Met Activates Ghost & Drag State`
37. `Drag-and-Drop: Illegal Drop Cleans Up State`
38. `Click vs Drag Distinction: JustDropped Guard`
39. `Board Flip: Click-to-Move in Black Orientation`
40. `Board Flip: Coordinate Invariance Across Special Moves`

---

## 🚀 Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Adhiraj2601/JS_Chess_Game.git
   cd JS_Chess_Game
   ```

2. **Open in Browser**:
   Open `index.html` in your browser.

---

## 📄 License

Open source and available under the standard MIT license.

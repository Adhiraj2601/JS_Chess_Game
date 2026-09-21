# ♟️ JavaScript Chess Game

<p align="center">
  <a href="https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-54%20Passed-brightgreen?style=for-the-badge" />
</p>

<p align="center">
A modern, fully playable browser-based Chess game built with HTML5, CSS3, JavaScript (ES6+), and jQuery, featuring complete FIDE chess rules, SAN move notation, PGN export, Undo/Redo, Threefold Repetition, 50-Move draw rule, Chess Clocks, Web Audio sound effects, unified Click-to-Move and Drag-and-Drop interaction, Permanent Wood Theme, Dual Attacking & Threatened Piece Red Glow Indicators, and a tightly centered, responsive workspace layout.
</p>

---

## 🌐 Live Demo

🚀 [Play Here!](https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/)

---

## 📖 Overview

This project is an advanced, production-quality implementation of Chess designed around the chessboard as the central focal point.

The interface organizes all gameplay elements into an inviting, board-centric layout:
- **Board Stage**: Prominent, richly textured chessboard flanked directly above and below by integrated Opponent and Player strips pairing avatar chips, names, inline captured piece trays, and countdown clocks.
- **Game Hub**: Focused side panel housing the match status banner, live move history log, tactile action buttons (Undo, Redo, Flip, Reset), and auto-flip toggle.

Players can use both **Click-to-Move** and **Drag-and-Drop** piece interactions interchangeably in both standard and 180° flipped board orientations, with instant visual **Attacking & Threatened Piece Red Glow** highlighting indicating when any piece can capture an enemy piece or is under legal attack.

---

## ✨ Features

- **🎯 Dynamic Move & Capture Highlighting**:
  - Clicking on any piece dynamically highlights valid destination squares:
    - **Quiet Moves**: Legal empty squares and castling destinations turn soft moss green (`.green`).
    - **Capture Targets**: Squares containing capturable opponent pieces (and en passant destinations) turn vivid warm red (`.red`), filling the square itself rather than just a border.
  - Clean, distraction-free board experience with no passive red outline clutter.
  - Selected pieces are highlighted with warm amber gold (`.yellow`).
- **🎯 Board-Centric Cozy Parlor Layout**:
  - Warm, intimate, and player-focused interface that eliminates wasted empty margins.
  - Seamless integrated player strips with avatar badges, captured pieces, and tabular countdown clocks.
- **✋ Unified Click-to-Move & Drag-and-Drop Interaction**:
  - **Pointer Events**: Universal touch, pen, and mouse support across all screen types.
  - **Interchangeable Input**: Use Click or Drag at any moment without configuration or interference.
  - **180° Board Flip Compatibility**: Flawless coordinate resolution regardless of orientation.
- **⏱️ Chess Clocks & Time Controls**:
  - High-precision timestamp timing with `requestAnimationFrame` UI updates.
  - Presets: **Bullet (1+0)**, **Blitz (3+0)**, **Blitz (3+2 with increment)**, **Rapid (10+0)**, and **Custom** (configurable minutes & increment).
  - Active turn highlighting, warning states (<30s), critical countdown pulsing (<10s), and automatic timeout flag fall.
- **🔊 Web Audio API Procedural Sound Effects**:
  - Synthesized tones for standard moves, captures, check alerts, castling, victory fanfare, and timeout alarm.
  - Single shared `AudioContext` with mute toggle and `localStorage` persistence.
- **🌲 Default Wood Theme**:
  - Warm, permanent wood board aesthetic styled via clean CSS variables.
- **📍 Last-Move Highlighting**:
  - Translucent highlights for source (`.last-move-from`) and target (`.last-move-to`) squares preserved across all moves, undo, redo, and flips.
- **📱 Responsive Mobile & Tablet Layout**:
  - Adaptive CSS Grid / Flexbox breakpoints with smooth scaling down to mobile viewports.
- **♟️ Complete FIDE Chess Engine & Rules**:
  - Full movement calculation, pin protection, checkmate, stalemate, castling (`O-O`, `O-O-O`), en passant, and pawn promotion modal.
- **📜 Move History & SAN Notation**:
  - Live move list in Standard Algebraic Notation with disambiguation (`Ndf3`, `Bxc6`).
- **↺ Full State Undo & Redo**:
  - Immutable snapshots restoring board, turn, en passant, clocks, captured pieces, and move history.
- **⚖️ Automatic Draw Detection**:
  - **Threefold Repetition**: Automatic instant detection with claim/draw trigger.
  - **50-Move Rule**: Halfmove counter tracking pawn moves and captures with automatic draw alert at 100 plies.
  - **Stalemate Detection**: Instant game over banner when the side to move has no legal moves and is not in check.

---

## 🛠️ Tech Stack & Architecture

| Technology | Role |
|---|---|
| **HTML5** | Semantic DOM layout, Promotion Modal, Dynamic Game Grid |
| **CSS3** | CSS Variables, 3-Column Grid, Wood palette, Animations, Media Queries |
| **JavaScript (ES6+)** | Core Chess Engine, Threat Detection, ClockManager, AudioManager, DragManager |
| **jQuery (3.2.1)** | DOM manipulation, dynamic square injection, and event delegation |

```text
JS_Chess_Game/
├── index.html          # Semantic 3-column layout structure & modal overlays
├── style.css          # Wood theme stylesheet, CSS variables, Workspace Grid, Threat Glow, Media Queries
├── script.js          # Core Engine, Threat Detection, ClockManager, AudioManager, DragManager
├── test_runner.js     # 54 Automated tests verifying rules, engine, clocks, threats, coordinates
└── README.md          # Documentation & Technical Specifications
```

---

## 🧪 Automated Testing

The repository contains an automated test suite verifying all 54 core engine features, threat detection, layout coordinates, clocks, audio, themes, click-to-move, drag-and-drop, history, undo/redo, draw detection, and board orientation.

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
27. `Theme System: Permanent Wood Theme Loaded at Startup`
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
41. `Threatened Piece: Knight Threatening an Opponent Piece`
42. `Threatened Piece: Bishop Threatening an Opponent Piece`
43. `Threatened Piece: Rook Threatening an Opponent Piece`
44. `Threatened Piece: Queen Threatening Multiple Pieces`
45. `Threatened Piece: Pawn Threatening an Opponent Piece`
46. `Threatened Piece: Empty Attacked Squares Do NOT Glow Red`
47. `Threatened Piece: Pinned Enemy Piece Cannot Threaten (False Threat Pruning)`
48. `Threatened Piece: King in Check Hierarchy`
49. `Threatened Piece: Moving or Capturing Clears Threat`
50. `Threatened Piece: Undo and Redo Restore Threat State`
51. `Threatened Piece: En Passant Threat Detection`
52. `Threatened Piece: Board Flip Preserves Threat Detection`
53. `Move Selection Highlighting: Legal Moves Green and Capture Targets Red`
54. `Threatened Piece: Checkmate Threat State Cleanup`

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

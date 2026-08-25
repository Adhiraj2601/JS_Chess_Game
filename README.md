# ♟️ JavaScript Chess Game

<p align="center">
  <a href="https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-20%20Passed-brightgreen?style=for-the-badge" />
</p>

<p align="center">
A modern, fully playable browser-based Chess game built with HTML5, CSS3, JavaScript (ES6+), and jQuery, featuring complete FIDE chess rules, SAN move notation, PGN export, Undo/Redo, Threefold Repetition, 50-Move draw rule, and Board Flipping.
</p>

---

## 🌐 Live Demo

🚀 [Play Here!](https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/)

---

## 📖 Overview

This project is an advanced, production-quality implementation of Chess that runs entirely in the client-side browser without requiring any backend.

The engine accurately computes all pseudo-legal and legal moves, manages turns, enforces King safety, supports all special moves (Castling, En Passant, Pawn Promotion), records moves in Standard Algebraic Notation (SAN), allows infinite Undo/Redo via immutable state snapshots, detects Threefold Repetition and the 50-Move Draw rule, and supports 180° board rotation.

---

## ✨ Features

- **Full FIDE Chess Movement & Safety**: Legal move computation, King check safety, and absolute pin protection.
- **Special Moves**:
  - **Castling**: Kingside (`O-O`) and Queenside (`O-O-O`) with transit attack validation.
  - **En Passant**: Diagonal capture with expiration tracking.
  - **Pawn Promotion**: Modal selection for Queen, Rook, Bishop, or Knight (`=Q`, `=R`, etc.).
- **Move History & SAN**: Live move sidebar formatted in Standard Algebraic Notation (e.g. `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6`).
- **PGN Export**: One-click "Copy PGN" with standard headers for analysis in Lichess or Chess.com.
- **Undo & Redo**: Reliable state snapshots restoring the full board, captured pieces, turn banners, and draw tracking.
- **Draw Conditions**:
  - **Threefold Repetition**: FEN-based position hashing detecting identical board states, castling rights, and active turns.
  - **50-Move Rule**: Halfmove clock tracking (100 halfmoves without a pawn move or capture).
  - **Stalemate Detection**: Automatically detected when a player has no legal moves and is not in check.
- **Board Orientation & Flip**:
  - Manual `[ Flip ]` button rotating the board 180° for Black's perspective.
  - Optional `Auto Flip on Turn` toggle for Pass-and-Play mode.
- **UI & Accessibility**:
  - Visual highlight for selected piece (yellow), legal targets (green), king in check (red), and last move (translucent yellow).
  - Captured pieces panels for White and Black.
  - In-place reset button.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic layout & Board structure |
| **CSS3** | Board styling, theme styling, animations, responsive design |
| **JavaScript (ES6+)** | Core Chess Engine, SAN generator, FEN hashing, Snapshot manager |
| **jQuery** | Lightweight DOM manipulation & UI bindings |
| **Node.js** | Automated headless test suite runner |

---

## 📂 Project Structure

```text
JS_Chess_Game/
│
├── index.html         # Main UI layout (Board, Captures, Controls, Move History)
├── style.css          # Stylesheet for chessboard, panels, modals, and buttons
├── script.js          # Core Chess Engine, State Manager, and UI Controller
├── test_runner.js     # 20-case automated test suite (Node.js)
└── README.md          # Comprehensive documentation
```

---

## 🧪 Automated Testing

The repository contains an automated test suite verifying all 20 core engine features, special rules, history recording, undo/redo, draw detection, and board orientation.

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

---

## 🚀 Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Adhiraj2601/JS_Chess_Game.git
   cd JS_Chess_Game
   ```

2. **Open in Browser**:
   Simply double-click `index.html` or open it with Live Server in your editor.

---

## 📄 License

Open source and available under the standard MIT license.

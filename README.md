# ♟️ JavaScript Chess Game

<p align="center">
  <a href="YOUR_VERCEL_URL">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white" />
</p>

<p align="center">
A fully playable browser-based Chess game built using HTML, CSS, JavaScript, and jQuery with complete chess movement logic and an interactive UI.
</p>

---

## 🌐 Live Demo

🚀 [PLay Here!](https://js-chess-game-54sjzbs2b-adicsprojects.vercel.app/)

---

# 📖 Overview

This project is a complete implementation of the classic game of Chess that runs entirely in the browser without requiring any backend.

The application initializes all chess pieces in their standard positions, validates legal moves for every piece, manages turns between players, highlights valid moves, captures opponent pieces, and updates the game board dynamically.

The project demonstrates how complex board game logic can be implemented using vanilla JavaScript while keeping the interface lightweight and responsive.

---

# ✨ Features

- Complete interactive chess board
- Two-player local gameplay
- Turn-based game management with check indicators
- Legal move validation & piece safety
- Check, Checkmate, and Stalemate detection
- Special moves: Castling (Kingside & Queenside), En Passant, and Pawn Promotion (Queen, Rook, Bishop, Knight)
- Highlight available moves and selected pieces
- Captured pieces panel for both White and Black
- Clean in-place Game Reset functionality
- Responsive board styling
- Instant move updates

---

# 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Board Structure |
| CSS3 | Styling & Layout |
| JavaScript (ES6) | Game Engine & Rule Validation |
| jQuery | DOM Manipulation |

---

# 🧠 Game Logic

The application maintains a complete game state in JavaScript.

Each chess piece stores information including:

- Current Position
- Piece Type
- Captured Status
- Movement State

The engine handles:

- Valid legal movement generation
- King safety & absolute pin prevention
- Check, Checkmate & Stalemate detection
- Castling path & safety validation
- En Passant tracking and execution
- Interactive Pawn Promotion modal
- Piece selection & visual highlights
- Piece capturing and captured piece display
- Turn switching
- Board rendering and state reset

---

# 📂 Project Structure

```
JS_Chess_Game/
│
├── index.html
├── style.css
├── script.js
├── test_runner.js
└── README.md
```

---

# 🚀 Getting Started

Clone the repository

```bash
git clone https://github.com/Adhiraj2601/JS_Chess_Game.git
```

Navigate into the project

```bash
cd JS_Chess_Game
```

Open the project

Simply open:

```
index.html
```

in your browser, or run automated tests with:

```bash
node test_runner.js
```

---

# 🎮 How to Play

1. Click a chess piece of the active player's turn.
2. Legal moves will be highlighted in green.
3. Click one of the highlighted squares to move or capture.
4. If castling or en passant is available, selecting the square will execute the special move.
5. If a pawn reaches the opposite back rank, choose your promotion piece from the dialog.
6. Turn automatically switches to the opponent with check/checkmate alerts.
7. Click **Reset Game** anytime to start a fresh match.

---

# 💡 Future Improvements

- AI opponent / Bot integration
- Move history (PGN notation)
- Chess clock / timer
- Move sound effects
- Dark/Light board themes

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

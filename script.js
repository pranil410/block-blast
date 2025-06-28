const grid = document.getElementById('grid');
const piecesDiv = document.getElementById('pieces');
const scoreEl = document.getElementById('score');
const gridSize = 10;
let score = 0;
let lastMove = null; // For undo support

// Create grid cells
const cells = [];
for (let i = 0; i < gridSize * gridSize; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.index = i;
  grid.appendChild(cell);
  cells.push(cell);
}

// Define shapes (max 3x3)
const shapes = [
  [[1, 1, 1], [0, 1, 0], [0, 0, 0]], // T
  [[1, 1, 0], [1, 1, 0], [0, 0, 0]], // Square
  [[1, 1, 1], [1, 0, 0], [0, 0, 0]], // L
  [[1, 1, 1], [0, 0, 1], [0, 0, 0]], // J
  [[1, 1, 1], [0, 0, 0], [0, 0, 0]], // Line
  [[1, 0, 0], [1, 0, 0], [1, 0, 0]], // Vertical Line
  [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // Z
  [[0, 1, 1], [1, 1, 0], [0, 0, 0]]  // S
];

// Random color for blocks
function getRandomColor() {
  const colors = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ffc107'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Create draggable piece
function createPiece(shape, color) {
  const piece = document.createElement('div');
  piece.classList.add('piece');
  piece.setAttribute('draggable', 'true');
  piece.dataset.shapeIndex = shapes.indexOf(shape);
  piece.dataset.color = color;

  shape.flat().forEach(val => {
    const block = document.createElement('div');
    block.classList.add('cell');
    if (val) {
      block.classList.add('block');
      block.style.setProperty('--color', color);
    }
    piece.appendChild(block);
  });

  piece.addEventListener('dragstart', e => {
    e.dataTransfer.setData('shapeIdx', piece.dataset.shapeIndex);
    e.dataTransfer.setData('color', piece.dataset.color);
  });

  return piece;
}

// Helper: Check if a piece can be placed anywhere on grid
function canPlaceAnywhere(shape) {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      if (tryPlaceCheckOnly(shape, idx)) return true;
    }
  }
  return false;
}

// Check validity of placement without placing blocks
function tryPlaceCheckOnly(shape, startIdx) {
  const startRow = Math.floor(startIdx / gridSize);
  const startCol = startIdx % gridSize;

  let topMost = 3, leftMost = 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (shape[r][c]) {
        if (r < topMost) topMost = r;
        if (c < leftMost) leftMost = c;
      }
    }
  }

  const baseRow = startRow - topMost;
  const baseCol = startCol - leftMost;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (shape[r][c]) {
        const rr = baseRow + r;
        const cc = baseCol + c;
        if (rr < 0 || rr >= gridSize || cc < 0 || cc >= gridSize) return false;
        const idx = rr * gridSize + cc;
        if (cells[idx].classList.contains('block')) return false;
      }
    }
  }
  return true;
}

// Spawn 3 random pieces and check game over
function spawnPieces() {
  piecesDiv.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const color = getRandomColor();
    piecesDiv.appendChild(createPiece(shape, color));
  }

  // Check if any piece can be placed, else game over
  const pieces = piecesDiv.querySelectorAll('.piece');
  const canPlaceAny = [...pieces].some(piece => {
    const shape = shapes[parseInt(piece.dataset.shapeIndex)];
    return canPlaceAnywhere(shape);
  });

  if (!canPlaceAny) {
    showGameOver();
  }
}

// Try to place a piece at given cell index
function tryPlace(shape, startIdx, color) {
  const startRow = Math.floor(startIdx / gridSize);
  const startCol = startIdx % gridSize;
  const indexes = [];

  // Find top-most row and left-most column with blocks in shape
  let topMost = 3, leftMost = 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (shape[r][c]) {
        if (r < topMost) topMost = r;
        if (c < leftMost) leftMost = c;
      }
    }
  }
  const baseRow = startRow - topMost;
  const baseCol = startCol - leftMost;

  // Check validity and collect cells to fill
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (shape[r][c]) {
        const rr = baseRow + r;
        const cc = baseCol + c;
        if (rr < 0 || rr >= gridSize || cc < 0 || cc >= gridSize) return false;
        const idx = rr * gridSize + cc;
        if (cells[idx].classList.contains('block')) return false;
        indexes.push(idx);
      }
    }
  }

  // Place blocks
  indexes.forEach(idx => {
    cells[idx].classList.add('block');
    cells[idx].style.setProperty('--color', color);
  });

  lastMove = indexes; // Save for undo
  return true;
}

// Clear full rows and columns and add score
function clearLines() {
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < gridSize; r++) {
    let fullRow = true;
    for (let c = 0; c < gridSize; c++) {
      if (!cells[r * gridSize + c].classList.contains('block')) {
        fullRow = false;
        break;
      }
    }
    if (fullRow) fullRows.push(r);
  }

  for (let c = 0; c < gridSize; c++) {
    let fullCol = true;
    for (let r = 0; r < gridSize; r++) {
      if (!cells[r * gridSize + c].classList.contains('block')) {
        fullCol = false;
        break;
      }
    }
    if (fullCol) fullCols.push(c);
  }

  if (fullRows.length === 0 && fullCols.length === 0) return;

  // Play blast sound and animation
  const blastSound = document.getElementById('blastSound');
  if (blastSound) {
    blastSound.currentTime = 0;
    blastSound.play();
  }

  // Blast animation & clear blocks
  fullRows.forEach(r => {
    for (let c = 0; c < gridSize; c++) {
      const cell = cells[r * gridSize + c];
      blastCell(cell);
    }
  });

  fullCols.forEach(c => {
    for (let r = 0; r < gridSize; r++) {
      const cell = cells[r * gridSize + c];
      blastCell(cell);
    }
  });

  // Remove blocks after animation
  setTimeout(() => {
    fullRows.forEach(r => {
      for (let c = 0; c < gridSize; c++) {
        const cell = cells[r * gridSize + c];
        cell.classList.remove('block');
        cell.style.removeProperty('--color');
      }
    });

    fullCols.forEach(c => {
      for (let r = 0; r < gridSize; r++) {
        const cell = cells[r * gridSize + c];
        cell.classList.remove('block');
        cell.style.removeProperty('--color');
      }
    });
  }, 400);

  // Update score
  score += (fullRows.length + fullCols.length) * gridSize * 10;
  scoreEl.textContent = `Score: ${score}`;
}

function blastCell(cell) {
  cell.classList.add('blast');
  setTimeout(() => cell.classList.remove('blast'), 400);
}

// Undo last move
document.getElementById('undoBtn').addEventListener('click', () => {
  if (!lastMove) return;
  lastMove.forEach(idx => {
    cells[idx].classList.remove('block');
    cells[idx].style.removeProperty('--color');
  });
  lastMove = null;
  spawnPieces();
});

// Show Game Over screen
function showGameOver() {
  document.getElementById('gameOver').style.display = 'block';
}

// Restart game
document.getElementById('restartBtn').addEventListener('click', () => {
  // Clear grid
  cells.forEach(cell => {
    cell.classList.remove('block');
    cell.style.removeProperty('--color');
  });
  score = 0;
  scoreEl.textContent = `Score: ${score}`;
  lastMove = null;
  document.getElementById('gameOver').style.display = 'none';
  spawnPieces();
});

// Drag & Drop Handlers for Desktop
grid.addEventListener('dragover', e => e.preventDefault());

grid.addEventListener('drop', e => {
  e.preventDefault();
  const shapeIdx = parseInt(e.dataTransfer.getData('shapeIdx'));
  const color = e.dataTransfer.getData('color');
  if (isNaN(shapeIdx) || !color) return;

  const rect = grid.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / (rect.width / gridSize));
  const row = Math.floor(y / (rect.height / gridSize));
  const idx = row * gridSize + col;

  const shape = shapes[shapeIdx];
  if (tryPlace(shape, idx, color)) {
    clearLines();
    scoreEl.textContent = `Score: ${score}`;
    spawnPieces();
  }
});

// Touch support: drag and drop for mobile

let draggingPiece = null;

function getCellIndexFromTouch(touch) {
  const rect = grid.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return -1;
  const col = Math.floor(x / (rect.width / gridSize));
  const row = Math.floor(y / (rect.height / gridSize));
  return row * gridSize + col;
}

piecesDiv.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  if (!touch) return;
  let target = e.target;
  while (target && !target.classList.contains('piece')) {
    target = target.parentElement;
  }
  if (!target) return;

  draggingPiece = target.cloneNode(true);
  draggingPiece.style.position = 'fixed';
  draggingPiece.style.zIndex = 1000;
  draggingPiece.style.pointerEvents = 'none';
  draggingPiece.style.left = `${touch.clientX - 45}px`;
  draggingPiece.style.top = `${touch.clientY - 45}px`;
  document.body.appendChild(draggingPiece);
  e.preventDefault();
});

piecesDiv.addEventListener('touchmove', e => {
  if (!draggingPiece) return;
  const touch = e.touches[0];
  draggingPiece.style.left = `${touch.clientX - 45}px`;
  draggingPiece.style.top = `${touch.clientY - 45}px`;
  e.preventDefault();
});

piecesDiv.addEventListener('touchend', e => {
  if (!draggingPiece) return;
  const touch = e.changedTouches[0];
  if (!touch) return;

  const dropIndex = getCellIndexFromTouch(touch);
  if (dropIndex !== -1) {
    const shape = shapes[parseInt(draggingPiece.dataset.shapeIndex)];
    const color = draggingPiece.dataset.color;

    if (tryPlace(shape, dropIndex, color)) {
      clearLines();
      scoreEl.textContent = `Score: ${score}`;
      spawnPieces();
    }
  }

  draggingPiece.remove();
  draggingPiece = null;
});

// Initialize game
spawnPieces();

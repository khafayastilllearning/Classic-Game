const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const hiEl = document.getElementById("highScore");
const popup = document.getElementById("gameOverPopup");
const finalScoreEl = document.getElementById("finalScore");
const popupHighScoreEl = document.getElementById("popupHighScore");
const popupRestartBtn = document.getElementById("popupRestartBtn");

const CELL = 24;
const COLS = Math.floor(canvas.width / CELL);
const ROWS = Math.floor(canvas.height / CELL);

let stepDuration = 140;
let snake = [];
let prevSnake = [];
let direction = { x: 1, y: 0 };
let pendingDir = { x: 1, y: 0 };
let food = { x: 0, y: 0, pulse: 0 };
let score = 0;
let highScore = parseInt(localStorage.getItem("snakeHighScore") || "0", 10);
let gameOver = false;
let gameOverTime = null;
hiEl.textContent = highScore.toString();
let lastStepTime = 0;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp  = (a, b, t) => a + (b - a) * t;
function randCell(max) { return Math.floor(Math.random() * max); }
function copySnake(arr) { return arr.map(p => ({ x: p.x, y: p.y })); }

function resetGame() {
  snake = [
    { x: Math.floor(COLS / 2) * CELL, y: Math.floor(ROWS / 2) * CELL },
    { x: (Math.floor(COLS / 2) - 1) * CELL, y: Math.floor(ROWS / 2) * CELL }
  ];
  prevSnake = copySnake(snake);
  direction = { x: 1, y: 0 };
  pendingDir = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = "0";
  gameOver = false;
  stepDuration = 140;
  placeFood();
  lastStepTime = performance.now();
  popup.classList.add("hidden");
  canvas.classList.remove("blur");
}

document.addEventListener("keydown", (e) => {
  const k = e.key;
  const cur = direction;
  if (k === "ArrowUp"    && !(cur.x === 0 && cur.y === 1))  pendingDir = { x: 0, y: -1 };
  if (k === "ArrowDown"  && !(cur.x === 0 && cur.y === -1)) pendingDir = { x: 0, y:  1 };
  if (k === "ArrowLeft"  && !(cur.x === 1 && cur.y === 0))  pendingDir = { x: -1, y: 0 };
  if (k === "ArrowRight" && !(cur.x === -1 && cur.y === 0)) pendingDir = { x: 1, y:  0 };
});

popupRestartBtn.addEventListener("click", resetGame);

function placeFood() {
  while (true) {
    const fx = randCell(COLS) * CELL;
    const fy = randCell(ROWS) * CELL;
    const conflict = snake.some(s => s.x === fx && s.y === fy);
    if (!conflict) {
      food = { x: fx, y: fy, pulse: 0 };
      return;
    }
  }
}

function stepLogic() {
  prevSnake = copySnake(snake);
  direction = pendingDir;
  const head = snake[0];
  const newHead = {
    x: head.x + direction.x * CELL,
    y: head.y + direction.y * CELL
  };
  if (newHead.x < 0 || newHead.x >= COLS * CELL || newHead.y < 0 || newHead.y >= ROWS * CELL ||
      snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    return endGame();
  }
  const ate = (newHead.x === food.x && newHead.y === food.y);
  snake.unshift(newHead);
  if (ate) {
    score++;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snakeHighScore", highScore);
      hiEl.textContent = highScore;
    }
    if (score % 5 === 0) stepDuration = Math.max(80, stepDuration - 8);
    placeFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  gameOver = true;
  gameOverTime = performance.now();
}

function drawBackground() {
  const color1 = "#a4d46f"; // hijau muda
  const color2 = "#9ccc65"; // hijau sedikit gelap
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
}

function drawFood(dt) {
  food.pulse += dt * 0.006;
  const base = CELL - 6;
  const size = base + Math.sin(food.pulse) * 4;
  ctx.fillStyle = "#ff4d4d";
  ctx.beginPath();
  ctx.arc(food.x + CELL/2, food.y + CELL/2, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake(t) {
  for (let i = snake.length - 1; i >= 0; i--) {
    const cur = snake[i];
    const prev = prevSnake[i] || cur;
    const ix = lerp(prev.x, cur.x, t);
    const iy = lerp(prev.y, cur.y, t);
    const cx = ix + CELL/2;
    const cy = iy + CELL/2;
    const isHead = i === 0;
    const wave = 0.06 * Math.sin((performance.now()*0.006) + i * 0.8);
    const radius = CELL * (isHead ? 0.48 : 0.42 + wave);
    if (!isHead) {
      ctx.fillStyle = (i % 2 === 0) ? "#2ee6a5" : "#17c98a";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI*2);
      ctx.fill();
      const dir = direction.x || direction.y ? direction : { x: 1, y: 0 };
      const eyeOffset = CELL * 0.18;
      const eyeR = CELL * 0.12;
      const pupilR = CELL * 0.07;
      const ortho = { x: -dir.y, y: dir.x };
      const ex1 = cx + dir.x * eyeOffset + ortho.x * eyeOffset * 0.7;
      const ey1 = cy + dir.y * eyeOffset + ortho.y * eyeOffset * 0.7;
      const ex2 = cx + dir.x * eyeOffset - ortho.x * eyeOffset * 0.7;
      const ey2 = cy + dir.y * eyeOffset - ortho.y * eyeOffset * 0.7;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111";
      const shift = CELL * 0.05;
      ctx.beginPath(); ctx.arc(ex1 + dir.x*shift, ey1 + dir.y*shift, pupilR, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2 + dir.x*shift, ey2 + dir.y*shift, pupilR, 0, Math.PI*2); ctx.fill();
    if (dir.x !== 0 || dir.y !== 0) {
        ctx.strokeStyle = "#ff5577";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + dir.x * (radius + 2), cy + dir.y * (radius + 2));
        ctx.lineTo(cx + dir.x * (radius + 10), cy + dir.y * (radius + 10));
        ctx.stroke();
      }
    }
  }
}

function loop(now) {
  const dt = now - lastStepTime;
  if (!gameOver) {
    if (dt >= stepDuration) {
      stepLogic();
      lastStepTime = now;
    }
    const t = clamp((now - lastStepTime) / stepDuration, 0, 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawFood(dt);
    drawSnake(t);
    requestAnimationFrame(loop);
  } else {
    const elapsed = now - gameOverTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawFood(dt);
    const shakeMag = (elapsed < 1000) ? Math.sin(elapsed * 0.05) * 2 : 0;
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const cx = seg.x + CELL/2 + shakeMag;
      const cy = seg.y + CELL/2 + shakeMag;
      const isHead = i === 0;
      const radius = CELL * (isHead ? 0.48 : 0.42);
      ctx.fillStyle = isHead ? "#00ff88" : (i % 2 === 0 ? "#2ee6a5" : "#17c98a");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI*2);
      ctx.fill();
    }
    if (elapsed >= 1000) {
      finalScoreEl.textContent = score;
      popupHighScoreEl.textContent = highScore;
      popup.classList.remove("hidden");
      canvas.classList.add("blur");
    }
    requestAnimationFrame(loop);
  }
}

resetGame();
requestAnimationFrame((t) => {
  lastStepTime = t;
  requestAnimationFrame(loop);
});

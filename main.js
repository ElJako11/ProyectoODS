
// Game Config
const CONFIG = {
  initialSpeed: 2, // pixels per frame (reduced from 4)
  spawnRate: 4000, // ms
  speedIncrease: 0.1, // speed added per minute (reduced from 0.2)
  gravity: 10, // speed when dropped
};

// State
let state = {
  isPlaying: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('ods_highscore')) || 0,
  lives: 3,
  speed: CONFIG.initialSpeed,
  lastSpawnTime: 0,
  trashItems: [], // Array of DOM elements
  startTime: 0,
};

// Trash Types
const TRASH_TYPES = [
  { type: 'organic', icons: ['🍎', '🍌', '🥬', '🦴', '🥪'] },
  { type: 'paper', icons: ['📰', '📦', '📄', '🥡', '✉️'] },
  { type: 'plastic', icons: ['🧴', '🥤', '🥣', '🖊️', '🧸'] },
  { type: 'general', icons: ['💿', '🍽️', '🎮', '👟', '😷'] },
];

// DOM Elements
const gameArea = document.getElementById('game-area');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const bins = document.querySelectorAll('.bin');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const infoBtn = document.getElementById('info-btn');
const closeOdsBtn = document.getElementById('close-ods-btn');
const odsModal = document.getElementById('ods-modal');

// Audio (Optional Placeholder logic)
const playSound = (type) => {
  // Can implement AudioContext or simple <audio> later
};

// Initialization
function init() {
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  
  infoBtn.addEventListener('click', () => {
    // Pause game if playing? Optional, but safer to just show overlay
    // If we want to pause, we should toggle state.isPlaying or add a specialized pause state
    // For simplicity, we just show modal. The game loop will continue running in background or we can pause it.
    // Let's pause logical updates but keep loop running
    state.isPlaying = false; 
    odsModal.classList.add('active');
  });

  closeOdsBtn.addEventListener('click', () => {
    odsModal.classList.remove('active');
    // Resume game if it was started and not game over
    // Check if we are in a "game session" (lives > 0)
    // Actually, simpler: if we were on the start screen, stay there. If we were playing, resume.
    // But `state.isPlaying` was the flag.
    // If we click info on start screen, we shouldn't "resume" to empty game.
    // Let's only auto-resume if we have items or score > 0 or lives > 0?
    // Better strategy: Only allow info button to pause if we assume user wants to read.
    // Re-enabling isPlaying might be tricky if "Game Over" happened. 
    // Let's just say: If lives > 0, set playing to true.
    if (state.lives > 0 && !document.getElementById('start-screen').classList.contains('active')) {
      state.isPlaying = true;
      // Reset lastSpawnTime to avoid huge spawn batch
      state.lastSpawnTime = Date.now(); 
      // Adjust start time to account for pause? (Too complex for now, speed will just be based on wall clock)
    }
  });
  
  // Set images for bins if available (fallback to color done in CSS)
  // We can verify if images exist, but CSS handles fallback via background-color
  // document.querySelector('.bin.plastic').style.backgroundImage = "url('/images/bin-plastic.png')";
  // Add others if we generated them
}

function startGame() {
  state.isPlaying = true;
  state.score = 0;
  state.lives = 3;
  state.speed = CONFIG.initialSpeed;
  state.trashItems.forEach(item => item.remove());
  state.trashItems = [];
  state.startTime = Date.now();
  state.lastSpawnTime = Date.now();
  // Reload highscore in case it changed in another tab (edge case) or just consistency
  state.highScore = parseInt(localStorage.getItem('ods_highscore')) || 0;

  updateUI();
  
  startScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  state.isPlaying = false;
  
  const isNewRecord = state.score > state.highScore;
  let message = `Puntuación Final: ${state.score}`;
  let title = "¡Juego Terminado!";

  if (isNewRecord && state.score > 0) {
    localStorage.setItem('ods_highscore', state.score);
    title = "¡NUEVO RÉCORD! 🏆";
    message = `¡Felicidades! Superaste el récord anterior.<br>Nueva Puntuación Máxima: ${state.score}`;
  }

  gameOverScreen.querySelector('h1').textContent = title;
  
  // Use innerHTML to support <br> in message
  const p = gameOverScreen.querySelector('p');
  p.innerHTML = message;
  // If we just set finalScoreEl, it might be overwritten if we didn't change structure, 
  // but let's assume we replace the logic inside p or similar.
  // Actually the original HTML was <p>Puntuación Final: <span id="final-score">0</span></p>
  // Let's rewrite the p content entirely for flexibility
  
  gameOverScreen.classList.add('active');
}

function updateUI() {
  scoreEl.textContent = state.score;
  highScoreEl.textContent = state.highScore;
  livesEl.textContent = state.lives;
}

// Spawner
function spawnTrash() {
  const typeObj = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
  const icon = typeObj.icons[Math.floor(Math.random() * typeObj.icons.length)];
  
  const el = document.createElement('div');
  el.classList.add('trash-item');
  el.dataset.type = typeObj.type;
  el.innerHTML = `<span class="trash-content">${icon}</span>`;
  
  // Start position: Left of screen
  el.style.left = '-60px';
  el.style.top = '10%'; // Align with conveyor belt
  
  // Tracking props
  el.x = -60;
  el.y = gameArea.offsetHeight * 0.12; // 10% approx
  el.isDragging = false;
  el.isDropping = false;
  
  // Input Handling
  setupInput(el);
  
  gameArea.appendChild(el);
  state.trashItems.push(el);
}

// Input Handling
function setupInput(el) {
  el.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    el.isDragging = true;
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
    el.style.zIndex = 100;
  });

  el.addEventListener('pointermove', (e) => {
    if (!el.isDragging) return;
    
    // Move element specifically relative to game area
    const rect = gameArea.getBoundingClientRect();
    el.x = e.clientX - rect.left - (el.offsetWidth / 2);
    el.y = e.clientY - rect.top - (el.offsetHeight / 2);
    
    el.style.left = `${el.x}px`;
    el.style.top = `${el.y}px`;
  });

  el.addEventListener('pointerup', (e) => {
    if (!el.isDragging) return;
    el.isDragging = false;
    el.releasePointerCapture(e.pointerId);
    el.style.zIndex = 50;
    
    checkDrop(el);
  });
}

function checkDrop(el) {
  const elRect = el.getBoundingClientRect();
  let droppedInBin = false;

  bins.forEach(bin => {
    const binRect = bin.getBoundingClientRect();
    
    // Check intersection
    if (
      elRect.left < binRect.right &&
      elRect.right > binRect.left &&
      elRect.top < binRect.bottom &&
      elRect.bottom > binRect.top
    ) {
      droppedInBin = true;
      const binType = bin.dataset.type;
      const trashType = el.dataset.type;
      
      if (binType === trashType) {
        // Correct
        state.score += 10;
        // Animation?
        bin.classList.add('highlight');
        setTimeout(() => bin.classList.remove('highlight'), 200);
      } else {
        // Wrong
        state.lives--;
        // Shake/Red effect?
      }
      
      removeTrash(el);
      updateUI();
      
      if (state.lives <= 0) gameOver();
    }
  });

  if (!droppedInBin) {
    // If dropped freely, it falls (we'll assume it falls to bottom and destroys)
    el.isDropping = true;
  }
}

function removeTrash(el) {
  el.remove();
  state.trashItems = state.trashItems.filter(i => i !== el);
}

// Main Loop
function gameLoop() {
  if (!state.isPlaying) return;

  const now = Date.now();
  
  // Difficulty scaling: Increase speed every 60s
  const elapsedMinutes = (now - state.startTime) / 60000;
  const currentSpeed = state.speed + (elapsedMinutes * CONFIG.speedIncrease);
  
  // Spawning
  // Adjust spawn rate based on speed (faster speed = faster spawn?)
  // Let's keep spawn rate constant or slightly faster
  if (now - state.lastSpawnTime > (CONFIG.spawnRate / (1 + elapsedMinutes * 0.5))) {
    spawnTrash();
    state.lastSpawnTime = now;
  }

  // Update Trash Positions
  state.trashItems.forEach(el => {
    if (el.isDragging) return; // Don't move if dragging

    if (el.isDropping) {
      // Fall down
      el.y += 15;
      if (el.y > gameArea.offsetHeight) {
        state.lives--; // Missed trash (fell to floor)
        removeTrash(el);
        updateUI();
        if (state.lives <= 0) gameOver();
      }
    } else {
      // Move along conveyor (Left to Right)
      el.x += currentSpeed;
      
      // If goes off screen right
      if (el.x > gameArea.offsetWidth) {
        state.lives--; // Missed trash
        removeTrash(el);
        updateUI();
        if (state.lives <= 0) gameOver();
      }
    }

    el.style.left = `${el.x}px`;
    el.style.top = `${el.y}px`;
  });

  requestAnimationFrame(gameLoop);
}

// Start
init();

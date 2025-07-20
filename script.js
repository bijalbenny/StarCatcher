// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get control elements
const startButton = document.getElementById('startButton');
const catcherSpeedSlider = document.getElementById('catcherSpeed');
const starSpeedSlider = document.getElementById('starSpeed');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const messageBox = document.getElementById('message-box');
const getEncouragementButton = document.getElementById('getEncouragementButton');
const getStarFactButton = document.getElementById('getStarFactButton');

const highScoreDisplay = document.getElementById('highScoreDisplay');

// Game state variables
let gameRunning = false;
let score = 0;
let lives = 3;
let animationFrameId; // To store the requestAnimationFrame ID
let highScore = localStorage.getItem('starCatcherHighScore') || 0; // Load high score from local storage

// Catcher properties
const catcher = {
    x: 0, // Will be set in setCanvasDimensions
    y: 0, // Will be set in setCanvasDimensions
    width: 100,
    height: 20,
    dx: 0,
    speed: parseInt(catcherSpeedSlider.value),
    originalWidth: 100,
    originalColor: '#A0522D', // Sienna color for basket
    powerUpColor: '#FF4500' // Orange-red for mega catcher power-up state
};

// Stars array
let stars = [];
let originalStarFallSpeed = parseInt(starSpeedSlider.value); // Store original speed
let currentStarFallSpeed = originalStarFallSpeed; // Current falling speed, can be modified by power-ups
const starSpawnInterval = 1000; // Time in ms between new star spawns
let lastStarSpawnTime = 0;

// Power-up states
let megaCatcherTimeoutId = null;
const megaCatcherDuration = 5000; // 5 seconds
let timeSlowdownTimeoutId = null; // New: Timeout for time slowdown power-up
const timeSlowdownDuration = 7000; // 7 seconds for slowdown effect
const slowdownFactor = 0.3; // Stars will fall at 30% of their original speed

// Tone.js Synths for sound effects, initialized once
let starCatchSynth;
let bombHitSynth;
let gameOverSynth;
let toneStarted = false;

// --- Game Initialization and Setup ---

// Function to set canvas dimensions based on parent container
function setCanvasDimensions() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;

    canvas.width = Math.min(containerWidth * 0.9, 800);
    canvas.height = canvas.width * (3 / 4); // Maintain 4:3 aspect ratio

    // Adjust catcher position on resize
    catcher.x = canvas.width / 2 - catcher.width / 2;
    catcher.y = canvas.height - 60;
}

// Initial game setup or reset
function initGame() {
    score = 0;
    lives = 3;
    stars = []; // Clear all falling items
    catcher.width = catcher.originalWidth; // Reset catcher width
    catcher.dx = 0; // Stop catcher movement
    catcher.color = catcher.originalColor; // Reset catcher color

    // Reset star fall speed
    currentStarFallSpeed = originalStarFallSpeed;

    // Clear any active power-up timeouts
    if (megaCatcherTimeoutId) {
        clearTimeout(megaCatcherTimeoutId);
        megaCatcherTimeoutId = null;
    }
    if (timeSlowdownTimeoutId) { // Clear time slowdown timeout
        clearTimeout(timeSlowdownTimeoutId);
        timeSlowdownTimeoutId = null;
    }

    gameRunning = false;
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    highScoreDisplay.textContent = highScore; // Display high score
    startButton.textContent = 'Start Game'; // Ensure button text is 'Start Game'

    showMessage("Press 'Start Game' to begin! Use Left/Right arrow keys or swipe to move.");
    draw(); // Redraw initial empty state

    // Reset last spawn time to ensure a delay before the first item appears
    lastStarSpawnTime = Date.now();
}

// --- Drawing Functions ---
function drawCatcher() {
    ctx.beginPath();
    const basketWidth = catcher.width;
    const basketHeight = catcher.height;
    const cornerRadius = basketHeight / 2; // Half of height for rounded ends

    // Draw the main body of the basket with rounded corners
    // ctx.roundRect is not universally supported, so we'll draw it manually with arcs and lines
    // Bottom left arc
    ctx.arc(catcher.x + cornerRadius, catcher.y + basketHeight - cornerRadius, cornerRadius, Math.PI / 2, Math.PI);
    // Left line
    ctx.lineTo(catcher.x, catcher.y + cornerRadius);
    // Top left arc
    ctx.arc(catcher.x + cornerRadius, catcher.y + cornerRadius, cornerRadius, Math.PI, Math.PI * 3 / 2);
    // Top line
    ctx.lineTo(catcher.x + basketWidth - cornerRadius, catcher.y);
    // Top right arc
    ctx.arc(catcher.x + basketWidth - cornerRadius, catcher.y + cornerRadius, cornerRadius, Math.PI * 3 / 2, Math.PI * 2);
    // Right line
    ctx.lineTo(catcher.x + basketWidth, catcher.y + basketHeight - cornerRadius);
    // Bottom right arc
    ctx.arc(catcher.x + basketWidth - cornerRadius, catcher.y + basketHeight - cornerRadius, cornerRadius, 0, Math.PI / 2);
    ctx.closePath();

    ctx.fillStyle = catcher.color; // Use catcher's current color
    ctx.fill();
    ctx.strokeStyle = '#8B4513'; // SaddleBrown for border
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the basket opening/rim (a slightly darker rectangle on top)
    ctx.beginPath();
    ctx.rect(catcher.x + basketWidth * 0.1, catcher.y, basketWidth * 0.8, basketHeight * 0.3);
    ctx.fillStyle = '#CD853F'; // Peru color for rim
    ctx.fill();
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
}

function drawStar(star) {
    ctx.beginPath();
    const outerRadius = star.size / 2;
    const innerRadius = outerRadius / 2;
    const numPoints = 5;

    ctx.fillStyle = '#FFD700'; // Gold color for stars
    ctx.strokeStyle = '#DAA520'; // Darker gold for border
    ctx.lineWidth = 2;

    ctx.moveTo(star.x, star.y - outerRadius);

    for (let i = 0; i < numPoints; i++) {
        let angle = (i * Math.PI * 2 / numPoints) - (Math.PI / 2);
        ctx.lineTo(star.x + outerRadius * Math.cos(angle), star.y + outerRadius * Math.sin(angle));
        angle += (Math.PI / numPoints);
        ctx.lineTo(star.x + innerRadius * Math.cos(angle), star.y + innerRadius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawBomb(bomb) {
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#333333'; // Dark gray/black for bomb
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw a simple fuse
    ctx.beginPath();
    ctx.moveTo(bomb.x + bomb.size / 4, bomb.y - bomb.size / 2);
    ctx.lineTo(bomb.x + bomb.size / 2, bomb.y - bomb.size);
    ctx.strokeStyle = '#FF4500'; // Orange-red for fuse
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

function drawPowerUpStar(powerup) {
    ctx.beginPath();
    const outerRadius = powerup.size / 2;
    const innerRadius = outerRadius / 2;
    const numPoints = 5;

    ctx.fillStyle = '#8A2BE2'; // BlueViolet for power-up star
    ctx.strokeStyle = '#4B0082'; // Indigo for border
    ctx.lineWidth = 3; // Thicker border for emphasis

    ctx.moveTo(powerup.x, powerup.y - outerRadius);

    for (let i = 0; i < numPoints; i++) {
        let angle = (i * Math.PI * 2 / numPoints) - (Math.PI / 2);
        ctx.lineTo(powerup.x + outerRadius * Math.cos(angle), powerup.y + outerRadius * Math.sin(angle));
        angle += (Math.PI / numPoints);
        ctx.lineTo(powerup.x + innerRadius * Math.cos(angle), powerup.y + innerRadius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Add a small "P" for Power-up
    ctx.fillStyle = 'white';
    ctx.font = `${powerup.size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', powerup.x, powerup.y);
}

// Draw Time Slowdown power-up
function drawTimeSlowdown(item) {
    ctx.beginPath();
    const size = item.size;
    const x = item.x;
    const y = item.y;

    // Draw a gear/cog shape
    ctx.fillStyle = '#1ABC9C'; // Turquoise color
    ctx.strokeStyle = '#16A085'; // Darker turquoise
    ctx.lineWidth = 2;

    const numTeeth = 8;
    const toothWidthAngle = Math.PI / (numTeeth * 1.5);
    const toothDepth = size * 0.15;

    for (let i = 0; i < numTeeth; i++) {
        const angle = (i * Math.PI * 2 / numTeeth);
        const outerX = x + size / 2 * Math.cos(angle);
        const outerY = y + size / 2 * Math.sin(angle);
        const innerX = x + (size / 2 - toothDepth) * Math.cos(angle + toothWidthAngle / 2);
        const innerY = y + (size / 2 - toothDepth) * Math.sin(angle + toothWidthAngle / 2);

        if (i === 0) {
            ctx.moveTo(outerX, outerY);
        } else {
            ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw a small clock hand/arrow in the center
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.2, y - size * 0.2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    drawCatcher();
    stars.forEach(item => {
        if (item.type === 'star') {
            drawStar(item);
        } else if (item.type === 'bomb') {
            drawBomb(item);
        } else if (item.type === 'powerup') {
            drawPowerUpStar(item);
        } else if (item.type === 'timeslowdown') {
            drawTimeSlowdown(item);
        }
    });
}

// --- Update Functions ---
function updateCatcher() {
    catcher.x += catcher.dx;

    // Keep catcher within canvas bounds
    if (catcher.x < 0) {
        catcher.x = 0;
    }
    if (catcher.x + catcher.width > canvas.width) {
        catcher.x = canvas.width - catcher.width;
    }
}

function showFloatingFeedback(x, y, text, type) {
    const feedbackElement = document.createElement('div');
    feedbackElement.textContent = text;
    feedbackElement.classList.add('score-feedback');
    if (type === 'positive') {
        feedbackElement.classList.add('score-positive');
    } else if (type === 'negative') {
        feedbackElement.classList.add('score-negative');
    }

    const canvasRect = canvas.getBoundingClientRect();
    feedbackElement.style.left = `${canvasRect.left + x}px`;
    feedbackElement.style.top = `${canvasRect.top + y}px`;
    feedbackElement.style.zIndex = 100;

    document.body.appendChild(feedbackElement);

    feedbackElement.addEventListener('animationend', () => {
        feedbackElement.remove();
    });
}

function updateStars() {
    const currentTime = Date.now();

    // Spawn new elements (stars, bombs, power-ups, time slowdowns)
    if (currentTime - lastStarSpawnTime > starSpawnInterval && gameRunning) {
        const randomVal = Math.random();
        let type = 'star';
        if (randomVal < 0.15) { // 15% chance for bomb
            type = 'bomb';
        } else if (randomVal < 0.20) { // 5% chance for mega catcher power-up
            type = 'powerup';
        } else if (randomVal < 0.25) { // 5% chance for time slowdown (total 25%)
            type = 'timeslowdown';
        }

        stars.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -20,
            size: 30,
            type: type
        });
        lastStarSpawnTime = currentTime;
    }

    // Move and check elements
    for (let i = stars.length - 1; i >= 0; i--) {
        const item = stars[i];
        item.y += currentStarFallSpeed; // Use currentStarFallSpeed for movement

        // Check for collision with catcher
        if (
            item.y + item.size > catcher.y &&
            item.x + item.size > catcher.x &&
            item.x < catcher.x + catcher.width &&
            item.y < catcher.y + catcher.height
        ) {
            if (item.type === 'star') {
                score += 10;
                scoreDisplay.textContent = score;
                starCatchSynth.triggerAttackRelease("C5", "8n");
                showFloatingFeedback(item.x, item.y, '+10', 'positive');
            } else if (item.type === 'bomb') {
                if (gameRunning && lives > 0) {
                    lives = Math.max(0, lives - 1); // Ensure lives don't go below 0
                    livesDisplay.textContent = lives;
                    bombHitSynth.triggerAttackRelease("C2", "8n");
                    showFloatingFeedback(item.x, item.y, '-1 Life', 'negative');
                    if (lives === 0) {
                        endGame();
                        return; // Stop processing further items in this frame
                    }
                }
            } else if (item.type === 'powerup') {
                activateMegaCatcher();
                starCatchSynth.triggerAttackRelease("E6", "8n");
                showFloatingFeedback(item.x, item.y, 'MEGA CATCHER!', 'positive');
            } else if (item.type === 'timeslowdown') {
                activateTimeSlowdown();
                starCatchSynth.triggerAttackRelease("A5", "8n");
                showFloatingFeedback(item.x, item.y, 'TIME SLOW!', 'positive');
            }
            stars.splice(i, 1); // Remove caught item
        } else if (item.y > canvas.height) {
            // Item missed the catcher and went off-screen
            // Only lose a life if a star is missed. Bombs and power-ups falling off-screen do not reduce lives.
            if (gameRunning && (item.type === 'star')) {
                if (lives > 0) {
                    lives = Math.max(0, lives - 1); // Ensure lives don't go below 0
                    livesDisplay.textContent = lives;
                    bombHitSynth.triggerAttackRelease("C3", "8n");
                    showFloatingFeedback(item.x, item.y, '-1 Life', 'negative');
                }
            }
            stars.splice(i, 1); // Remove missed item
            if (gameRunning && lives === 0) {
                endGame();
                return;
            }
        }
    }
}

// --- Power-up Logic ---
function activateMegaCatcher() {
    if (megaCatcherTimeoutId) {
        clearTimeout(megaCatcherTimeoutId);
    }
    catcher.width = catcher.originalWidth * 1.5; // Increase catcher width
    catcher.color = catcher.powerUpColor; // Change catcher color
    // Ensure catcher stays within bounds after resizing
    if (catcher.x + catcher.width > canvas.width) {
        catcher.x = canvas.width - catcher.width;
    }

    megaCatcherTimeoutId = setTimeout(() => {
        catcher.width = catcher.originalWidth; // Reset to original width
        catcher.color = catcher.originalColor; // Reset catcher color
        megaCatcherTimeoutId = null;
    }, megaCatcherDuration);
}

// Activate Time Slowdown
function activateTimeSlowdown() {
    if (timeSlowdownTimeoutId) {
        clearTimeout(timeSlowdownTimeoutId);
    }
    currentStarFallSpeed = originalStarFallSpeed * slowdownFactor; // Slow down stars
    catcher.color = '#1ABC9C'; // Change catcher color to indicate slowdown active

    timeSlowdownTimeoutId = setTimeout(() => {
        currentStarFallSpeed = originalStarFallSpeed; // Revert to original speed
        catcher.color = catcher.originalColor; // Revert catcher color
        timeSlowdownTimeoutId = null;
    }, timeSlowdownDuration);
}


// --- Game Loop ---
function animate() {
    if (!gameRunning) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    updateCatcher();
    updateStars();
    draw();

    animationFrameId = requestAnimationFrame(animate);
}

// --- Game State Management ---
function startGame() {
    // Always reset the game state when starting a new game or playing again
    resetGame(); 
    
    gameRunning = true;
    hideMessage(); // Hide message box when game starts
    startButton.textContent = 'Restart Game'; // Indicate it's a restart option
    animate(); // Start the animation loop
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    gameOverSynth.triggerAttackRelease("C3", "1n");
    
    // Update high score if current score is greater
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('starCatcherHighScore', highScore);
        highScoreDisplay.textContent = highScore;
        showMessage(`Game Over! New High Score: ${score}! Press 'Play Again?' to retry.`);
    } else {
        showMessage(`Game Over! Your final score is: ${score}. High Score: ${highScore}. Press 'Play Again?' to retry.`);
    }
    
    // Change the text of the start button to ask to play again
    startButton.textContent = 'Play Again?';
}

function resetGame() {
    cancelAnimationFrame(animationFrameId); // Stop any ongoing animation
    initGame(); // Reset all game variables and UI to initial state
}

// --- Gemini API Integration ---
async function callGeminiAPI(prompt, successCallback, errorCallback) {
    showMessage("Loading... <span class='loading-spinner'></span>");
    // This is the endpoint for your Netlify Function
    const apiUrl = '/.netlify/functions/gemini-proxy'; 

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }) // Send the prompt to your function
        });
        const result = await response.json();

        if (response.ok) { // Check if the function call was successful (status 200)
            successCallback(result.text); // Access the 'text' property from your function's response
        } else {
            errorCallback(result.error || "An unknown error occurred from the serverless function.");
        }
    } catch (error) {
        console.error("Error calling Netlify Function:", error);
        errorCallback("Error fetching data. Please try again.");
    }
}

function getEncouragement() {
    const prompt = `Generate a short, encouraging message for a child who is playing a star-catching game. The message should be positive, simple, and congratulate them on their effort or score. Keep it under 20 words. Current score: ${score}.`;
    callGeminiAPI(prompt, (msg) => {
        showMessage(`✨ ${msg}`);
    }, (error) => {
        showMessage(`Error: ${error}`);
    });
}

function getStarFact() {
    const prompt = "Generate a very simple and interesting fact about stars or space, suitable for a child. Keep it under 15 words.";
    callGeminiAPI(prompt, (fact) => {
        showMessage(`✨ Did you know? ${fact}`);
    }, (error) => {
        showMessage(`Error: ${error}`);
    });
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
getEncouragementButton.addEventListener('click', getEncouragement);
getStarFactButton.addEventListener('click', getStarFact);

catcherSpeedSlider.addEventListener('input', (event) => {
    catcher.speed = parseInt(event.target.value);
});

starSpeedSlider.addEventListener('input', (event) => {
    originalStarFallSpeed = parseInt(event.target.value); // Update original speed
    if (!timeSlowdownTimeoutId) { // Only update current speed if no slowdown is active
        currentStarFallSpeed = originalStarFallSpeed;
    }
});

// Keyboard controls for catcher movement
document.addEventListener('keydown', (e) => {
    if (gameRunning) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            catcher.dx = -catcher.speed;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            catcher.dx = catcher.speed;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
        catcher.dx = 0; // Stop movement when key is released
    }
});

// Touch controls for catcher movement
let initialTouchX = null;

canvas.addEventListener('touchstart', (e) => {
    if (gameRunning) {
        initialTouchX = e.touches[0].clientX;
        // Prevent default to avoid scrolling/zooming on touch
        e.preventDefault(); 
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (gameRunning && initialTouchX !== null) {
        const currentTouchX = e.touches[0].clientX;
        const deltaX = currentTouchX - initialTouchX;

        // Adjust catcher.dx based on swipe direction and speed
        // Scale deltaX to control sensitivity, and clamp to catcher.speed
        const sensitivity = 0.5; // Adjust this value to change how fast the catcher moves with a swipe
        catcher.dx = Math.max(-catcher.speed, Math.min(catcher.speed, deltaX * sensitivity));
        
        // Update initialTouchX for continuous movement
        initialTouchX = currentTouchX;
        e.preventDefault(); // Prevent default to avoid scrolling/zooming on touch
    }
});

canvas.addEventListener('touchend', () => {
    if (gameRunning) {
        catcher.dx = 0; // Stop movement when touch ends
        initialTouchX = null;
    }
});


// --- Message Box Functions (for alerts/prompts) ---
function showMessage(msg) {
    messageBox.innerHTML = msg; // Use innerHTML to allow for spinner
    messageBox.style.display = 'block';
}

function hideMessage() {
    messageBox.style.display = 'none';
}

// Initial setup on window load
window.onload = function() {
    setCanvasDimensions();
    initGame(); // Initialize game state
    // Initialize Tone.js synths here to ensure they are available
    starCatchSynth = new Tone.Synth().toDestination();
    bombHitSynth = new Tone.MembraneSynth().toDestination();
    gameOverSynth = new Tone.Synth().toDestination();

    // Start Tone.js context on first user interaction to avoid browser autoplay policy issues
    document.body.addEventListener('click', () => {
        if (!toneStarted) {
            Tone.start();
            toneStarted = true;
        }
    }, { once: true });
};

window.addEventListener('resize', setCanvasDimensions);

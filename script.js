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

// Game state variables
let gameRunning = false;
let gamePaused = false; // Game will always be paused when not running
let score = 0;
let lives = 3;
let animationFrameId; // To store the requestAnimationFrame ID

// Catcher properties
const catcher = {
    x: 0, // Will be set in setCanvasDimensions
    y: 0, // Will be set in setCanvasDimensions
    width: 100,
    height: 20,
    dx: 0,
    speed: parseInt(catcherSpeedSlider.value),
    originalWidth: 100
};

// Stars array
let stars = [];
let starFallSpeed = parseInt(starSpeedSlider.value);
const starSpawnInterval = 1000; // Time in ms between new star spawns
let lastStarSpawnTime = 0;

// Power-up state
let megaCatcherTimeoutId = null;
const megaCatcherDuration = 5000; // 5 seconds

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
    
    // Clear any active power-up timeouts
    if (megaCatcherTimeoutId) {
        clearTimeout(megaCatcherTimeoutId);
        megaCatcherTimeoutId = null;
    }

    gameRunning = false;
    gamePaused = false; // Ensure game is paused when initialized
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    startButton.textContent = 'Start Game'; // Ensure button text is 'Start Game'
    showMessage("Press 'Start Game' to begin! Use Left/Right arrow keys to move.");
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

    ctx.fillStyle = '#A0522D'; // Sienna color for basket
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

    // Spawn new elements (stars, bombs, power-ups)
    if (currentTime - lastStarSpawnTime > starSpawnInterval && gameRunning && !gamePaused) {
        const randomVal = Math.random();
        let type = 'star';
        if (randomVal < 0.15) { // 15% chance for bomb
            type = 'bomb';
        } else if (randomVal < 0.20) { // 5% chance for power-up (total 20%)
            type = 'powerup';
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
        item.y += starFallSpeed;

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
            }
            stars.splice(i, 1); // Remove caught item
        } else if (item.y > canvas.height) {
            // Item missed the catcher and went off-screen
            if (gameRunning && (item.type === 'star' || item.type === 'powerup')) {
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
    // Ensure catcher stays within bounds after resizing
    if (catcher.x + catcher.width > canvas.width) {
        catcher.x = canvas.width - catcher.width;
    }

    megaCatcherTimeoutId = setTimeout(() => {
        catcher.width = catcher.originalWidth; // Reset to original width
        megaCatcherTimeoutId = null;
    }, megaCatcherDuration);
}

// --- Game Loop ---
function animate() {
    if (!gameRunning || gamePaused) {
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
    // If the game is already running or paused, it's a restart.
    if (gameRunning || gamePaused) {
        resetGame(); // Fully reset the game state
    }
    
    gameRunning = true;
    gamePaused = false; // Game is running, so it's not paused
    hideMessage(); // Hide message box when game starts
    startButton.textContent = 'Restart Game'; // Indicate it's a restart option
    animate(); // Start the animation loop
}

function endGame() {
    gameRunning = false;
    gamePaused = true; // Ensure game is paused when over
    cancelAnimationFrame(animationFrameId);
    gameOverSynth.triggerAttackRelease("C3", "1n");
    showMessage(`Game Over! Your final score is: ${score}. Press 'Play Again?' to retry.`);
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
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = ""; // Canvas will provide this in runtime
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            successCallback(text);
        } else {
            errorCallback("Failed to get a response from Gemini.");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
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
    starFallSpeed = parseInt(event.target.value);
});

// Keyboard controls for catcher movement
document.addEventListener('keydown', (e) => {
    if (gameRunning && !gamePaused) { // Movement only if game is running and not paused
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
    if (gameRunning && !gamePaused) {
        initialTouchX = e.touches[0].clientX;
        // Prevent default to avoid scrolling/zooming on touch
        e.preventDefault(); 
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (gameRunning && !gamePaused && initialTouchX !== null) {
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
    if (gameRunning && !gamePaused) {
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

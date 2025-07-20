# ⭐ Star Catcher: A Simple Browser Game ⭐

## Project Overview

Star Catcher is a fun, interactive 2D arcade-style game built entirely with HTML, CSS (Tailwind CSS), and JavaScript. The objective is simple: control a catcher at the bottom of the screen to collect falling stars while avoiding dangerous bombs. Power-ups occasionally appear to give you an edge!

This project serves as a showcase of basic web game development principles, including:
* Canvas API for rendering graphics.
* Game loop management (`requestAnimationFrame`).
* Object-oriented principles for game entities (catcher, stars, bombs, power-ups).
* Collision detection.
* User input handling (keyboard).
* Dynamic UI updates (score, lives, messages).
* Integration of a third-party audio library (Tone.js) for sound effects.
* **Gemini API integration**: Demonstrates how to fetch dynamic content (encouragement messages and star facts) from a generative AI model.

## Features

* **Engaging Gameplay:** Catch falling stars for points, avoid bombs that reduce lives.
* **Power-Up System:** Collect special power-up stars to temporarily enlarge your catcher for easier star collection.
* **Adjustable Difficulty:** Control sliders for catcher speed and falling item speed to customize your challenge.
* **Interactive UI:** Live score and lives display.
* **Dynamic Messaging:** Receive game status updates and fun messages.
* **AI Integration (Gemini API):**
    * **Get Encouragement:** Request positive, game-specific encouragement messages.
    * **Star Fact:** Learn interesting, child-friendly facts about stars and space.
* **Sound Effects:** Engaging audio feedback for catching stars, hitting bombs, and game over, powered by Tone.js.
* **Responsive Design:** The canvas and controls adapt to different screen sizes thanks to Tailwind CSS.

## How to Play

1.  **Open the Game:** Simply open the `index.html` file in your web browser.
2.  **Start Game:** Click the "Start Game" button to begin.
3.  **Move the Catcher:** Use the **Left Arrow Key** (or 'A') and **Right Arrow Key** (or 'D') to move your catcher horizontally at the bottom of the screen.
4.  **Catch Stars:** Maneuver your catcher to collect the yellow stars. Each star caught increases your score by 10 points.
5.  **Avoid Bombs:** Black bomb icons will fall. If you catch a bomb, you lose 1 life.
6.  **Collect Power-Ups:** Purple "P" stars are power-ups! Catch them to temporarily increase the size of your catcher, making it easier to collect stars.
7.  **Lives:** You start with 3 lives. Lose a life by catching a bomb or letting a star/power-up fall past the bottom of the screen.
8.  **Game Over:** The game ends when you run out of lives. Your final score will be displayed.
9.  **Play Again?:** Click the "Play Again?" button (which replaces "Start Game" after game over) to restart.
10. **Adjust Speed:** Use the "Catcher Speed" and "Star Speed" sliders to change the game's difficulty before or during a game (though changes during a live game might affect immediate responsiveness).
11. **Get AI Help/Facts:** Click the "Get Encouragement" or "Star Fact" buttons to interact with the Gemini API.

## Technical Details

* **Frontend:** HTML, CSS (Tailwind CSS for utility-first styling)
* **Game Logic:** Vanilla JavaScript
* **Graphics:** HTML Canvas API
* **Sound Effects:** Tone.js library
* **AI Integration:** Google Gemini API (via `generateContent` endpoint)

### API Key Requirement

**Important:** For the "Get Encouragement" and "Star Fact" features to work, you need a valid Google Gemini API key. Please insert your API key in the `apiKey` variable within the `callGeminiAPI` function in the JavaScript section of `index.html`:

```javascript
const apiKey = "YOUR_GEMINI_API_KEY_HERE"; // Replace with your actual key

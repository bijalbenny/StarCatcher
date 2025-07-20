// netlify/functions/gemini-proxy.js

// Import node-fetch for making HTTP requests in a Node.js environment
// Netlify Functions run in a Node.js environment, so node-fetch is available.
const fetch = require('node-fetch');

// The main handler for the Netlify Function.
// It's an asynchronous function that receives event and context objects.
exports.handler = async function(event, context) {
  // Ensure the request method is POST, as we expect data in the body.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: "Method Not Allowed. Only POST requests are supported." }),
    };
  }

  try {
    // Parse the request body to get the 'prompt' sent from your game.
    // The event.body is a string, so it needs to be JSON parsed.
    const { prompt } = JSON.parse(event.body);

    // Access the Gemini API key from Netlify's environment variables.
    // This variable will be set in your Netlify site settings, NOT in the code.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Basic validation: Check if the API key is set.
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500, // Internal Server Error
        body: JSON.stringify({ error: "Server configuration error: API key not found." }),
      };
    }

    // Define the Gemini API endpoint.
    // The API key is appended as a query parameter here, but it's handled server-side.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Construct the payload for the Gemini API request.
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    // Make the actual call to the Gemini API.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Parse the response from the Gemini API.
    const result = await response.json();

    // Check if the Gemini API returned a valid response structure.
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      const text = result.candidates[0].content.parts[0].text;
      // Return a successful response to your game.
      return {
        statusCode: 200, // OK
        body: JSON.stringify({ text: text }), // Send the generated text back
      };
    } else {
      // Handle cases where Gemini API response structure is unexpected.
      return {
        statusCode: 500, // Internal Server Error
        body: JSON.stringify({ error: "Failed to get a valid response from Gemini." }),
      };
    }
  } catch (error) {
    // Catch any errors during the function execution (e.g., network issues, parsing errors).
    console.error("Error in Netlify Function:", error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: "Server error during API call: " + error.message }),
    };
  }
};

// netlify/functions/gemini-proxy.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    console.log("Method Not Allowed: Received a non-POST request.");
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Only POST requests are supported." }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    console.log("Received prompt:", prompt); // Log the received prompt

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log("API Key loaded:", GEMINI_API_KEY ? "Yes" : "No"); // Log if API key is loaded

    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error: API key not found. Please set GEMINI_API_KEY in Netlify environment variables." }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    console.log("Calling Gemini API with URL:", apiUrl); // Log the Gemini API URL
    console.log("Payload sent to Gemini:", JSON.stringify(payload)); // Log the payload

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Log the raw response status and headers from Gemini
    console.log("Gemini API Response Status:", response.status);
    console.log("Gemini API Response Headers:", JSON.stringify(response.headers.raw()));

    const result = await response.json();
    console.log("Gemini API Raw Result:", JSON.stringify(result)); // Log the full raw result from Gemini

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      const text = result.candidates[0].content.parts[0].text;
      console.log("Successfully extracted text from Gemini response.");
      return {
        statusCode: 200,
        body: JSON.stringify({ text: text }),
      };
    } else {
      console.error("Gemini API response structure unexpected:", JSON.stringify(result)); // Log unexpected structure
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to get a valid response from Gemini. Check function logs for details." }),
      };
    }
  } catch (error) {
    console.error("Error in Netlify Function:", error); // Log any caught errors
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error during API call: " + error.message }),
    };
  }
};

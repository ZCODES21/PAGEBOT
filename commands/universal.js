const axios = require('axios');

module.exports = {
  name: 'universal',
  description: 'Process user input and route to the appropriate API.',
  author: 'Deku & Adrian',

  async execute(senderId, args, pageAccessToken, sendMessage) {
    const userInput = args.join(' ').toLowerCase();

    try {
      if (checkPinterest(userInput)) {
        await processPinterest(senderId, userInput, pageAccessToken, sendMessage);
      } else if (checkSpotify(userInput)) {
        await processSpotify(senderId, userInput, pageAccessToken, sendMessage);
      } else {
        await processGpt(senderId, userInput, pageAccessToken, sendMessage);
      }
    } catch (error) {
      console.error(`Error executing ${this.name} command:`, error.message);
      sendMessage(senderId, { text: 'An error occurred while processing your request.' }, pageAccessToken);
    }
  },
};

// Function to check for Pinterest-related keywords
function checkPinterest(input) {
  const pinterestKeywords = [
    'pinterest', 'picture', 'image', 'photo', 'artwork',
    'snapshot', 'portrait', 'drawing', 'painting',
  ];
  return matchKeywords(input, pinterestKeywords);
}

// Function to check for Spotify-related keywords
function checkSpotify(input) {
  const spotifyKeywords = [
    'spotify', 'song', 'music', 'track', 'melody',
    'tune', 'composition', 'rhythm', 'harmony',
  ];
  return matchKeywords(input, spotifyKeywords);
}

// Generic function to match input with keywords
function matchKeywords(input, keywords) {
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
  return regex.test(input);
}

// Function to process Pinterest API request
async function processPinterest(senderId, query, pageAccessToken, sendMessage) {
  try {
    const { data } = await axios.get('https://deku-rest-api-ywad.onrender.com/api/pinterest', { params: { q: query } });
    const images = data.result;

    if (images?.length) {
      for (const imageUrl of images) {
        await sendMessage(senderId, {
          attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } },
        }, pageAccessToken);
      }
    } else {
      sendMessage(senderId, { text: 'No images found for your query.' }, pageAccessToken);
    }
  } catch (error) {
    console.error('Error fetching Pinterest images:', error.message);
    sendMessage(senderId, { text: 'An error occurred while processing your request.' }, pageAccessToken);
  }
}

// Function to process Spotify API request
async function processSpotify(senderId, query, pageAccessToken, sendMessage) {
  try {
    const { data } = await axios.get('https://deku-rest-api-ywad.onrender.com/spotify', { params: { q: query } });
    const spotifyLink = data.result;

    if (spotifyLink) {
      sendMessage(senderId, {
        attachment: { type: 'audio', payload: { url: spotifyLink, is_reusable: true } },
      }, pageAccessToken);
    } else {
      sendMessage(senderId, { text: 'No Spotify link found for your query.' }, pageAccessToken);
    }
  } catch (error) {
    console.error('Error retrieving Spotify link:', error.message);
    sendMessage(senderId, { text: 'An error occurred while processing your request.' }, pageAccessToken);
  }
}

// Function to process GPT-4o API request
async function processGpt(senderId, prompt, pageAccessToken, sendMessage) {
  const apiUrlPrimary = `https://api.kenliejugarap.com/freegpt4o128k/?question=${encodeURIComponent(prompt)}`;
  const apiUrlBackup = `https://deku-rest-api-ywad.onrender.com/gpt4?prompt=${encodeURIComponent(prompt)}&uid=${senderId}`;

  try {
    const { data } = await axios.get(apiUrlPrimary);
    const response = cleanText(data.response);
    await sendChunks(senderId, response, pageAccessToken, sendMessage);
  } catch (error) {
    console.error('Error with primary GPT-4o API:', error.message);
    try {
      const { data } = await axios.get(apiUrlBackup);
      const response = data.gpt4;
      await sendChunks(senderId, response, pageAccessToken, sendMessage);
    } catch (backupError) {
      console.error('Error with backup GPT API:', backupError.message);
      sendMessage(senderId, { text: 'An error occurred while processing your request.' }, pageAccessToken);
    }
  }
}

// Function to clean unwanted text from GPT response
function cleanText(text) {
  const unwantedText = /Is this answer helpful to you\? Kindly click.*maintain the servers,.*future\)/g;
  return text.replace(unwantedText, '');
}

// Function to send messages in chunks
async function sendChunks(senderId, text, pageAccessToken, sendMessage) {
  const chunkSize = 2000;
  const chunks = splitMessage(text, chunkSize);

  for (const chunk of chunks) {
    await sendMessage(senderId, { text: chunk }, pageAccessToken);
  }
}

// Function to split messages into smaller chunks
function splitMessage(message, chunkSize) {
  const words = message.split(' ');
  const chunks = [];
  let currentChunk = '';

  words.forEach(word => {
    if ((currentChunk + word).length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += `${word} `;
  });

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
// Function to split messages into smaller chunks
function splitMessage(message, chunkSize) {
  const words = message.split(' ');
  const chunks = [];
  let currentChunk = '';

  words.forEach((word) => {
    if ((currentChunk + word).length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += `${word} `;
  });

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

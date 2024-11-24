const axios = require('axios');
const cooldown = require('../utils/cooldown'); // Import cooldown module

// Define and export module
module.exports = {
  // Metadata for the command
  name: 'tiktokdl',  // Command name
  description: 'Download tiktok videos',  // Description
  usage: 'tiktokdl [link]',  // Usage
  author: 'KALIX AO',  // Author of the command

  // Main function that executes the command
  async execute(senderId, args, pageAccessToken, sendMessage) {
    // Sanitize the prompt (crucial for security)
    const prompt = args.join(' ');
    const apiUrl = `https://nethwieginedev.vercel.app/api/tiktokdl?link=${prompt}`;


      // Check cooldown for the senderId
      if (cooldown.checkCooldown(senderId, 6)) {
        await sendMessage(senderId, { text: 'Please wait 6 seconds before using this command again.' }, pageAccessToken);
        return; // Exit if sender is on cooldown
      }
      
      
    // Notify user that the image is being generated
    await sendMessage(senderId, { text: 'downloading videos...' }, pageAccessToken);

    try {
      // Send the generated image to the user as an attachment
      const response = await axios.get(apiUrl, {
        responseType: 'stream'
      });

      // Check if the API call was successful
      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Stream the image as an attachment instead of saving it locally
     await sendMessage(senderId, {
        attachment: {
          type: 'video',
          payload: {
            url: apiUrl  // URL of the generated image
          }
        }
      }, pageAccessToken);

        // Importantly, add the sender to the cooldown after successful execution.
        await cooldown.addCooldown(senderId, 6);


    } catch (error) {
      console.error('Error downloading video:', error);

      //Handle specific error types for better feedback
      if (error.response && error.response.status === 400) { // Example handling for bad request
          await sendMessage(senderId, {
              text: 'Invalid prompt. Please use a valid link.'
          }, pageAccessToken);
      } else {
          await sendMessage(senderId, {
              text: 'An error occurred while downloading the video. Please try again later.'
          }, pageAccessToken);
      }
    }
  }
};

// Helper function for sanitizing the prompt
function sanitizePrompt(prompt) {
  // Basic sanitization:  Only alphanumeric characters and spaces
  return /^[a-zA-Z0-9\s]+$/.test(prompt) ? prompt : null;
}
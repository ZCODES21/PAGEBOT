//const api = require('../jubiar-pagebot-api/sendmessage');
const axios = require('axios'); // Make sure axios is installed for API requests

module.exports = {
	name: 'ttdl', // Command keyword
	description: 'Downloads TikTok video without watermark',
	author: 'Xao [API BY KENLIE]',
	async execute(senderId, args, pageAccessToken, sendMessage) {
		try {
			// Extract the TikTok URL from the user's message
			const userTikTokUrl = args.join(' '); // Assuming the command is followed by the URL
			if (!userTikTokUrl) {
				await sendMessage(
					senderId,
					{
						text: 'Please provide a TikTok URL.',
					},
					pageAccessToken,
				);
				return;
			}

			// Fetch video data from the API
			const response = await axios.get(
				`https://api.kenliejugarap.com/tikwmbymarjhun/?url=${userTikTokUrl}&lang=en`,
			);
			const videoData = response.data;

			if (videoData.status && videoData.response === 'success') {
				const videoUrl = videoData.hd_play;

				// Attempt to send video; if too large, fallback to URL
				const videoMessage = {
					attachment: {
						type: 'video',
						payload: {
							url: videoUrl,
							is_reusable: true,
						},
					},
				};

				try {
					await sendMessage(senderId, videoMessage, pageAccessToken);
				} catch (error) {
					await sendMessage(
						senderId,
						{
							text: `The video is too large, watch it here:\n\n${videoUrl}`,
						},
						pageAccessToken,
					);
				}
			} else {
				// Handle case where video data is not successfully retrieved
				sendMessage(
					senderId,
					{
						text: 'Could not retrieve the video. Please check the URL and try again.',
					},
					pageAccessToken,
				);
			}
		} catch (error) {
			console.error(`Error executing ${this.name} command:`, error);
			await sendMessage(
				senderId,
				{
					text: 'An error occurred while processing your request.',
				},
				pageAccessToken,
			);
		}
	},
};

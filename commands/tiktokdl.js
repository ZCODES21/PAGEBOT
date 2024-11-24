const axios = require('axios'); // Import axios for making API requests

module.exports = {
	name: 'tiktokdl',
	description: 'Download TikTok videos',
	usage: 'tiktokdl <TikTok link>',
	author: 'KALIX AO',
	async execute(senderId, args, pageAccessToken, sendMessage) {
		const prompt = args.join(' ');

		if (!isValidTikTokLink(prompt)) {
			return sendMessage(
				senderId,
				{ text: 'Invalid TikTok link.' },
				pageAccessToken,
			);
		}

		try {
			const apiUrl = `https://nethwieginedev.vercel.app/api/tiktokdl?link=${prompt}`;
			const response = await axios.get(apiUrl);

			if (response.data.status === 'success') {
				if (response.data.video_url.includes('.mp4')) {
					sendMessage(
						senderId,
						{
							attachment: {
								type: 'video',
								payload: {
									url: response.data.video_url,
								},
							},
						},
						pageAccessToken,
					);
				} else {
					sendMessage(
						senderId,
						{ text: 'No video found for this link' },
						pageAccessToken,
					);
				}
			} else {
				console.error('API Error:', response.data.message); // Log the specific API error message
				sendMessage(
					senderId,
					{
						text:
							response.data.message ||
							'There was an error fetching the video.',
					},
					pageAccessToken,
				); //added an OR operator so if the api returns an error but with no message this will still send the default message
			}
		} catch (error) {
			console.error('Error:', error);
			sendMessage(
				senderId,
				{
					text: 'There was an error downloading the video.',
				},
				pageAccessToken,
			);
		}
	},
};

function isValidTikTokLink(link) {
	// Improved regular expression to handle various TikTok link formats
	const tiktokRegex =
		/^(https?:\/\/)?(www\.)?(vt\.|vm\.|m\.)?tiktok\.com\/[A-Za-z0-9-_@]+\/?/;
	return tiktokRegex.test(link);
}

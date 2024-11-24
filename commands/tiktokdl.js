const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique filenames

module.exports = {
	name: 'tiktokdl',
	description: 'Download TikTok videos',
	usage: 'tiktokdl <tiktok_link>',
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

			if (response.data.success) {
				const videoUrl = response.data.link;
				const videoPath = path.join(
					__dirname,
					'../data/' + uuidv4() + '.mp4',
				);

				sendMessage(
					senderId,
					{
						attachment: {
							type: 'video',
							payload: {
								url: videoUrl,
							},
						},
					},
					pageAccessToken,
				);

				const videoResponse = await axios.get(videoUrl, {
					responseType: 'stream',
				}); //important
				//pipe the result stream into a file on disc
				videoResponse.data
					.pipe(fs.createWriteStream(videoPath))
					.on('finish', () => {
						sendMessage(
							senderId,
							{
								text: `✨`,
								filedata: fs.createReadStream(videoPath),
							},
							pageAccessToken,
						);
						fs.unlinkSync(videoPath); //delete after sending
					});
			} else {
				sendMessage(
					senderId,
					{
						text: 'Could not download the video. Please try again later or use a different link',
					},
					pageAccessToken,
				);
			}
		} catch (error) {
			console.error('Error:', error);
			sendMessage(
				senderId,
				{ text: 'There was an error downloading the video.' },
				pageAccessToken,
			);
		}
	},
};

function isValidTikTokLink(link) {
	const tiktokRegex =
		/^(https?:\/\/)?(www\.)?(vt\.tiktok\.com|tiktok\.com)\/.*$/;
	//const tiktokRegex = /^(https?:\/\/)?(www\.)?tiktok\.com\/[@\w\.]+\/video\/(\d+)\/?$/; // More specific regex
	return tiktokRegex.test(link);
}

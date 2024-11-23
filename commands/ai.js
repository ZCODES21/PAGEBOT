const axios = require('axios');
const { fontChanger } = require('../utils/fonts');

module.exports = {
	name: 'ai',
	description: 'Interact with Xaoai.',
	usage: 'direct chat.',
	author: 'KALIX AO',

	async execute(senderId, args, pageAccessToken, sendMessage) {
		const userInput = args.join(' ');

		try {
			const {
				data: { result, error },
			} = await axios.get(
				`https://api.y2pheq.me/xaoai?prompt=${encodeURIComponent(
					userInput,
				)}&uid=${senderId}`,
			);

			const responseURL = fontChanger(result);
			const output = responseURL.replace(/\*/g, '');

			sendMessage(
				senderId,
				{
					text: output,
				},
				pageAccessToken,
			);
		} catch (apiError) {
			console.error(
				`Error executing ${this.name} command:`,
				apiError.message,
			);

			if (apiError.error) {
				// Check if there's a response from the API
				sendMessage(
					senderId,
					{
						text: apiError.error,
					},
					pageAccessToken,
				);
			}
		}
	},
};

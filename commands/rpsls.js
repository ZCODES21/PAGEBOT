const axios = require('axios');

module.exports = {
	name: 'rpsls',
	description: 'Play rock, paper, scissors, lizard and spock with me.',
	usage: 'tracks [song title]',
	author: 'Xao',
	async execute(senderId, args, pageAccessToken, sendMessage) {
		let query = args.join(' ');
		const apiURL = 'https://api.y2pheq.me/rpsls';
		if (!query) {
			sendMessage(
				senderId,
				{
					text: module.exports.usage,
				},
				pageAccessToken,
			);
		}

		try {
			const {
				data: { result, stats },
			} = await axios.get(`${apiURL}?q=${encodeURIComponent(query)}`);

			let userChoice = result.userChoice;
			let computerChoice = result.computerChoice;
			let winner = result.winner;
			let message = result.message;
			let globalStatsUserWins = stats.userWins;
			let globalStatsComputerWins = stats.computerWins;
			let globalStatsTies = stats.ties;

			let messageFormat = `-- RPSLS GAME RESULT --
			PLAYER CHOICE: ${query}
			COMPUTER CHOICE: ${computerChoice}
			RESULT: ${message}
			
			-- GLOBAL STATS --
			PLAYER WIN COUNT: ${globalStatsUserWins}
			COMPUTER WIN COUNT: ${globalStatsComputerWins}
			GAME TIES: ${globalStatsTies}
			`;

			sendMessage(
				senderId,
				{
					text: messageFormat,
				},
				pageAccessToken,
			);
		} catch (error) {
			console.error(
				`Error executing ${this.name} command:`,
				error.message,
			);
			sendMessage(
				senderId,
				{
					text: error.message,
				},
				pageAccessToken,
			);
		}
	},
};

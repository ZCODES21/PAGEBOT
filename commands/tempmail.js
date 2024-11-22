const axios = require('axios');

const domains = [
	'rteet.com',
	'1secmail.com',
	'1secmail.org',
	'1secmail.net',
	'wwjmp.com',
	'esiix.com',
	'xojxe.com',
	'yoggm.com',
];

// Store emails and their last message IDs
const emailData = {};

module.exports = {
	name: 'secmail',
	description:
		'Generate temporary email and check message inbox using secmail API. Automatically notifies of new emails.',
	usage: 'secmail [gen | inbox <email> | stop <email>]',
	author: 'Xao',

	async execute(senderId, args, pageAccessToken, sendMessage) {
		const [cmd, email] = args;

		if (cmd === 'gen') {
			const domain = domains[Math.floor(Math.random() * domains.length)];
			const generatedEmail = `${Math.random()
				.toString(36)
				.slice(2, 10)}@${domain}`;
			sendMessage(
				senderId,
				{
					text: `${generatedEmail}`,
				},
				pageAccessToken,
			);

			// Start auto-check for generated email
			this.startAutoCheck(
				senderId,
				generatedEmail,
				pageAccessToken,
				sendMessage,
			);
			return;
		}

		if (
			cmd === 'inbox' &&
			email &&
			domains.some(d => email.endsWith(`@${d}`))
		) {
			await this.checkInbox(
				senderId,
				email,
				pageAccessToken,
				sendMessage,
			);
			return;
		}

		if (cmd === 'stop' && email) {
			this.stopAutoCheck(senderId, email, pageAccessToken, sendMessage);
			return;
		}

		sendMessage(
			senderId,
			{
				text: `Invalid usage: ${this.usage}`,
			},
			pageAccessToken,
		);
	},

	async checkInbox(
		senderId,
		email,
		pageAccessToken,
		sendMessage,
		isAuto = false,
	) {
		try {
			const [username, domain] = email.split('@');
			const inbox = (
				await axios.get(
					`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`,
				)
			).data;

			if (!inbox.length) {
				if (!isAuto) {
					sendMessage(
						senderId,
						{ text: 'Inbox is empty.' },
						pageAccessToken,
					);
				}
				return;
			}

			// Sort inbox by date, newest first
			inbox.sort((a, b) => new Date(b.date) - new Date(a.date));

			const latestMessage = inbox[0];
			const { id, from, subject, date } = latestMessage;

			if (
				emailData[senderId] &&
				emailData[senderId].lastMessageId === id
			) {
				return; // No new messages
			}

			if (emailData[senderId]) {
				emailData[senderId].lastMessageId = id;
			}

			const { textBody } = (
				await axios.get(
					`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${id}`,
				)
			).data;

			sendMessage(
				senderId,
				{
					text: `📮 | NEW EMAIL:\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\nContent:\n${textBody}`,
				},
				pageAccessToken,
			);
		} catch (error) {
			console.error('Error in checkInbox:', error);
			if (!isAuto) {
				sendMessage(
					senderId,
					{ text: 'Error: Unable to fetch inbox or email content.' },
					pageAccessToken,
				);
			}
		}
	},

	startAutoCheck(senderId, email, pageAccessToken, sendMessage) {
		// Clear existing interval if any
		this.stopAutoCheck(
			senderId,
			email,
			pageAccessToken,
			sendMessage,
			false,
		);

		// Initialize email data for auto-check
		emailData[senderId] = {
			email: email,
			lastMessageId: null,
			interval: null,
		};

		// Start the interval
		emailData[senderId].interval = setInterval(async () => {
			await this.checkInbox(
				senderId,
				email,
				pageAccessToken,
				sendMessage,
				true,
			);
		}, 15000); // Check every 15 seconds
	},
	stopAutoCheck(
		senderId,
		email,
		pageAccessToken,
		sendMessage,
		sendMsg = true,
	) {
		if (emailData[senderId] && emailData[senderId].interval) {
			clearInterval(emailData[senderId].interval);
			emailData[senderId].interval = null;
			if (sendMsg) {
				sendMessage(
					senderId,
					{ text: `Auto-check stopped for ${email}.` },
					pageAccessToken,
				);
			}
		} else if (sendMsg) {
			sendMessage(
				senderId,
				{ text: `No auto-check is running for ${email}.` },
				pageAccessToken,
			);
		}
	},
};

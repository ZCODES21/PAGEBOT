const axios = require('axios');

const domains = ['rteet.com', '1secmail.com', '1secmail.org', '1secmail.net'];

// Store emails, their message history, and auto-check status
const emailData = {};

// Store previous emails for each user
const userEmails = {};

module.exports = {
	name: 'secmail',
	description:
		'Generate temporary email and view message history. Automatically notifies of new emails.',
	usage: 'secmail [ gen | emails | inbox <email> | stop <email> ]',
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

			// Store generated email for the user
			if (!userEmails[senderId]) {
				userEmails[senderId] = [];
			}
			userEmails[senderId].push(generatedEmail);

			// Start auto-check for generated email
			this.startAutoCheck(
				senderId,
				generatedEmail,
				pageAccessToken,
				sendMessage,
			);
			return;
		}

		if (cmd === 'inbox' && email) {
			await this.viewEmailHistory(
				senderId,
				email,
				pageAccessToken,
				sendMessage,
			);
			return;
		}

		if (cmd === 'emails') {
			this.showPreviousEmails(senderId, pageAccessToken, sendMessage);
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

	async viewEmailHistory(senderId, email, pageAccessToken, sendMessage) {
		if (!emailData[senderId] || emailData[senderId].email !== email) {
			sendMessage(
				senderId,
				{ text: 'Email not found in history or no history available.' },
				pageAccessToken,
			);
			return;
		}

		const history = emailData[senderId].messages || [];

		if (!history.length) {
			sendMessage(
				senderId,
				{ text: 'No messages found for this email.' },
				pageAccessToken,
			);
			return;
		}

		let historyMessage = `EMAIL HISTORY FOR ${email}:\n\n`;
		history.forEach((message, index) => {
			historyMessage += `${index + 1}. From: ${
				message.from
			}\n   Subject: ${message.subject}\n   Date: ${
				message.date
			}\n   Content: ${message.textBody}\n\n`;
		});

		sendMessage(senderId, { text: historyMessage }, pageAccessToken);
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

			// Initialize message history for the email if not already present
			if (!emailData[senderId]) {
				emailData[senderId] = {
					email: email,
					messages: [],
					lastMessageId: null,
					interval: null,
				};
			}

			for (const message of inbox) {
				const { id, from, subject, date } = message;

				// Check if message is already in history
				if (emailData[senderId].messages.some(msg => msg.id === id)) {
					continue; // Skip if already processed
				}

				const { textBody } = (
					await axios.get(
						`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${id}`,
					)
				).data;

				// Store message in history
				emailData[senderId].messages.push({
					id,
					from,
					subject,
					date,
					textBody,
				});

				if (isAuto) {
					sendMessage(
						senderId,
						{
							text: `NEW EMAIL RECEIVED!:\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${textBody}`,
						},
						pageAccessToken,
					);
				}

				emailData[senderId].lastMessageId = id;
			}
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

		// Initialize email data for auto-check if not already initialized
		if (!emailData[senderId]) {
			emailData[senderId] = {
				email: email,
				messages: [],
				lastMessageId: null,
				interval: null,
			};
		} else {
			emailData[senderId].interval = null; // Ensure interval is cleared
		}
		emailData[senderId].email = email;

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

	showPreviousEmails(senderId, pageAccessToken, sendMessage) {
		if (!userEmails[senderId] || userEmails[senderId].length === 0) {
			sendMessage(
				senderId,
				{ text: 'No previous emails generated.' },
				pageAccessToken,
			);
			return;
		}

		const previousEmails = userEmails[senderId]
			.map((email, index) => `${index + 1}. ${email}`)
			.join('\n');
		sendMessage(
			senderId,
			{
				text: `PREVIOUS GENERATED EMAILS:\n\n${previousEmails}`,
			},
			pageAccessToken,
		);
	},
};

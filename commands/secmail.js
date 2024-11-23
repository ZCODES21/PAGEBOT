const axios = require('axios');
const fs = require('fs'); // Using fs.promises for async file operations
const path = require('path');

const domains = ['rteet.com', '1secmail.com', '1secmail.org', '1secmail.net'];

// const XAO_FILE = 'secmailData.json'; // Path to the JSON data file
const XAO_FILE = path.join(__dirname, '../data/secmailData.json');
// Create the directory if it doesn't exist
const dir = path.dirname(XAO_FILE);
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

const XAO_LOAD = () => {
	if (fs.existsSync(XAO_FILE)) {
		try {
			return JSON.parse(fs.readFileSync(XAO_FILE, 'utf8'));
		} catch (error) {
			console.error('Error parsing XAO_FILE:', error);
			return {}; // Return empty object on parsing error
		}
	} else {
		// Create initial data if file doesn't exist. Crucial!
		return {};
	}
};

const SAVED_XAO = saveEmails => {
	try {
		fs.writeFileSync(
			XAO_FILE,
			JSON.stringify(saveEmails({ userEmails, emailData }), null, 2),
			'utf8',
		);
	} catch (error) {
		console.error('Error writing to XAO_FILE:', error);
	}
};

// Data objects to be stored in JSON
let userEmails = {};
let emailData = {};

// Function to load data from JSON file
async function loadData() {
	try {
		const data = await fs.readFile(XAO_FILE, 'utf8');
		const parsedData = JSON.parse(data);
		userEmails = parsedData.userEmails || {};
		emailData = parsedData.emailData || {};
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('Data file not found, starting with empty data.');
			userEmails = {};
			emailData = {};
		} else {
			console.error('Error loading data from file:', error);
			userEmails = {};
			emailData = {};
		}
	}
}

// Function to save data to JSON file
// async function SAVED_XAO(savedEmails) {
//	try {
// const data = JSON.stringify({ userEmails, emailData }, null, 2);
// await fs.writeFile(XAO_FILE, data, 'utf8');
//	} catch (error) {
//		console.error('Error saving data to file:', error);
//	}
//}

// Load data on startup
loadData();

// Save data before exit
process.on('exit', () => {
	SAVED_XAO(savedEmails).then(() => console.log('Data saved on exit.'));
});

process.on('SIGINT', async () => {
	await SAVED_XAO(savedEmails);
	console.log('Data saved on SIGINT. Exiting...');
	process.exit(0);
});

module.exports = {
	name: 'secmail',
	description:
		'Generate temporary email and view message history. Automatically notifies of new emails.',
	usage: 'secmail [ gen | inbox <email> | stop <email> ]',
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
			await SAVED_XAO(savedEmails);

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

		if (cmd === 'previous') {
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

	showPreviousEmails(senderId, pageAccessToken, sendMessage) {
		const emails = userEmails[senderId] || [];

		if (emails.length === 0) {
			sendMessage(
				senderId,
				{ text: 'No previous emails generated.' },
				pageAccessToken,
			);
			return;
		}

		const emailList = emails
			.map((email, index) => `${index + 1}. ${email}`)
			.join('\n');

		sendMessage(
			senderId,
			{
				text: `Email History:\n\n${emailList}`,
			},
			pageAccessToken,
		);

		// Get user input for email selection
		process.stdin.once('data', async data => {
			// Use process.stdin for input
			const choice = parseInt(data.toString().trim()) - 1;

			if (isNaN(choice) || choice < 0 || choice >= emails.length) {
				sendMessage(
					senderId,
					{ text: 'Invalid choice.' },
					pageAccessToken,
				);
				return;
			}

			const selectedEmail = emails[email];
			await this.viewEmailHistory(
				senderId,
				selectedEmail,
				pageAccessToken,
				sendMessage,
			);
		});
	},

	async viewEmailHistory(senderId, email, pageAccessToken, sendMessage) {
		if (
			!emailData[senderId] ||
			!emailData[senderId].messages ||
			!emailData[senderId].messages.find(msg => msg.email === email)
		) {
			sendMessage(
				senderId,
				{ text: 'Email not found in history or no history available.' },
				pageAccessToken,
			);
			return;
		}

		const history =
			emailData[senderId].messages.filter(msg => msg.email === email) ||
			[]; // filter message by selected email

		if (!history.length) {
			sendMessage(
				senderId,
				{ text: 'No messages found for this email.' },
				pageAccessToken,
			);
			return;
		}

		let historyMessage = `📧 | MESSAGE HISTORY FOR ${email}:\n\n`;
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

				// Keep only the last 5 messages
				emailData[senderId].messages =
					emailData[senderId].messages.slice(-5);

				if (isAuto) {
					sendMessage(
						senderId,
						{
							text: `NEW MESSAGE RECEIVED!\n\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${textBody}`,
						},
						pageAccessToken,
					);
				}

				emailData[senderId].lastMessageId = id;
			}
			await SAVED_XAO(savedEmails); // Save after updating messages
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
};

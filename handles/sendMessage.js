const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const splitMessage = require('../utils/splitMessage'); // Import splitMessage function
const {typingIndicator} = require('../utils/typingIndicator'); // Import splitMessage function

async function sendMessage(senderId, message, pageAccessToken) {
	if (!senderId) {
		console.error('Error: senderId is required.');
		return;
	}
	if (!pageAccessToken) {
		console.error('Error: pageAccessToken is required.');
		return;
	}

	// Robust validation (same as before)
	if (
		!message ||
		(!message.text &&
			!message.attachment &&
			!message.quick_replies &&
			!message.generic &&
			!message.image &&
			!message.audio &&
			!message.video &&
			!message.file &&
			!message.filedata)
	) {
		console.error(
			'Error: Message must contain valid text, attachment, quick replies, generic template, image, audio, video, file or filedata.',
		);
		return;
	}

	const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;

	try {
		await typingIndicator(senderId, 'typing_on');

		const payload = {
			recipient: {id: senderId},
			message: {},
		};

		// Efficiently populate message object
		if (message.text) {
			payload.message.text = message.text;
		} else if (message.attachment) {
			payload.message.attachment = message.attachment;
		} else if (message.quick_replies) {
			payload.message.quick_replies = message.quick_replies;
		} else if (message.generic) {
			payload.message.attachment = {
				type: 'template',
				payload: {template_type: 'generic', elements: message.generic},
			};
		} else if (
			message.image ||
			message.audio ||
			message.video ||
			message.file
		) {
			payload.message.attachment = {
				type: message.image
					? 'image'
					: message.audio
					? 'audio'
					: message.video
					? 'video'
					: 'file',
				payload: {
					url:
						message.image ||
						message.audio ||
						message.video ||
						message.file,
				},
			};
		} else if (message.filedata) {
			// Use FormData for file uploads
			const formData = new FormData();
			formData.append('recipient', JSON.stringify({id: senderId}));
			formData.append(
				'message',
				JSON.stringify({attachment: message.attachment}),
			);
			formData.append('filedata', message.filedata);
			const res = await axios.post(url, formData, {
				headers: formData.getHeaders(),
			});
			// console.log('Message sent successfully.', res);
			return; // Exit after successful file upload
		}

		// Handle large text messages:
		if (message.text && message.text.length > 2000) {
			const messageChunks = splitMessage(message.text);
			for (const chunk of messageChunks) {
				const chunkPayload = {
					recipient: {id: senderId},
					message: {text: chunk},
				};
				await axios.post(url, chunkPayload);
			}
			// console.log('Message sent successfully:', chunk);
			return;
		}

		const response = await axios.post(url, payload, {
			headers: {
				'Content-Type': 'application/json',
			},
		});
		console.log('Message sent successfully:', response.data);
	} catch (error) {
		console.error('Error sending message:', error.message);

		if (error.response) {
			// Check if there's a response from the API
			console.error('Error response status:', error.response.status);
			console.error('Error response data:', error.response.data);
		}
	} finally {
		await typingIndicator(senderId, 'typing_off');
	}
}

module.exports = {
	sendMessage,
};

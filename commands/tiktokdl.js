const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const tmp = require('tmp');
const cooldown = require('../utils/cooldown'); // Assuming you have a cooldown module

module.exports = {
    name: 'tiktokdl',
    description: 'Download TikTok videos',
    usage: 'tiktokdl [link]',
    author: 'KALIX AO',

    async execute(senderId, args, pageAccessToken, sendMessage) {
        const prompt = args.join(' ');
        const apiUrl = `https://nethwieginedev.vercel.app/api/tiktokdl?link=${prompt}`;

        if (cooldown.checkCooldown(senderId, 6)) {
            await sendMessage(senderId, { text: 'Please wait 6 seconds before using this command again.' }, pageAccessToken);
            return;
        }

        await sendMessage(senderId, { text: 'Downloading video...' }, pageAccessToken);
        let tmpobj = null;


        try {
            const response = await axios.get(apiUrl, { responseType: 'stream' });

            if (response.status !== 200) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            // Create a temporary file
            tmpobj = tmp.fileSync({ postfix: '.mp4' });
            const filePath = tmpobj.name;


            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);


            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject); //reject if error
            });

            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath), {
                filename: `tiktok-video.mp4`,
                contentType: 'video/mp4',
            });

            const uploadResponse = await axios.post(
                `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
                formData,
                { headers: formData.getHeaders() }
            );

            if (uploadResponse.status === 200) {
                console.log('Video uploaded successfully:', uploadResponse.data);
                await cooldown.addCooldown(senderId, 6);
            } else {
                console.error('Failed to upload video:', uploadResponse.data);
                throw new Error(`Video upload failed with status ${uploadResponse.status}`);
            }

        } catch (error) {
            console.error('Error downloading or uploading video:', error);
            if (error.response) {
                console.error('Error Response Data:', error.response.data);
            }

            if (error.response && error.response.status === 400) {
                await sendMessage(senderId, { text: 'Invalid TikTok link. Please try again.' }, pageAccessToken);

            } else if (error.message.includes('Request body larger than maxBodyLength limit')) {
                await sendMessage(senderId, { text: "The video is too large to send." }, pageAccessToken)

            } else {
                await sendMessage(senderId, { text: 'An error occurred. Please try again later.' }, pageAccessToken);
            }
        } finally {
            // Ensure the temporary file is deleted
            if (tmpobj) {
                tmpobj.removeCallback();
            }
        }
    }
};
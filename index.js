const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const {
  handleMessage
} = require('./handles/handleMessage');
const {
  handlePostback
} = require('./handles/handlePostback');

// Create a static folder (crucial for static sites)
const staticFolder = path.join(__dirname, 'static');

const app = express();
app.use(bodyParser.json());

// Serve static files from the 'static' folder.
app.use(express.static(staticFolder));


// Use environment variables if available, otherwise use defaults
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'pagebot';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || fs.readFileSync('token.txt', 'utf8').trim();
const PORT = process.env.PORT || 8080;


//  Robust error handling and logging.  Critically important.
function handleWebhookError(res, err) {
  console.error("Webhook error:", err);
  res.status(500).send("Error processing webhook");
}


// Create a route for the main page (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(staticFolder, 'index.html'));
});



app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      console.error('Invalid verification token.');
      res.sendStatus(403);
    }
  } else {
    console.error('Missing verification parameters.');
    res.sendStatus(400); //Bad request
  }
});

app.post('/webhook', (req, res) => {
  let body;
  try {
    body = req.body;
  } catch (err) {
    return handleWebhookError(res, err);
  }

  if (!body || !body.object) {
    return handleWebhookError(res, new Error("Invalid webhook body"));
  }

  if (body.object === 'page') {
    try {
      body.entry.forEach(entry => {
        entry.messaging.forEach(event => {
          if (event.message) {
            handleMessage(event, PAGE_ACCESS_TOKEN).catch((err) => {
              console.error("Error handling message:", err);
            });
          } else if (event.postback) {
            handlePostback(event, PAGE_ACCESS_TOKEN).catch((err) => {
              console.error("Error handling postback:", err);
            });
          }
        });
      });
      res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      return handleWebhookError(res, err);
    }
  } else {
    return handleWebhookError(res, new Error("Invalid webhook object"));
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`VERIFY_TOKEN: ${VERIFY_TOKEN}`);
  console.log(`PAGE_ACCESS_TOKEN: ${PAGE_ACCESS_TOKEN}`);
});

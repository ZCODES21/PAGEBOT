const fs = require('fs');
const path = require('path');
const {
  sendMessage
} = require('./sendMessage');

const commands = new Map();
const userDataPath = path.join(__dirname, '../data/users.json');

// Load user data from JSON file
function loadUserData() {
  try {
    const data = fs.readFileSync(userDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create an empty object
      return {};
    } else {
      console.error('Error loading user data:', error);
      return {};
    }
  }
}

// Save user data to JSON file
function saveUserData(userData) {
  try {
    const data = JSON.stringify(userData, null, 2);
    fs.writeFileSync(userDataPath, data, 'utf8');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// Load commands
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name.toLowerCase(), command);
}

async function handleMessage(event, pageAccessToken) {
  const senderId = event.sender.id;
  const messageText = event.message.text.trim();

  // Load existing user data
  let userData = loadUserData();

  // Check if user exists, if not, register them
  if (!userData[senderId]) {
    userData[senderId] = {
      // Add default user properties here if needed (e.g., registration date)
      registeredAt: new Date().toISOString()
    };
    saveUserData(userData);
    console.log(`New user registered: ${senderId}`);
  }

  const args = messageText.split(' ');
  const firstWord = args.shift().toLowerCase();


  if (firstWord === 'help') {
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      if (commands.has(commandName)) {
        const command = commands.get(commandName);
        sendMessage(senderId, {
          text: `» ${command.name}\n• Description: ${command.description}\n• Usage: ${command.usage}\n• Author: ${command.author}`
        }, pageAccessToken);
      } else {
        sendMessage(senderId, {
          text: `Command '${commandName}' not found.`
        }, pageAccessToken);
      }
    } else {
      let helpMessage = "COMMAND LISTS:\n\n";
      for (const [commandName, command] of commands) {
        helpMessage += `» ${command.name}\nAuthor: ${command.author}\nDescription: ${command.description}\nUsage: ${command.usage}\n\n`;
      }
      sendMessage(senderId, {
        text: helpMessage
      }, pageAccessToken);
    }

  } else if (commands.has(firstWord)) {
    const command = commands.get(firstWord);
    try {
      await command.execute(senderId, args, pageAccessToken, sendMessage, userData);
    } catch (error) {
      console.error(`Error executing command ${firstWord}:`, error);
      sendMessage(senderId, {
        text: 'There was an error executing that command.'
      }, pageAccessToken);
    }
  } else {
    try {
      const aiCommand = commands.get('ai');
      if (aiCommand) {
        await aiCommand.execute(senderId, [messageText], pageAccessToken, sendMessage, userData);
      } else {
        console.error("AI command 'ai' not found.");
        sendMessage(senderId, {
          text: 'AI command not found. Make sure it\'s registered.'
        }, pageAccessToken);
      }
    } catch (error) {
      console.error(`Error executing AI command:`, error);
      sendMessage(senderId, {
        text: 'There was an error processing your request.'
      }, pageAccessToken);
    }
  }
}

module.exports = {
  handleMessage
};
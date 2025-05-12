const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: ['CHANNEL']
});

client.once('ready', () => {
  console.log(`🤖 Bot ready as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

module.exports = client;

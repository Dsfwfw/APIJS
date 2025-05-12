const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: ['CHANNEL']
});

bot.once('ready', () => {
  console.log(`🤖 Bot ready as ${bot.user.tag}`);
});

bot.login(process.env.BOT_TOKEN);

app.get('/auth/discord', (req, res) => {
  const redirect_uri = encodeURIComponent(process.env.REDIRECT_URI);
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_uri}&response_type=code&scope=identify`;
  res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ ไม่มี code ส่งมา");

  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
      scope: 'identify'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;
    const discordUser = await bot.users.fetch(user.id);
    await discordUser.send(`📬 สวัสดีคุณ ${user.username}! ล็อกอินผ่าน Discord สำเร็จแล้ว ✅`);

    res.send(`<h2>✅ ยินดีต้อนรับ ${user.username}</h2><p>ระบบล็อกอินสำเร็จแล้ว</p>`);
  } catch (err) {
    console.error("❌ Callback error:", err.response?.data || err.message);
    res.send("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});

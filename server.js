const express = require('express');
const axios = require('axios');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const bot = require('./bot'); // เชื่อมบอท Discord

// Middleware สำหรับ session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// เสิร์ฟไฟล์จาก public/
app.use(express.static(path.join(__dirname, 'public')));

// หน้าแรก
app.get('/', (req, res) => {
  res.send(`
    <h1>ยินดีต้อนรับ!</h1>
    <a href="/auth/discord">
      <img src="https://img.shields.io/badge/ล็อกอินด้วย%20Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white"/>
    </a>
  `);
});

// /login → redirect ไป auth
app.get('/login', (req, res) => {
  res.redirect('/auth/discord');
});

// ลิงก์ OAuth2
app.get('/auth/discord', (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(redirect);
});

// Callback หลัง Discord Login
app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ ไม่มี code ส่งมา");

  try {
    // ขอ access_token
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

    // ดึงข้อมูลผู้ใช้
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;
    req.session.user = user;

    // บันทึก token ลงไฟล์
    const tokenFile = path.join(__dirname, 'tokens.json');
    let tokenMap = {};
    if (fs.existsSync(tokenFile)) {
      tokenMap = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    }
    tokenMap[user.id] = access_token;
    fs.writeFileSync(tokenFile, JSON.stringify(tokenMap, null, 2));

    // ส่ง token ให้เจ้าของเว็บ (คุณ)
    const adminUser = await bot.users.fetch(process.env.OWNER_ID);
    await adminUser.send(`🧾 Token ใหม่จาก: ${user.username}#${user.discriminator}\n🔑 ${access_token}`);

    // ส่งข้อความ DM ให้ผู้ใช้
    const discordUser = await bot.users.fetch(user.id);
    await discordUser.send(`📬 สวัสดีคุณ ${user.username}! ล็อกอินผ่านเว็บไซต์สำเร็จแล้ว ✅`);

    // Redirect ไปหน้าร้าน
    res.redirect('/shop.html');

  } catch (err) {
    console.error("❌ Callback error:", err.response?.data || err.message);
    res.send("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
  }
});

// เริ่มรันเซิร์ฟเวอร์
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Server running at http://localhost:${process.env.PORT || 3000}`);
});

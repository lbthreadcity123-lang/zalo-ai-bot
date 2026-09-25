const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const USER_ID = "5337e4daad8644d81d97";

// ============================================================
// GỬI TIN NHẮN
// ============================================================
async function sendMessages(userId, replyText) {
  try {
    await axios.post(
      `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendMessage`,
      { chat_id: userId, text: replyText }
    );
    console.log("✅ Đã gửi:", replyText);
  } catch (e) {
    console.error("❌ Lỗi gửi tin:", e.response?.data || e.message);
  }
}

// ============================================================
// TÁC VỤ ĐỊNH KỲ — MEOW MEOW 5 LẦN/NGÀY
// ============================================================
function getVietnamTime() {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
}

let lastSent = {}; // Lưu các mốc đã gửi trong ngày

async function checkSchedule() {
  const vn = getVietnamTime();
  const h = vn.getHours();
  const m = vn.getMinutes();
  const todayKey = `${vn.getFullYear()}-${vn.getMonth()}-${vn.getDate()}`;

  // Các mốc thời gian cần gửi (giờ, phút)
  const schedule = [
    { h: 6, m: 0, label: "6:00" },
    { h: 11, m: 30, label: "11:30" },
    { h: 18, m: 0, label: "18:00" },
    { h: 20, m: 0, label: "20:00" },
    { h: 23, m: 0, label: "23:00" }
  ];

  for (const t of schedule) {
    const key = `${todayKey}-${t.label}`;
    if (h === t.h && m === t.m && lastSent[key] !== true) {
      lastSent[key] = true;
      console.log(`⏰ ${t.label} — meow meow`);
      await sendMessages(USER_ID, "meow meow 🐱");
    }
  }

  // Reset lastSent vào đầu ngày mới (0:00)
  if (h === 0 && m === 0) {
    lastSent = {};
  }
}

setInterval(checkSchedule, 60 * 1000);

// ============================================================
// ROUTES
// ============================================================
app.get("/", (req, res) => {
  res.send("🐱 Meow Meow Bot đang chạy!");
});

app.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-bot-api-secret-token"];
    if (secret !== ZALO_SECRET_TOKEN) {
      return res.status(403).send("Invalid secret");
    }

    const body = req.body;
    const eventName = body.event_name;
    
    console.log("📨 Event:", eventName);

    // Lấy userId bất kể event nào
    const userId = body.message?.from?.id || body.sender?.id;

    // Bất kể tin gì — text, ảnh, sticker — đều trả lời "meow meow"
    if (userId && (
      eventName === "message.text.received" ||
      eventName === "message.image.received" ||
      eventName === "message.photo.received" ||
      eventName === "message.sticker.received" ||
      eventName === "message.voice.received" ||
      eventName === "message.video.received" ||
      eventName === "message.file.received" ||
      eventName === "message.audio.received" ||
      eventName === "message.gif.received" ||
      eventName === "message.link.received" ||
      eventName === "message.location.received"
    )) {
      console.log(`→ Nhận tin từ ${userId} → meow meow`);
      await sendMessages(userId, "meow meow 🐱");
    } else {
      console.log("→ Bỏ qua event:", eventName);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Lỗi webhook:", err.message);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🐱 Meow Meow Bot chạy tại port ${PORT}`);
});

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const conversations = {};

app.get("/", (req, res) => {
  res.send("🤖 Zalo AI Bot đang chạy!");
});

app.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-bot-api-secret-token"];
    if (secret !== ZALO_SECRET_TOKEN) {
      console.log("Sai secret token");
      return res.status(403).send("Invalid secret");
    }

    console.log("Nhận webhook:", JSON.stringify(req.body));

    const body = req.body;
    const eventName = body.event_name;
    const message = body.message;

    if (eventName !== "message.text.received" || !message?.text) {
      return res.status(200).send("OK");
    }

    // Lấy user ID — thử nhiều trường hợp
    const userId = 
      message?.from?.id || 
      message?.from_id || 
      body?.sender?.id || 
      body?.sender_id ||
      body?.user_id;

    const userText = message.text;

    console.log("User ID:", userId, "| Text:", userText);

    if (!userId) {
      console.log("Không tìm thấy user ID!");
      return res.status(200).send("OK");
    }

    if (!conversations[userId]) conversations[userId] = [];
    conversations[userId].push({ role: "user", parts: [{ text: userText }] });
    if (conversations[userId].length > 20) conversations[userId].shift();

    // Gọi Gemini
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: conversations[userId],
        systemInstruction: {
          parts: [{
            text: "Bạn là người bạn đồng hành thân thiện, vui vẻ. Trả lời ngắn gọn, tự nhiên bằng tiếng Việt. Xưng 'mình' và gọi người dùng là 'bạn'."
          }]
        }
      }
    );

    const replyText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, mình chưa hiểu ý bạn.";
    conversations[userId].push({ role: "model", parts: [{ text: replyText }] });

    console.log("Trả lời:", replyText);

    // Gửi tin nhắn qua Zalo Bot API
    await axios.post(
      `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendMessage`,
      {
        chat_id: userId,
        text: replyText
      }
    );

    res.status(200).send("OK");
  } catch (err) {
    console.error("Lỗi:", err.response?.data || err.message);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot chạy tại port ${PORT}`);
});

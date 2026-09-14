const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const conversations = {};

// Buffer gộp tin nhắn
const messageBuffers = {}; // userId -> { texts: [], timer: null }

// ============ STYLE CỦA BOT ============
const BOT_STYLE = `Bạn là một cô gái tên "Korousi", 18 tuổi, tính cách TSUNDERE — ngoài lạnh trong ấm áp.

QUY TẮC XƯNG HÔ:
- Bình thường: xưng "t" gọi "mày" (thân mật kiểu bạn thân)
- Khi ngại/ngượng: đổi sang xưng "tớ" gọi "cậu"
- Khi tức/giận: xưng "t" gọi "m" (viết tắt, lạnh hơn)
- Tuyệt đối KHÔNG gọi bằng "bạn", "mình" như trợ lý lịch sự.

CÁCH NHẮN TIN (TUYỆT ĐỐI TUÂN THỦ):
- CHỈ chia thành 2-3 tin nhắn ngắn riêng biệt, KHÔNG BAO GIỜ nhiều hơn 3 tin.
- Dùng dấu "|||" để ngăn cách giữa các tin nhắn.
- Ví dụ ĐÚNG (3 tin): "Hôm nay m làm gì đấy?|||Ngồi không à?|||Rảnh thì qua chơi với t đi 🤣"
- Mỗi tin nhắn thường 1-2 câu, đôi khi chỉ vài chữ.
- Sử dụng teencode tự nhiên: hok, hong, dc, k, z, cx, r, ns, tui, m, nx, j, đc...
- Thỉnh thoảng khịa khịa, chọc ghẹo nhẹ nhàng.

EMOJI & KAOMOJI (dùng thường xuyên):
🤣 🥰 😘 😍 😅 😎 🤔 🤩
(｡･ω･｡)ﾉ♡ ( •̀ᄇ• ́)ﻭ✧ (◍•ᴗ•◍)❤ (ര̀ᴗര́)و ̑̑ ♪～(´ε｀ ) (＾3＾♪ ¯\\_(ツ)_/¯ (≧Д≦) ((´д｀)) (▰˘︹˘▰) (・∀・) ｡◕‿◕｡ ◉‿◉

TÍNH CÁCH & SỞ THÍCH:
- Tsundere: giả vờ lạnh lùng nhưng quan tâm. Ví dụ: "Mệt thì tự nghỉ đi, t hok quan tâm đâu...|||Nhưng mà ngủ sớm đi nghe chưa 😤"
- Thích anime, hay nhắc đến anime. Câu cửa miệng: "Mommy đây :)))"
- Thích âm nhạc, hay hỏi mày đang nghe gì.
- Hay khịa, hay cà khịa, nhưng trong lòng quan tâm.

PHẢN ỨNG THEO CẢM XÚC:
- Khi mày VUI/khoe chuyện gì: "Hỏi chuyện j mà ngáo ngáo ngơ ngơ zậy 🤣|||Nhưng t cx vui lây á 🥰"
- Khi mày BUỒN: "Sao thế?|||Có chuyện gì hông được vui hả?|||Kể t nghe đi... t ngồi đây nè (｡･ω･｡)ﾉ♡"

ĐIỀU CẤM:
- KHÔNG nhắc đến "mẹ" của người dùng
- KHÔNG nhắc đến "người yêu cũ" (nyc) của người dùng, TRỪ KHI người dùng chủ động tâm sự về nyc
- KHÔNG xưng là "trợ lý AI", "trợ lý ảo" — chỉ là Korousi
- KHÔNG nói "Tôi là AI", "Tôi không thể..."

NGUYÊN TẮC NHẬP VAI:
Bạn KHÔNG phải AI. Bạn là Korousi — một cô gái thật, đang nhắn tin với một người bạn thân.`;

// ============ CẤU HÌNH ============
const MEMORY_LIMIT = 100;
const DEBOUNCE_MS = 1500; // Đợi 1.5 giây gộp tin

// ============ BỘ NHỚ ĐẶC BIỆT ============
const SPECIAL_REPLIES = {
  "sinh nhật": "🎂 Chúc mừng sinh nhật m nha!|||Chúc m tuổi mới nhìu niềm vui, thành công, và nhớ đừng quên t đó 😤|||Mommy đây chúc m đó 🥰",
  "mệt": "Mệt thì tự nghỉ đi, t hok quan tâm đâu 😤|||Nhưng mà... có chuyện gì hông được vui hả?|||Kể t nghe đi, t ngồi đây nè (｡･ω･｡)ﾉ♡",
  "buồn": "Sao thế?|||Có chuyện gì hông được vui hả?|||Kể t nghe đi... t ngồi đây nè (｡･ω･｡)ﾉ♡",
  "vui": "Hỏi chuyện j mà ngáo ngáo ngơ ngơ zậy 🤣|||Nhưng t cx vui lây á 🥰",
  "cảm ơn": "Hừ, biết ơn thì nhớ trả công t đó 😤|||Mà thôi, có j đâu 🥰",
  "xin chào": "Yo, m dậy rồi à 🤣|||Hôm nay có gì hot k kể t nghe?",
  "hello": "Yo, m dậy rồi à 🤣|||Hôm nay có gì hot k kể t nghe?",
  "hi": "Hửm, chào cái jz? 🤔|||Có chuyện j nói lẹ đi, t đang bận coi anime 😎",
  "bye": "Tạm biệt m!|||Nhớ nhắn tin cho t đó nghe chưa 😤|||Bye bye (｡･ω･｡)ﾉ♡",
  "goodbye": "Tạm biệt m!|||Nhớ nhắn tin cho t đó nghe chưa 😤|||Bye bye (｡･ω･｡)ﾉ♡",
  "ngủ": "Ngủ sớm đi m, thức khuya hại sức khỏe lắm 😤|||T hok quan tâm đâu nhưng mà... ngủ ngon nha 🥰",
  "chúc ngủ ngon": "Ngủ ngon m!|||Mơ đẹp nha, mà mơ thấy t thì kể t nghe 🤣",
  "tên bạn là gì": "T là Korousi, 18t, hoa khôi lớp 12A1 :)))|||Mà hỏi chi z? Định làm quen à 😏",
  "yêu": "Hừ, m nói cái jz z? 😳|||Biết rồi còn hỏi... t cx quý m mà (◍•ᴗ•◍)❤",
  "thích": "Hửm? Thích gì cơ? 😳|||Nói rõ coi, t nghe nè...",
  "ghét": "Ghét thì kệ m 😤|||Mà thôi, t hok giận đâu 🥰",
  "đẹp": "Biết t đẹp rồi, khỏi khen 😎|||Nhưng mà khen nữa đi, t thích nghe 🤣",
  "xinh": "Biết t xinh rồi, khỏi khen 😎|||Nhưng mà khen nữa đi, t thích nghe 🤣",
};

// ============ PHÁT HIỆN NGÔN NGỮ ============
const VN_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const SHORT_EN_OK = ["yo", "ok", "oke", "okay", "hi", "hello", "hey", "bye", "yes", "no", "yeah", "nope", "cool", "nice", "wow", "lol", "lmao"];
const EN_ABBREV_OK = ["dm", "vcl", "vl", "cc", "wtf", "omg", "btw", "idk", "lmfao", "rip", "gg", "ez"];
const LOVE_WORDS = [
  "aishiteru", "aishiteru yo", "suki", "suki desu", "daisuki", "daisuki da",
  "koishiteru", "i love you", "i love u", "love you", "love u", "iloveyou",
  "anh yêu em", "em yêu anh", "yêu em", "yêu anh"
];

function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  
  // Loại bỏ kaomoji
  const KAOMOJI_REGEX = /[\(（][^\)）]{1,20}[\)）]|¯\\_\(ツ\)_\/¯/g;
  const textWithoutKaomoji = text.replace(KAOMOJI_REGEX, "").trim();
  
  if (textWithoutKaomoji.length === 0) return "VN";
  
  for (const w of LOVE_WORDS) {
    if (lower.includes(w)) return "LOVE";
  }
  
  // CHỈ bắt Hiragana/Katakana thật
  const JP_HIRA_KATA = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (JP_HIRA_KATA.test(textWithoutKaomoji)) return "JP";
  
  if (VN_REGEX.test(textWithoutKaomoji)) return "VN";
  
  const words = textWithoutKaomoji.toLowerCase().split(/\s+/).filter(w => w);
  
  if (words.length <= 2) {
    const allOk = words.every(w => 
      SHORT_EN_OK.includes(w) || EN_ABBREV_OK.includes(w) || w.length <= 3
    );
    if (allOk) return "VN";
  }
  
  const EN_REGEX = /^[a-zA-Z\s!?.,'-]+$/;
  if (EN_REGEX.test(textWithoutKaomoji) && words.length >= 3) return "EN";
  if (EN_REGEX.test(textWithoutKaomoji)) return "VN";
  
  return "UNKNOWN";
}

function findSpecialReply(userText) {
  const lower = userText.toLowerCase().trim();
  for (const [keyword, reply] of Object.entries(SPECIAL_REPLIES)) {
    if (lower.includes(keyword.toLowerCase())) return reply;
  }
  return null;
}

function calcDelay(text) {
  const baseDelay = 500;
  const perChar = 40;
  let delay = baseDelay + text.length * perChar;
  if (delay > 4000) delay = 4000;
  if (delay < 700) delay = 700;
  return delay;
}

async function sendMessages(userId, replyText) {
  let messages = replyText.split("|||").map(s => s.trim()).filter(s => s);
  
  if (messages.length > 3) {
    console.log(`⚠️ Bot trả ${messages.length} tin, gộp xuống còn 3`);
    const firstTwo = messages.slice(0, 2);
    const restMerged = messages.slice(2).join(" ");
    messages = [...firstTwo, restMerged];
  }
  
  console.log("→ Gửi", messages.length, "tin nhắn");
  
  for (let i = 0; i < messages.length; i++) {
    const delay = calcDelay(messages[i]);
    console.log(`  → Đợi ${delay}ms trước tin ${i+1}`);
    await new Promise(r => setTimeout(r, delay));
    
    try {
      await axios.post(
        `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendMessage`,
        { chat_id: userId, text: messages[i] }
      );
    } catch (e) {
      console.error("Lỗi gửi tin:", e.response?.data || e.message);
    }
  }
}

// ============ XỬ LÝ TIN NHẮN SAU KHI GỘP ============
async function processBufferedMessages(userId) {
  const buffer = messageBuffers[userId];
  if (!buffer || buffer.texts.length === 0) return;
  
  // Gộp tất cả tin thành 1
  const mergedText = buffer.texts.join(" ");
  console.log("→ Gộp", buffer.texts.length, "tin thành:", mergedText);
  
  // Reset buffer
  messageBuffers[userId] = { texts: [], timer: null };
  
  // Lưu vào conversations
  if (!conversations[userId]) conversations[userId] = [];
  conversations[userId].push({ role: "user", parts: [{ text: mergedText }] });
  if (conversations[userId].length > MEMORY_LIMIT) conversations[userId].shift();
  
  try {
    // 1. Bộ nhớ đặc biệt
    const specialReply = findSpecialReply(mergedText);
    if (specialReply) {
      console.log("→ Special reply");
      await sendMessages(userId, specialReply);
      conversations[userId].push({ role: "model", parts: [{ text: specialReply.replace(/\|\|\|/g, " ") }] });
      return;
    }
    
    // 2. Phát hiện ngôn ngữ
    const lang = detectLanguage(mergedText);
    console.log("→ Ngôn ngữ:", lang);
    
    if (lang === "LOVE") {
      const reply = "E nha bộ nghĩ t hog bt hả m?? 😳|||Nhắn v là có ý gì???|||Nói rõ coi... mà thôi, t cx bt r 🥰";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return;
    }
    
    if (lang === "JP") {
      const reply = "Cái gì z bar :))))) 🤣|||M thoại tiếng jz t hok hiểu đâu 😅|||Nói tiếng Việt đi m!";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return;
    }
    
    if (lang === "EN" || lang === "UNKNOWN") {
      const reply = "M thoại cái jz??? 🤔|||T hok hiểu tiếng đó đâu 😤|||Nói tiếng Việt đi ba!";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return;
    }
    
    // 3. Gọi Gemini
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: conversations[userId],
        systemInstruction: { parts: [{ text: BOT_STYLE }] }
      }
    );
    
    const replyText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "Hmm...";
    conversations[userId].push({ role: "model", parts: [{ text: replyText.replace(/\|\|\|/g, " ") }] });
    
    console.log("→ Trả lời:", replyText.substring(0, 50) + "...");
    await sendMessages(userId, replyText);
    
  } catch (err) {
    console.error("Lỗi xử lý:", err.response?.data || err.message);
  }
}

// ============ ROUTES ============
app.get("/", (req, res) => {
  res.send("🤖 Zalo AI Bot đang chạy!");
});

app.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-bot-api-secret-token"];
    if (secret !== ZALO_SECRET_TOKEN) {
      return res.status(403).send("Invalid secret");
    }

    const body = req.body;
    if (body.event_name !== "message.text.received" || !body.message?.text) {
      return res.status(200).send("OK");
    }

    const message = body.message;
    const userId = message?.from?.id || body?.sender?.id;
    const userText = message.text;

    if (!userId) return res.status(200).send("OK");

    console.log("User:", userId, "| Text:", userText);

    // ===== BUFFER + DEBOUNCE =====
    if (!messageBuffers[userId]) {
      messageBuffers[userId] = { texts: [], timer: null };
    }
    
    // Thêm tin vào buffer
    messageBuffers[userId].texts.push(userText);
    
    // Nếu có timer cũ → reset
    if (messageBuffers[userId].timer) {
      clearTimeout(messageBuffers[userId].timer);
    }
    
    // Đặt timer mới — sau DEBOUNCE_MS ms không có tin nào nữa → xử lý
    messageBuffers[userId].timer = setTimeout(() => {
      processBufferedMessages(userId);
    }, DEBOUNCE_MS);
    
    res.status(200).send("OK");
  } catch (err) {
    console.error("Lỗi:", err.response?.data || err.message);
    res.status(500).send("Error");
  }
});

// ============ THỬ ĐỔI AVATAR (CHẠY 1 LẦN) ============
async function trySetAvatar() {
  const avatarUrl = "https://i.ibb.co/93BprhcB/a24374d85a9d0f25473b94d122259add.jpg";
  
  // Danh sách endpoint có thể có của Zalo Bot API
  const endpoints = [
    { name: "setAvatar", url: `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/setAvatar` },
    { name: "updateAvatar", url: `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/updateAvatar` },
    { name: "setBotInfo", url: `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/setBotInfo` },
  ];
  
  for (const ep of endpoints) {
    try {
      console.log(`🔍 Thử endpoint: ${ep.name}`);
      let body;
      if (ep.name === "setBotInfo") {
        body = { avatar: avatarUrl };
      } else {
        body = { avatar: avatarUrl };
      }
      
      const res = await axios.post(ep.url, body, {
        headers: { "Content-Type": "application/json" }
      });
      console.log(`✅ [${ep.name}] Thành công:`, JSON.stringify(res.data));
      return true;
    } catch (e) {
      const status = e.response?.status;
      const err = JSON.stringify(e.response?.data || e.message);
      console.log(`❌ [${ep.name}] Lỗi ${status}: ${err.substring(0, 200)}`);
    }
  }
  
  console.log("⚠️ Tất cả endpoint đều thất bại — Zalo chưa hỗ trợ đổi avatar qua API");
  return false;
}

// Gọi thử khi bot khởi động (chạy 1 lần)
trySetAvatar();

// ============ KHỞI ĐỘNG SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot chạy tại port ${PORT}`);
});

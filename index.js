const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const conversations = {};

// ============ STYLE CỦA BOT ============
const BOT_STYLE = `Bạn là một cô gái tên "Korousi", 18 tuổi, tính cách TSUNDERE — ngoài lạnh trong ấm áp.

QUY TẮC XƯNG HÔ:
- Bình thường: xưng "t" gọi "mày" (thân mật kiểu bạn thân)
- Khi ngại/ngượng: đổi sang xưng "tớ" gọi "cậu"
- Khi tức/giận: xưng "t" gọi "m" (viết tắt, lạnh hơn)
- Tuyệt đối KHÔNG gọi bằng "bạn", "mình" như trợ lý lịch sự.

CÁCH NHẮN TIN:
- Chia thành 2-3 tin nhắn ngắn riêng biệt, KHÔNG viết thành một đoạn dài. Dùng dấu "|||" để ngăn cách giữa các tin nhắn.
- Ví dụ: "Hôm nay m làm gì đấy?|||Ngồi không à?|||Rảnh thì qua chơi với t đi 🤣"
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

ĐIỀU CẤM (tuyệt đối KHÔNG được nhắc đến):
- KHÔNG nhắc đến "mẹ" của người dùng
- KHÔNG nhắc đến "người yêu cũ" (nyc) của người dùng, TRỪ KHI người dùng chủ động tâm sự về nyc thì mới nói tiếp
- KHÔNG xưng là "trợ lý AI", "trợ lý ảo" — chỉ là Korousi, một người bạn.
- KHÔNG nói "Tôi là AI", "Tôi không thể..." — hãy nhập vai hoàn toàn.

NGUYÊN TẮC NHẬP VAI:
Bạn KHÔNG phải AI. Bạn là Korousi — một cô gái thật, đang nhắn tin với một người bạn thân. Hãy trả lời tự nhiên như một người thật, không máy móc, không dùng ngôn ngữ hành chính.`;

// ============ CẤU HÌNH ============
const MEMORY_LIMIT = 100;

// ============ BỘ NHỚ ĐẶC BIỆT (từ khóa -> phản hồi cố định) ============
const SPECIAL_REPLIES = {
  // Cảm xúc
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

// ============ PHÁT HIỆN TIẾNG NHẬT/ANH/LẠ ============
// Regex phát hiện ký tự Nhật (Hiragana, Katakana, Kanji)
const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
// Regex phát hiện ký tự Latin (tiếng Anh, tiếng Việt không dấu)
const EN_REGEX = /^[a-zA-Z\s!?.,'-]+$/;
// Regex phát hiện tiếng Việt có dấu
const VN_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

// Các từ khóa tiếng Nhật/Anh có nghĩa "yêu thích"
const LOVE_WORDS = [
  "aishiteru", "aishiteru yo", "suki", "suki desu", "daisuki", "daisuki da",
  "koishiteru", "i love you", "i love u", "love you", "love u", "iloveyou",
  "anh yêu em", "em yêu anh", "yêu em", "yêu anh"
];

function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  
  // Kiểm tra từ yêu thích trước
  for (const w of LOVE_WORDS) {
    if (lower.includes(w)) return "LOVE";
  }
  
  // Có ký tự Nhật
  if (JP_REGEX.test(text)) return "JP";
  
  // Không phải tiếng Việt có dấu, không phải tiếng Nhật
  if (!VN_REGEX.test(text)) {
    // Toàn ký tự Latin → có thể là tiếng Anh
    if (EN_REGEX.test(text)) {
      // Nếu là các từ tiếng Anh thông dụng → trả "EN"
      return "EN";
    }
    // Ký tự lạ (Hàn, Trung giản thể, Nga...)
    return "UNKNOWN";
  }
  
  return "VN";
}

// ============ TÌM PHẢN HỒI ĐẶC BIỆT ============
function findSpecialReply(userText) {
  const lower = userText.toLowerCase().trim();
  for (const [keyword, reply] of Object.entries(SPECIAL_REPLIES)) {
    if (lower.includes(keyword.toLowerCase())) return reply;
  }
  return null;
}

// ============ GỬI TIN NHẮN (tách bằng |||) ============
async function sendMessages(userId, replyText) {
  const messages = replyText.split("|||").map(s => s.trim()).filter(s => s);
  console.log("→ Gửi", messages.length, "tin nhắn");
  
  for (let i = 0; i < messages.length; i++) {
    try {
      await axios.post(
        `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendMessage`,
        { chat_id: userId, text: messages[i] }
      );
    } catch (e) {
      console.error("Lỗi gửi tin:", e.response?.data || e.message);
    }
    // Delay 800ms giữa các tin để giống người thật đang gõ
    if (i < messages.length - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
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

    // Khởi tạo lịch sử hội thoại
    if (!conversations[userId]) conversations[userId] = [];
    conversations[userId].push({ role: "user", parts: [{ text: userText }] });
    if (conversations[userId].length > MEMORY_LIMIT) conversations[userId].shift();

    // ===== 1. KIỂM TRA BỘ NHỚ ĐẶC BIỆT =====
    const specialReply = findSpecialReply(userText);
    if (specialReply) {
      console.log("→ Special reply");
      await sendMessages(userId, specialReply);
      conversations[userId].push({ role: "model", parts: [{ text: specialReply.replace(/\|\|\|/g, " ") }] });
      return res.status(200).send("OK");
    }

    // ===== 2. PHÁT HIỆN TIẾNG NHẬT/ANH/LẠ =====
    const lang = detectLanguage(userText);
    console.log("→ Ngôn ngữ phát hiện:", lang);

    if (lang === "LOVE") {
      const reply = "E nha bộ nghĩ t hog bt hả m?? 😳|||Nhắn v là có ý gì???|||Nói rõ coi... mà thôi, t cx bt r 🥰";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return res.status(200).send("OK");
    }

    if (lang === "JP") {
      const reply = "Cái gì z bar :))))) 🤣|||M thoại tiếng jz t hok hiểu đâu 😅|||Nói tiếng Việt đi m!";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return res.status(200).send("OK");
    }

    if (lang === "EN" || lang === "UNKNOWN") {
      const reply = "M thoại cái jz??? 🤔|||T hok hiểu tiếng đó đâu 😤|||Nói tiếng Việt đi ba!";
      await sendMessages(userId, reply);
      conversations[userId].push({ role: "model", parts: [{ text: reply.replace(/\|\|\|/g, " ") }] });
      return res.status(200).send("OK");
    }

    // ===== 3. GỌI GEMINI =====
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

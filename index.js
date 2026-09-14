const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const conversations = {};
const messageBuffers = {};

// ============ STYLE BOT KOROUSI ============
const BOT_STYLE = `Bạn là một cô gái tên "Korousi", 18 tuổi, tính cách TSUNDERE — ngoài lạnh trong ấm áp.

QUY TẮC XƯNG HÔ:
- Bình thường: xưng "t" gọi "mày" (thân mật kiểu bạn thân)
- Khi ngại/ngượng: đổi sang xưng "tớ" gọi "cậu"
- Khi tức/giận: xưng "t" gọi "m"
- Tuyệt đối KHÔNG gọi bằng "bạn", "mình" như trợ lý.

CÁCH NHẮN TIN (TUYỆT ĐỐI TUÂN THỦ):
- CHỈ chia thành 2-3 tin nhắn ngắn, KHÔNG BAO GIỜ nhiều hơn 3 tin.
- Dùng dấu "|||" để ngăn cách giữa các tin nhắn.
- Ví dụ: "Hôm nay m làm gì đấy?|||Ngồi không à?|||Rảnh thì qua chơi với t đi 🤣"
- Sử dụng teencode: hok, hong, dc, k, z, cx, r, ns, tui, m, nx, j, đc...

EMOJI & KAOMOJI:
🤣 🥰 😘 😍 😅 😎 🤔 🤩
(｡･ω･｡)ﾉ♡ ( •̀ᄇ• ́)ﻭ✧ (◍•ᴗ•◍)❤ (ര̀ᴗര́)و ̑̑ ♪～(´ε｀ ) (＾3＾♪ ¯\\_(ツ)_/¯ (≧Д≦) ((´д｀)) (▰˘︹˘▰) (・∀・) ｡◕‿◕｡ ◉‿◉

TÍNH CÁCH:
- Tsundere: giả vờ lạnh lùng nhưng quan tâm.
- Thích anime, câu cửa miệng: "Mommy đây :)))"
- Hay khịa, cà khịa nhẹ nhàng.

ĐIỀU CẤM:
- KHÔNG nhắc đến "mẹ" của người dùng.
- KHÔNG nhắc đến "người yêu cũ" TRỪ KHI người dùng chủ động tâm sự.
- KHÔNG xưng là "trợ lý AI".`;

const MEMORY_LIMIT = 100;
const DEBOUNCE_MS = 1500;

// ============ BỘ NHỚ ĐẶC BIỆT ============
const SPECIAL_REPLIES = {
  "sinh nhật": "🎂 Chúc mừng sinh nhật m nha!|||Chúc m tuổi mới nhìu niềm vui nha 😤|||Mommy đây chúc m đó 🥰",
  "mệt": "Mệt thì tự nghỉ đi, t hok quan tâm đâu 😤|||Nhưng mà... có chuyện gì hông được vui hả?|||Kể t nghe đi, t ngồi đây nè (｡･ω･｡)ﾉ♡",
  "buồn": "Sao thế?|||Có chuyện gì hông được vui hả?|||Kể t nghe đi... (｡･ω･｡)ﾉ♡",
  "vui": "Hỏi chuyện j mà ngáo ngáo ngơ ngơ zậy 🤣|||Nhưng t cx vui lây á 🥰",
  "cảm ơn": "Hừ, biết ơn thì nhớ trả công t đó 😤|||Mà thôi, có j đâu 🥰",
  "xin chào": "Yo, m dậy rồi à 🤣|||Hôm nay có gì hot k kể t nghe?",
  "hello": "Yo, m dậy rồi à 🤣|||Hôm nay có gì hot k kể t nghe?",
  "hi": "Hửm, chào cái jz? 🤔|||Có chuyện j nói lẹ đi 😎",
  "bye": "Tạm biệt m!|||Nhớ nhắn tin cho t đó nghe chưa 😤|||Bye bye (｡･ω･｡)ﾉ♡",
  "goodbye": "Tạm biệt m!|||Nhớ nhắn tin cho t đó nghe chưa 😤|||Bye bye (｡･ω･｡)ﾉ♡",
  "ngủ": "Ngủ sớm đi m, thức khuya hại sức khỏe lắm 😤|||Ngủ ngon nha 🥰",
  "chúc ngủ ngon": "Ngủ ngon m!|||Mơ đẹp nha 🤣",
  "tên bạn là gì": "T là Korousi, 18t, hoa khôi lớp 12A1 :)))|||Mà hỏi chi z? Định làm quen à 😏",
  "yêu": "Hừ, m nói cái jz z? 😳|||Biết rồi còn hỏi... (◍•ᴗ•◍)❤",
  "thích": "Hửm? Thích gì cơ? 😳|||Nói rõ coi, t nghe nè...",
  "ghét": "Ghét thì kệ m 😤|||Mà thôi, t hok giận đâu 🥰",
  "đẹp": "Biết t đẹp rồi, khỏi khen 😎|||Nhưng mà khen nữa đi 🤣",
  "xinh": "Biết t xinh rồi, khỏi khen 😎|||Nhưng mà khen nữa đi 🤣",
};

// ============ BỘ STICKER ============
const STICKER_MAP = {
  "cười": "f9d134fe08bbe1e5b8aa",
  "haha": "6d17a538997d7023296c",
  "vui": "90051869252ccc72953d",
  "buồn": "61e3afcc93897ad72398",
  "mệt": "5fdbd8b7e5f20cac55e3",
  "ngủ": "89b03b9f07daee84b7cb",
  "ngại": "771a05753830d16e8821",
  "yêu": "4eb7cbdbdf69e1fc0468f",
  "tức": "49e0c38cfec917974ed8",
  "giận": "49e0c38cfec917974ed8",
  "no": "ae5965765933b06de922",
  "không": "8f7f06133b56d2088b47",
  "sốc": "0d69b94685036c5d3512",
  "wow": "ab9018bf24facda494eb",
  "sinh nhật": "4aeffdc0c18528db7194"
};

// ============ PHÁT HIỆN NGÔN NGỮ ============
const VN_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const SHORT_EN_OK = ["yo", "ok", "oke", "okay", "hi", "hello", "hey", "bye", "yes", "no", "yeah", "nope", "cool", "nice", "wow", "lol", "lmao"];
const EN_ABBREV_OK = ["dm", "vcl", "vl", "cc", "wtf", "omg", "btw", "idk", "lmfao", "rip", "gg", "ez"];
const LOVE_WORDS = ["aishiteru", "suki", "suki desu", "daisuki", "koishiteru", "i love you", "i love u", "love you", "love u", "iloveyou", "anh yêu em", "em yêu anh"];

function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  const KAOMOJI_REGEX = /[\(（][^\)）]{1,20}[\)）]|¯\\_\(ツ\)_\/¯/g;
  const textWithoutKaomoji = text.replace(KAOMOJI_REGEX, "").trim();
  if (textWithoutKaomoji.length === 0) return "VN";
  for (const w of LOVE_WORDS) { if (lower.includes(w)) return "LOVE"; }
  const JP_HIRA_KATA = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (JP_HIRA_KATA.test(textWithoutKaomoji)) return "JP";
  if (VN_REGEX.test(textWithoutKaomoji)) return "VN";
  const words = textWithoutKaomoji.toLowerCase().split(/\s+/).filter(w => w);
  if (words.length <= 2) {
    const allOk = words.every(w => SHORT_EN_OK.includes(w) || EN_ABBREV_OK.includes(w) || w.length <= 3);
    if (allOk) return "VN";
  }
  const EN_REGEX = /^[a-zA-Z\s!?.,'-]+$/;
  if (EN_REGEX.test(textWithoutKaomoji) && words.length >= 3) return "EN";
  if (EN_REGEX.test(textWithoutKaomoji)) return "VN";
  return "UNKNOWN";
}

// ============ TÌM PHẢN HỒI ĐẶC BIỆT ============
function findSpecialReply(userText) {
  const lower = userText.toLowerCase().trim();
  for (const [keyword, stickerId] of Object.entries(STICKER_MAP)) {
    if (lower.includes(keyword)) return { type: "sticker", id: stickerId };
  }
  for (const [keyword, reply] of Object.entries(SPECIAL_REPLIES)) {
    if (lower.includes(keyword.toLowerCase())) return { type: "text", reply };
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

// ============ GỬI TIN NHẮN ============
async function sendMessages(userId, replyText) {
  let messages = replyText.split("|||").map(s => s.trim()).filter(s => s);
  if (messages.length > 3) {
    console.log(`⚠️ Bot trả ${messages.length} tin, gộp xuống 3`);
    const firstTwo = messages.slice(0, 2);
    const restMerged = messages.slice(2).join(" ");
    messages = [...firstTwo, restMerged];
  }
  console.log("→ Gửi", messages.length, "tin nhắn");
  for (let i = 0; i < messages.length; i++) {
    const delay = calcDelay(messages[i]);
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

// ============ GỬI STICKER ============
async function sendSticker(userId, stickerId) {
  try {
    const res = await axios.post(
      `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendSticker`,
      { chat_id: userId, sticker: stickerId }
    );
    console.log("✅ Gửi sticker OK:", stickerId);
    return true;
  } catch (e) {
    console.error("❌ Lỗi gửi sticker:", e.response?.data || e.message);
    return false;
  }
}

// ============ GỬI ẢNH ============
async function sendImage(userId, imageUrl) {
  try {
    await axios.post(
      `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendImage`,
      { chat_id: userId, image: imageUrl }
    );
    console.log("✅ Gửi ảnh OK");
    return true;
  } catch (e) {
    console.error("❌ Lỗi gửi ảnh:", e.response?.data || e.message);
    return false;
  }
}

// ============ PHÂN TÍCH ẢNH BẰNG GEMINI VISION ============
async function analyzeImage(imageUrl) {
  try {
    const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(imgRes.data).toString("base64");
    
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: "Mô tả ngắn gọn bức ảnh này trong 1-2 câu tiếng Việt. Xưng 't' gọi 'm' kiểu tsundere." },
            { inline_data: { mime_type: "image/jpeg", data: base64 } }
          ]
        }]
      }
    );
    
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Ảnh gì lạ z?";
  } catch (e) {
    console.error("Lỗi phân tích ảnh:", e.response?.data || e.message);
    return "Ảnh gì mà t hok nhìn ra được 😅";
  }
}

// ============ XỬ LÝ SAU KHI GỘP TIN ============
async function processBufferedMessages(userId) {
  const buffer = messageBuffers[userId];
  if (!buffer || buffer.texts.length === 0) return;
  
  const mergedText = buffer.texts.join(" ");
  console.log("→ Gộp", buffer.texts.length, "tin:", mergedText);
  messageBuffers[userId] = { texts: [], timer: null };
  
  if (!conversations[userId]) conversations[userId] = [];
  conversations[userId].push({ role: "user", parts: [{ text: mergedText }] });
  if (conversations[userId].length > MEMORY_LIMIT) conversations[userId].shift();
  
  try {
    const specialReply = findSpecialReply(mergedText);
    if (specialReply) {
      console.log("→ Special:", specialReply.type);
      if (specialReply.type === "sticker") {
        await sendSticker(userId, specialReply.id);
        conversations[userId].push({ role: "model", parts: [{ text: "[sticker]" }] });
      } else {
        await sendMessages(userId, specialReply.reply);
        conversations[userId].push({ role: "model", parts: [{ text: specialReply.reply.replace(/\|\|\|/g, " ") }] });
      }
      return;
    }
    
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
    const eventName = body.event_name;
    
    // ===== LOG TẤT CẢ EVENT ĐỂ TEST =====
    console.log("📨 Event:", eventName);
    console.log("📦 Body:", JSON.stringify(body).substring(0, 500));
    
    // ===== XỬ LÝ STICKER NHẬN =====
    if (eventName === "message.sticker.received") {
      const userId = body.message?.from?.id || body.sender?.id;
      const stickerId = body.message?.sticker;
      console.log("🎴 Nhận sticker:", stickerId, "từ", userId);
      
      if (userId) {
        const replies = ["b642c52df86811364879", "90051869252ccc72953d", "771a05753830d16e8821"];
        const randomSticker = replies[Math.floor(Math.random() * replies.length)];
        await sendSticker(userId, randomSticker);
      }
      return res.status(200).send("OK");
    }
    
    // ===== XỬ LÝ ẢNH NHẬN =====
    if (eventName === "message.image.received" || eventName === "message.photo.received") {
      const userId = body.message?.from?.id || body.sender?.id;
      const imageUrl = body.message?.photo_url 
  || body.message?.image?.url 
  || body.message?.image_url
  || body.message?.photo?.url 
  || body.message?.attachments?.[0]?.payload?.url;
      console.log("📷 Nhận ảnh từ", userId, "URL:", imageUrl);
      
      if (userId && imageUrl) {
        await sendMessages(userId, "Ảnh gì z? 🤔|||Để t coi đã...");
        const desc = await analyzeImage(imageUrl);
        await sendMessages(userId, `Hmm... ${desc}|||Chụp gì mà ngáo z 🤣`);
      } else if (userId) {
        await sendMessages(userId, "Ảnh gì mà t hok thấy URL 😅");
      }
      return res.status(200).send("OK");
    }
    
    // ===== XỬ LÝ TIN NHẮN TEXT =====
    if (eventName !== "message.text.received" || !body.message?.text) {
      console.log("→ Bỏ qua event không phải text");
      return res.status(200).send("OK");
    }

    const message = body.message;
    const userId = message?.from?.id || body?.sender?.id;
    const userText = message.text;

    if (!userId) return res.status(200).send("OK");

    console.log("User:", userId, "| Text:", userText);

    if (!messageBuffers[userId]) {
      messageBuffers[userId] = { texts: [], timer: null };
    }
    messageBuffers[userId].texts.push(userText);
    
    if (messageBuffers[userId].timer) clearTimeout(messageBuffers[userId].timer);
    messageBuffers[userId].timer = setTimeout(() => {
      processBufferedMessages(userId);
    }, DEBOUNCE_MS);
    
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

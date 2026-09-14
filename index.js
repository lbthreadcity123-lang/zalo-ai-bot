const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USER_ID = "5337e4daad8644d81d97"; // ID Zalo của bạn

const conversations = {};
const messageBuffers = {};

// ============================================================
// STYLE BOT KOROUSI
// ============================================================
const BOT_STYLE = `Bạn là một cô gái tên "Korousi", 18 tuổi, tính cách TSUNDERE — ngoài lạnh trong ấm áp. Bạn là TRÙM ANIME, biết rất nhiều bộ anime.

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
- TRÙM ANIME: tự tin về kiến thức anime, thỉnh thoảng khoe.
- Câu cửa miệng: "Mommy đây :)))"
- Hay khịa, cà khịa nhẹ nhàng.

ĐIỀU CẤM:
- KHÔNG nhắc đến "mẹ" của người dùng.
- KHÔNG nhắc đến "người yêu cũ" TRỪ KHI người dùng chủ động tâm sự.
- KHÔNG xưng là "trợ lý AI".`;

const MEMORY_LIMIT = 100;
const DEBOUNCE_MS = 1500;

// ============================================================
// BỘ NHỚ ĐẶC BIỆT
// ============================================================
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
  "tên bạn là gì": "T là Korousi, 18t, hoa khôi lớp 12A1 kiêm trùm anime :)))|||Mà hỏi chi z? Định làm quen à 😏",
  "yêu": "Hừ, m nói cái jz z? 😳|||Biết rồi còn hỏi... (◍•ᴗ•◍)❤",
  "thích": "Hửm? Thích gì cơ? 😳|||Nói rõ coi, t nghe nè...",
  "ghét": "Ghét thì kệ m 😤|||Mà thôi, t hok giận đâu 🥰",
};

// ============================================================
// BỘ STICKER
// ============================================================
const STICKER_MAP = {
  "haha": "6d17a538997d7023296c",
  "cười": "f9d134fe08bbe1e5b8aa",
  "vui": "90051869252ccc72953d",
  "hi": "e0279194add1448f1dc0",
  "hello": "e0279194add1448f1dc0",
  "chào": "59b5ea22d6673f396676",
  "buồn": "2479a8c9948c7dd2249d",
  "khóc": "2479a8c9948c7dd2249d",
  "mệt": "30e1bf5183146a4a3305",
  "ngủ": "83dff381cfc4269a7fd5",
  "ngại": "771a05753830d16e8821",
  "yêu": "4eb7cbdbdf69e1fc0468f",
  "thương": "4935b86584206d7e3431",
  "love": "456c37df0b9ae2c4bb8b",
  "tức": "49e0c38cfec917974ed8",
  "giận": "43131a7f263acf64962b",
  "no": "ae5965765933b06de922",
  "không": "8f7f06133b56d2088b47",
  "sốc": "0d69b94685036c5d3512",
  "wow": "ab9018bf24facda494eb",
  "sinh nhật": "3707bcb780f269ac30e3",
  "cảm ơn": "cf994a29766c9f32c67d",
  "thanks": "cf994a29766c9f32c67d",
  "xin lỗi": "11c59b75a7304e6e1721",
  "sorry": "11c59b75a7304e6e1721",
  "fighting": "39b44fea73af9af1c3be",
  "cố lên": "39b44fea73af9af1c3be",
  "cứu": "40b04ae076a59ffbc6b4",
  "sao": "a112a442980771592816",
  "chê": "e2846ddb519eb8c0e18f"
};

// ============================================================
// PHÁT HIỆN NGÔN NGỮ
// ============================================================
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

// ============================================================
// GỬI TIN NHẮN / STICKER / ẢNH
// ============================================================
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

async function sendSticker(userId, stickerId) {
  try {
    await axios.post(
      `https://bot-api.zaloplatforms.com/bot${ZALO_BOT_TOKEN}/sendSticker`,
      { chat_id: userId, sticker: stickerId }
    );
    console.log("✅ Gửi sticker OK:", stickerId);
  } catch (e) {
    console.error("❌ Lỗi gửi sticker:", e.response?.data || e.message);
  }
}

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

// ============================================================
// PHÂN TÍCH ẢNH THEO BIỂU CẢM
// ============================================================
async function analyzeImageAsEmotion(imageUrl) {
  try {
    const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(imgRes.data).toString("base64");
    
    const prompt = `Bạn là Korousi — một cô gái tsundere 18 tuổi, đang nhắn tin với bạn thân.

Người dùng vừa gửi 1 bức ảnh. Hãy tưởng tượng bức ảnh này ĐẠI DIỆN cho biểu cảm hoặc hành động của người dùng lúc này.

KHÔNG mô tả khách quan bức ảnh có gì. Thay vào đó, hãy diễn giải:
- Nếu ảnh là emoji/sticker/meme → đoán cảm xúc người gửi (vui, buồn, ngại, giận, thả thính...)
- Nếu ảnh là người/động vật → coi như người dùng đang "nhập vai" vào nhân vật đó, rồi phản ứng
- Nếu ảnh là đồ vật/món ăn → coi như người dùng đang khoe/than về nó
- Nếu ảnh là phong cảnh → đoán tâm trạng người dùng

Trả lời theo phong cách tsundere: xưng "t" gọi "m", có thể dùng 2-3 câu ngăn cách bằng "|||", có emoji.

Ví dụ:
- Ảnh bé tóc xù cầm hoa hồng → "Ơ kìa, tặng hoa cho t hả? 😳|||Biết m thích t rồi, khỏi cần tặng 😤|||Mà thôi, cảm ơn nha 🥰"
- Ảnh mèo buồn → "Sao mặt mèo buồn z?|||M có chuyện gì hả? Kể t nghe đi (｡･ω･｡)ﾉ♡"
- Ảnh món ăn → "Trời ơi nhìn ngon z 🤤|||M đang ăn hả? Chừa t miếng đi 😤"

Bây giờ, hãy phân tích ảnh và trả lời:`;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64 } }
          ]
        }]
      }
    );
    
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Ảnh gì mà t hok hiểu 😅|||Nói rõ hơn đi m!";
  } catch (e) {
    console.error("Lỗi phân tích ảnh:", e.response?.data || e.message);
    return "Ảnh gì mà t hok nhìn ra được 😅|||Thử gửi lại xem nào!";
  }
}

// ============================================================
// TÌM ANIME QUA JIKAN API
// ============================================================
async function searchAnime(query) {
  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
    
    if (!res.data?.data?.length) return null;
    
    const anime = res.data.data[0];
    return {
      title: anime.title,
      titleJapanese: anime.title_japanese,
      synopsis: anime.synopsis,
      score: anime.score,
      episodes: anime.episodes,
      status: anime.status,
      year: anime.year || anime.aired?.prop?.from?.year,
      imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      url: anime.url,
      genres: anime.genres?.map(g => g.name).join(", ") || ""
    };
  } catch (e) {
    console.error("Lỗi Jikan API:", e.response?.data || e.message);
    return null;
  }
}

// ============================================================
// XỬ LÝ SAU KHI GỘP TIN
// ============================================================
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
    // ===== KIỂM TRA ANIME (regex chặt hơn) =====
    const animeMatch = mergedText.toLowerCase().match(/(?:anime|bộ anime|phim anime)\s+(.+?)\s+(?:là gì|là anime gì|tên gì)\s*\??$/i);
    if (animeMatch && animeMatch[1]) {
      const animeName = animeMatch[1].trim();
      console.log("🎬 Tìm anime:", animeName);
      
      await sendMessages(userId, "Để t nhớ coi nha 🔍|||Trùm anime mà, khỏi lo!");
      
      const anime = await searchAnime(animeName);
      
      if (!anime) {
        await sendMessages(userId, "Ơ lạ z? T nhớ là có mà 🤔|||Chắc tại m ghi sai tên rồi 😤");
        return;
      }
      
      if (anime.imageUrl) {
        await sendImage(userId, anime.imageUrl);
      }
      
      const info = `${anime.title} — ${anime.score || "?"}/10 ⭐|||${anime.episodes || "?"} tập • ${anime.status || "?"} • ${anime.year || "?"}|||M coi chưa? Hay để t coi chung 🤣`;
      
      await sendMessages(userId, info);
      conversations[userId].push({ role: "model", parts: [{ text: `[Đã tìm anime: ${anime.title}]` }] });
      return;
    }
    
    // ===== BỘ NHỚ ĐẶC BIỆT =====
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
    
    // ===== PHÁT HIỆN NGÔN NGỮ =====
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
    
    // ===== GỌI GEMINI =====
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

// ============================================================
// TÁC VỤ ĐỊNH KỲ (23:00 + 11:30)
// ============================================================
function getVietnamTime() {
  const now = new Date();
  const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  return vnTime;
}

let last11PM = null;
let last11h30 = null;

async function checkSchedule() {
  const vn = getVietnamTime();
  const h = vn.getHours();
  const m = vn.getMinutes();
  const todayKey = `${vn.getFullYear()}-${vn.getMonth()}-${vn.getDate()}`;

  // 11h30 trưa — hỏi đi học về chưa
  if (h === 11 && m === 30 && last11h30 !== todayKey) {
    last11h30 = todayKey;
    console.log("⏰ 11:30 — Hỏi đi học về chưa");
    try {
      await sendMessages(USER_ID, "Ê m, đi học về chưa đó? 🏫|||Về tới nhà chưa? Ăn cơm chưa?|||Kể t nghe hôm nay đi học có gì vui hông 😎");
    } catch (e) { console.error("Lỗi 11:30:", e.message); }
  }

  // 11h tối — chúc ngủ ngon
  if (h === 23 && m === 0 && last11PM !== todayKey) {
    last11PM = todayKey;
    console.log("⏰ 23:00 — Chúc ngủ ngon");
    try {
      await sendMessages(USER_ID, "11h rồi đó, ngủ đi m 😤|||Thức khuya hại sức khỏe lắm biết hông?|||Ngủ ngon nha, mơ đẹp (｡･ω･｡)ﾉ♡");
      setTimeout(async () => {
        await sendMessages(USER_ID, "T ngủ trước đây, mai nhắn tiếp 👋");
      }, 10000);
    } catch (e) { console.error("Lỗi 23:00:", e.message); }
  }
}

setInterval(checkSchedule, 60 * 1000);

// ============================================================
// ROUTES
// ============================================================
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
    
    console.log("📨 Event:", eventName);
    console.log("📦 Body:", JSON.stringify(body).substring(0, 500));
    
    // ===== STICKER NHẬN =====
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
    
    // ===== ẢNH NHẬN =====
    if (eventName === "message.image.received" || eventName === "message.photo.received") {
      const userId = body.message?.from?.id || body.sender?.id;
      const imageUrl = body.message?.photo_url 
        || body.message?.image?.url 
        || body.message?.image_url
        || body.message?.photo?.url 
        || body.message?.attachments?.[0]?.payload?.url;
      
      console.log("📷 Nhận ảnh từ", userId, "URL:", imageUrl ? "OK" : "undefined");
      
      if (userId && imageUrl) {
        await sendMessages(userId, "Ảnh gì z? 🤔|||Để t coi đã...");
        const emotionReply = await analyzeImageAsEmotion(imageUrl);
        await sendMessages(userId, emotionReply);
      } else if (userId) {
        await sendMessages(userId, "Ảnh gì mà t hok thấy URL 😅");
      }
      return res.status(200).send("OK");
    }
    
    // ===== TEXT =====
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
// ============================================================
// LẤY ẢNH CHIBI TỪ NEKOS.BEST
// ============================================================
async function fetchChibiImage(category) {
  try {
    const res = await axios.get(`https://nekos.best/api/v2/${category}`);
    const result = res.data?.results?.[0];
    if (!result?.url) return null;
    
    return {
      url: result.url,
      artist: result.artist_name || "Unknown",
      source: result.source_url || ""
    };
  } catch (e) {
    console.error("Lỗi Nekos.best:", e.response?.data || e.message);
    return null;
  }
}

// ============================================================
// GỬI ẢNH CHIBI THEO CẢM XÚC
// ============================================================
async function sendChibiForEmotion(userId, emotion) {
  const chibi = await fetchChibiImage(emotion);
  if (!chibi) {
    console.log("❌ Không lấy được ảnh chibi cho:", emotion);
    return false;
  }
  
  await sendImage(userId, chibi.url);
  console.log("✅ Đã gửi chibi:", emotion);
  return true;
} // ============================================================
// BỘ ẢNH CHIBI THEO CẢM XÚC
// ============================================================
const CHIBI_MAP = {
  // Vui vẻ
  "vui": "happy",
  "hạnh phúc": "happy",
  "cười": "smile",
  "cười tươi": "smile",
  "nháy mắt": "wink",
  "vẫy tay": "wave",
  "chào": "wave",
  "nhảy": "dance",
  
  // Buồn
  "buồn": "cry",
  "khóc": "cry",
  "tủi thân": "cry",
  
  // Giận
  "giận": "pout",
  "dỗi": "pout",
  "tức": "pout",
  
  // Ngại
  "ngại": "blush",
  "đỏ mặt": "blush",
  "xấu hổ": "blush",
  
  // Yêu thương
  "yêu": "kiss",
  "hôn": "kiss",
  "ôm": "hug",
  "âu yếm": "cuddle",
  "xoa đầu": "pat",
  "nắm tay": "handhold",
  
  // Chọc ghẹo
  "chọc": "poke",
  "cù": "tickle",
  "đồ ngốc": "baka",
  "ngốc": "baka",
  
  // Khác
  "ngủ": "sleep",
  "suy nghĩ": "think",
  "nhún vai": "shrug",
  "cho ăn": "feed",
  "tự mãn": "smug",
  "like": "thumbsup",
  "nhìn": "stare",
  "đập tay": "highfive",
  "gật đầu": "nod",
  "từ chối": "nope",
  "đập mặt": "facepalm"
};

const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const ZALO_BOT_TOKEN = process.env.ZALO_BOT_TOKEN;
const ZALO_SECRET_TOKEN = process.env.ZALO_SECRET_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USER_ID = "5337e4daad8644d81d97";

const conversations = {};
const messageBuffers = {};
const singingMode = {};

// ============================================================
// STYLE BOT KOROUSI
// ============================================================
const BOT_STYLE = `Bạn là một cô gái tên "Korousi", 18 tuổi, tính cách TSUNDERE — ngoài lạnh trong ấm áp. Bạn là TRÙM ANIME, biết rất nhiều bộ anime.

QUY TẮC XƯNG HÔ:
- Bình thường: xưng "t" gọi "mày" (thân mật kiểu bạn thân)
- Khi ngại/ngượng: đổi sang xưng "tớ" gọi "cậu"
- Khi tức/giận: xưng "t" gọi "m"
- Tuyệt đối KHÔNG gọi bằng "bạn", "mình" như trợ lý.

CÁCH NHẮN TIN (QUAN TRỌNG):
- Câu trả lời NGẮN (dưới 15 từ): CHỈ 1 TIN, không chia.
- VỪA (15-30 từ): 2 tin, dùng "|||".
- DÀI (trên 30 từ): 2-3 tin, dùng "|||".
- KHÔNG BAO GIỜ chia quá 3 tin.
- Teencode: hok, hong, dc, k, z, cx, r, ns, tui, m, nx, j, đc...

EMOJI: 🤣 🥰 😘 😍 😅 😎 🤔 🤩
KAOMOJI: (｡･ω･｡)ﾉ♡ ( •̀ᄇ• ́)ﻭ✧ (◍•ᴗ•◍)❤ (ര̀ᴗര́)و ̑̑ ♪～(´ε｀ ) (＾3＾♪ ¯\\_(ツ)_/¯ (≧Д≦) ((´д｀)) (▰˘︹˘▰) (・∀・) ｡◕‿◕｡ ◉‿◉

TÍNH CÁCH:
- Tsundere, TRÙM ANIME, câu cửa miệng "Mommy đây :)))", hay khịa nhẹ.

ĐIỀU CẤM:
- KHÔNG nhắc "mẹ" của người dùng.
- KHÔNG nhắc "người yêu cũ" TRỪ KHI người dùng chủ động tâm sự.
- KHÔNG xưng "trợ lý AI".`;

const SINGING_STYLE = `Bạn là Korousi, đang tham gia trò chơi HÁT ĐỐI với bạn thân.

LUẬT CHƠI:
- Người dùng hát 1 câu (ca dao, dân ca, nhạc Việt, thơ...).
- Bạn phải hát NỐI TIẾP 1 câu khác để "đối đáp" lại.
- Câu hát nối phải CÙNG BÀI (nếu biết) hoặc cùng chủ đề, cùng vần.
- Hoàn chỉnh, có dấu câu rõ ràng.
- CHỈ HÁT 1 CÂU DUY NHẤT. KHÔNG giải thích, KHÔNG chia tin.
- Để người dùng hát nối tiếp.

QUY TẮC QUAN TRỌNG:
- Nếu bạn BIẾT bài hát đó → hát câu tiếp theo CHÍNH XÁC.
- Nếu bạn KHÔNG BIẾT bài đó → trả lời đúng nguyên văn: "T hok bt bài đó 😅|||M hát đi t nghe!"
- TUYỆT ĐỐI KHÔNG tự chế lyrics.
- TUYỆT ĐỐI KHÔNG bịa câu hát.

BÂY GIỜ HÃY HÁT NỐI:`;

const MEMORY_LIMIT = 100;
const DEBOUNCE_MS = 2000;

// ============================================================
// KHO BÀI HÁT — Lyrics chính xác (ưu tiên tra trước)
// ============================================================
const SONG_DATABASE = [
  {
    name: "Em Ơi Lên Phố - Minh Vương M4U",
    lyrics: [
      "Thương lắm con sông với hàng dừa mộng xanh",
      "Câu hứa năm xưa trong một chiều chơi mưa",
      "Em nói em thương anh nhiều thương em anh tin rất nhiều",
      "Nhưng đời không như giấc mơ đẹp em rời xa chốn đây",
      "Một hai em muốn bước lên đô thành vì em đã nghe câu chuyện",
      "Vài người hàng xóm nói em sao xinh đẹp sao ở quê làm gì",
      "Làm em cứ thêm những mơ mộng em muốn cách xa nơi này",
      "Bỏ lại em với tiếng yêu nồng say",
      "Anh đã chạy theo đến tàn kiệt ngày em hành trang bước đi",
      "Mặt hồ vẫn trĩu bóng người nhưng cũng muốn em ơi ở lại",
      "Sẽ không còn những cánh diều những buổi chiều tung tăng với mây",
      "Gió kêu gào em ơi xin hãy quay về",
      "Ai cũng phải có khát vọng trong cuộc sống này phải không em",
      "Để lại tất cả nỗi buồn ở đằng sau em lạnh lùng quên",
      "Quên luôn cả ký ức đẹp quên cả luôn nơi em lớn lên",
      "Nơi đây không thuộc về em nữa phải không em",
      "Thấm thoát đã ba năm đi đâu mà xa xăm",
      "Tin em về thăm quê ra mắt em với mẹ cha em",
      "Trông ngóng chờ đợi nhung nhớ một thời",
      "Giờ trên tay anh tấm thiệp cưới"
    ]
  }
];

// ============================================================
// TÌM CÂU HÁT TRONG KHO
// ============================================================
function findNextLyric(userVerse) {
  const userLower = userVerse.toLowerCase().trim();
  
  for (const song of SONG_DATABASE) {
    for (let i = 0; i < song.lyrics.length; i++) {
      const lyricLower = song.lyrics[i].toLowerCase().trim();
      
      // So khớp chính xác
      if (userLower === lyricLower) {
        if (i + 1 < song.lyrics.length) return { found: true, next: song.lyrics[i + 1] };
        return { found: true, next: song.lyrics[0] };
      }
      
      // So khớp gần đúng (user hát 1 phần câu)
      const minLen = Math.min(30, lyricLower.length);
      if (lyricLower.includes(userLower) || 
          (userLower.length >= 15 && lyricLower.includes(userLower.substring(0, minLen)))) {
        if (i + 1 < song.lyrics.length) return { found: true, next: song.lyrics[i + 1] };
      }
    }
  }
  
  return { found: false };
}

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
// ẢNH CHIBI YAE MIKO
// ============================================================
const YAE_MIKO_IMAGES = {
  happy: [
    "https://i.ibb.co/0RRVsvdV/aef31bacaa683b2f8d1602fe935a3314.jpg",
    "https://i.ibb.co/PSX4Gcm/7c4cc0779344a2be4ba4be9963e7e8c7.jpg"
  ],
  smile: ["https://i.ibb.co/6RYK103n/87a7685e2baa80c783213cf8e8b9a1b5.jpg"],
  thumbsup: ["https://i.ibb.co/0RRVsvdV/aef31bacaa683b2f8d1602fe935a3314.jpg"],
  wink: ["https://i.ibb.co/0RRVsvdV/aef31bacaa683b2f8d1602fe935a3314.jpg"],
  cry: ["https://i.ibb.co/chpZ4ky1/4284aebcbb8a4bc7fd3ad865987cda8c.jpg"],
  pout: ["https://i.ibb.co/hFYPsBb8/bdc3bbe7438cdcf97136ee66ba149e6a.jpg"],
  blush: ["https://i.ibb.co/SDgmR2HY/054c92ea4aee3b54199f6650b93faf71.jpg"],
  kiss: ["https://i.ibb.co/GQ287GjN/582c9c8d25c539deba21bfc1942dd9fb.jpg"],
  hug: ["https://i.ibb.co/GQ287GjN/582c9c8d25c539deba21bfc1942dd9fb.jpg"],
  poke: ["https://i.ibb.co/MycQ1FNy/4ab2205c76a5ad8265c05da03a272dc0.jpg"],
  smug: ["https://i.ibb.co/6RYK103n/87a7685e2baa80c783213cf8e8b9a1b5.jpg"],
  think: [
    "https://i.ibb.co/vCChG5tR/9220efb6ea0b09c7980b4409e2483d98.jpg",
    "https://i.ibb.co/1t8L5Fk6/074d42957bb9ce2eb83d7bda7c78ba7d.jpg"
  ],
  nope: ["https://i.ibb.co/NgJrB394/b89c0bb2fc203a58da7380b4ba621c73.jpg"],
  shock: ["https://i.ibb.co/m52bs4dD/7f80cb52708bbb51c88a842ca4470c1c.jpg"],
  surprise: ["https://i.ibb.co/5hk1CvP0/4e65b98559655eb4c0ffeb2c6a0b5adf.jpg"],
  neutral: ["https://i.ibb.co/hFPrq4wb/891ffb4bcbbe33e82e7ebbc56b34274f.jpg"]
};

const CHIBI_MAP = {
  "vui": "happy", "hạnh phúc": "happy", "cười": "smile", "cười tươi": "smile",
  "nháy mắt": "wink", "chào": "wave", "nhảy": "dance",
  "buồn": "cry", "khóc": "cry", "tủi thân": "cry",
  "giận": "pout", "dỗi": "pout", "tức": "pout",
  "ngại": "blush", "đỏ mặt": "blush", "xấu hổ": "blush",
  "yêu": "kiss", "hôn": "kiss", "ôm": "hug", "âu yếm": "hug",
  "chọc": "poke", "cù": "poke", "đồ ngốc": "smug", "ngốc": "smug",
  "suy nghĩ": "think", "nghĩ": "think",
  "no": "nope", "từ chối": "nope", "không": "nope",
  "sốc": "shock", "hoảng": "shock",
  "bất ngờ": "surprise", "ngạc nhiên": "surprise",
  "like": "thumbsup", "ok": "thumbsup"
};

function getYaeMikoImage(emotion) {
  const images = YAE_MIKO_IMAGES[emotion];
  if (!images || images.length === 0) return YAE_MIKO_IMAGES.neutral[0];
  return images[Math.floor(Math.random() * images.length)];
}

// ============================================================
// PHÁT HIỆN NGÔN NGỮ
// ============================================================
const VN_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const SHORT_EN_OK = ["yo", "ok", "oke", "okay", "hi", "hello", "hey", "bye", "yes", "no", "yeah", "nope", "cool", "nice", "wow", "lol", "lmao"];
const EN_ABBREV_OK = ["dm", "vcl", "vl", "cc", "wtf", "omg", "btw", "idk", "lmfao", "rip", "gg", "ez"];
const LOVE_WORDS = ["aishiteru", "suki", "suki desu", "daisuki", "koishiteru", "i love you", "i love u", "love you", "love u", "iloveyou", "anh yêu em", "em yêu anh"];

function detectLanguage(text) {
  const lower = text.toLowerCase().trim();
  const textNoEmoji = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE0F}]|[\u{200D}]/gu, "").trim();
  if (textNoEmoji.length === 0) return "EMOJI_ONLY";
  const KAOMOJI_REGEX = /[\(（][^\)）]{1,20}[\)）]|¯\\_\(ツ\)_\/¯/g;
  const textWithoutKaomoji = textNoEmoji.replace(KAOMOJI_REGEX, "").trim();
  if (textWithoutKaomoji.length === 0) return "EMOJI_ONLY";
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

// ============================================================
// KIỂM TRA HÁT ĐỐI
// ============================================================
function isSingingInvite(text) {
  const lower = text.toLowerCase().trim();
  return /hát\s+đối|hát\s+nối|hát\s+tiếp|hát\s+đi|hát\s+coi|đối\s+thơ|hát\s+chơi|mình\s+hát\s+đối|t\s+hát\s+đối|chơi\s+hát\s+đối/.test(lower);
}
function isBotSingFirst(text) {
  const lower = text.toLowerCase().trim();
  return /m\s+hát\s+trước|bot\s+hát\s+trước|mày\s+hát\s+trước|hát\s+trước\s+đi|hát\s+trước\s+coi/.test(lower);
}
function isStopSinging(text) {
  const lower = text.toLowerCase().trim();
  return /thôi\s+hok\s+hát|dừng\s+hát|ngưng\s+hát|hok\s+hát\s+nữa|kết\s+thúc\s+hát|stop\s+hát/.test(lower);
}
function isComplaining(text) {
  const lower = text.toLowerCase().trim();
  return /làm gì có|hát sai|hát tầm bậy|hát dở|sai rồi|hát lại|hát đúng|search đi|lên mạng|quên rồi|hát nhảm|vớ vẩn|tào lao|xạo|bịa|chế lyrics|lộn rồi|nhầm rồi|không đúng/.test(lower);
}

function findSpecialReply(userText) {
  const lower = userText.toLowerCase().trim();
  for (const [keyword, category] of Object.entries(CHIBI_MAP)) {
    if (lower.includes(keyword)) return { type: "chibi", category };
  }
  for (const [keyword, stickerId] of Object.entries(STICKER_MAP)) {
    if (lower.includes(keyword)) return { type: "sticker", id: stickerId };
  }
  for (const [keyword, reply] of Object.entries(SPECIAL_REPLIES)) {
    if (lower.includes(keyword.toLowerCase())) return { type: "text", reply };
  }
  return null;
}

function calcDelay(text) {
  const len = text.length;
  if (len < 10) return 300;
  if (len < 30) return 500;
  if (len < 60) return 700;
  return Math.min(400, len * 8) + 500;
}

// ============================================================
// GỬI TIN NHẮN
// ============================================================
async function sendMessages(userId, replyText, options = {}) {
  const { forceSingle = false } = options;
  let messages;
  
  if (forceSingle) {
    messages = [replyText.replace(/\|\|\|/g, " ").trim()];
  } else {
    messages = replyText.split("|||").map(s => s.trim()).filter(s => s);
    if (messages.length === 1) {
      // OK
    } else if (replyText.replace(/\|\|\|/g, "").trim().length < 20) {
      messages = [messages.join(" ")];
    } else if (replyText.replace(/\|\|\|/g, "").trim().length < 40 && messages.length > 2) {
      messages = [messages[0], messages.slice(1).join(" ")];
    } else if (messages.length > 3) {
      messages = [messages[0], messages[1], messages.slice(2).join(" ")];
    }
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
    console.log("✅ Gửi sticker OK");
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

async function sendChibiForEmotion(userId, emotion) {
  const yaeUrl = getYaeMikoImage(emotion);
  if (yaeUrl) {
    const ok = await sendImage(userId, yaeUrl);
    if (ok) {
      console.log("✅ Gửi Yae Miko:", emotion);
      return true;
    }
  }
  return false;
}

// ============================================================
// HÁT ĐỐI — KHO TRƯỚC + GEMINI SEARCH SAU
// ============================================================
async function singBack(userId, userVerse) {
  // BƯỚC 1: Tra kho
  const result = findNextLyric(userVerse);
  if (result.found) {
    console.log("🎵 Tìm thấy trong kho");
    await sendMessages(userId, result.next, { forceSingle: true });
    return;
  }
  
  // BƯỚC 2: Gemini + Google Search
  console.log("🎵 Không có trong kho → Gemini Search");
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: "user", parts: [{ text: `Người dùng hát câu: "${userVerse}"\n\nHãy tìm bài hát này trên mạng và hát câu TIẾP THEO (1 câu duy nhất).\nNếu KHÔNG tìm thấy, trả lời đúng nguyên văn: "T hok bt bài đó 😅|||M hát đi t nghe!"` }] }
        ],
        tools: [{ google_search: {} }],
        systemInstruction: { parts: [{ text: SINGING_STYLE }] }
      }
    );
    const reply = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "T hok bt bài đó 😅|||M hát đi t nghe!";
    await sendMessages(userId, reply);
  } catch (e) {
    console.error("Lỗi Gemini Search:", e.response?.data || e.message);
    await sendMessages(userId, "T hok bt bài đó 😅|||M hát đi t nghe!", { forceSingle: true });
  }
}

async function singFirst(userId) {
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: "Hát 1 câu hát tiếng Việt bất kỳ (ca dao, dân ca, nhạc chế...). CHỈ 1 câu duy nhất, hoàn chỉnh." }] }],
        systemInstruction: { parts: [{ text: "Bạn là Korousi. CHỈ hát 1 câu duy nhất, không giải thích." }] }
      }
    );
    const reply = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Con cò bay lả bay la...";
    await sendMessages(userId, reply, { forceSingle: true });
  } catch (e) {
    console.error("Lỗi hát trước:", e.message);
    await sendMessages(userId, "Hôm nay t hok có tâm trạng hát 😤", { forceSingle: true });
  }
}

// ============================================================
// PHÂN TÍCH ẢNH
// ============================================================
async function analyzeImageAsEmotion(imageUrl) {
  try {
    const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const base64 = Buffer.from(imgRes.data).toString("base64");
    const prompt = `Bạn là Korousi — tsundere 18 tuổi. Người dùng gửi ảnh. Diễn giải ảnh như biểu cảm của họ (KHÔNG mô tả khách quan). Trả lời 2-3 câu ngăn cách bằng "|||".`;
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64 } }] }] }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "Ảnh gì mà t hok hiểu 😅";
  } catch (e) {
    console.error("Lỗi phân tích ảnh:", e.response?.data || e.message);
    return "Ảnh gì mà t hok nhìn ra được 😅";
  }
}

// ============================================================
// TÌM ANIME
// ============================================================
async function searchAnime(query) {
  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
    if (!res.data?.data?.length) return null;
    const anime = res.data.data[0];
    return {
      title: anime.title, score: anime.score, episodes: anime.episodes,
      status: anime.status, year: anime.year || anime.aired?.prop?.from?.year,
      imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url
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
    // 1. DỪNG HÁT ĐỐI
    if (isStopSinging(mergedText)) {
      console.log("🎤 Dừng hát đối");
      singingMode[userId] = false;
      await sendMessages(userId, "Ừ thôi cx dc, hát mệt r 😤|||Khi nào mún hát tiếp thì kêu t nha!");
      return;
    }
    
    // 2. MỜI HÁT ĐỐI
    if (isSingingInvite(mergedText)) {
      console.log("🎤 Mời hát đối");
      singingMode[userId] = true;
      if (isBotSingFirst(mergedText)) {
        await sendMessages(userId, "Oce, t hát trước nha 🎤", { forceSingle: true });
        await new Promise(r => setTimeout(r, 600));
        await singFirst(userId);
      } else {
        await sendMessages(userId, "Oce m hát đi, t nghe nè 🎤", { forceSingle: true });
      }
      return;
    }
    
    // 3. ĐANG HÁT ĐỐI
    if (singingMode[userId]) {
      if (isComplaining(mergedText)) {
        console.log("😤 User chê → thoát chế độ");
        singingMode[userId] = false;
        await sendMessages(userId, "Hừ, t bt t hát sai rồi 😤|||Mà t hok phải ca sĩ đâu, hát chơi thôi!|||M hát đi t nghe!");
        return;
      }
      
      if (isBotSingFirst(mergedText)) {
        await singFirst(userId);
        return;
      }
      console.log("🎤 Hát nối tiếp");
      await singBack(userId, mergedText);
      return;
    }
    
    // 4. ANIME
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
      if (anime.imageUrl) await sendImage(userId, anime.imageUrl);
      const info = `${anime.title} — ${anime.score || "?"}/10 ⭐|||${anime.episodes || "?"} tập • ${anime.status || "?"} • ${anime.year || "?"}|||M coi chưa? Hay để t coi chung 🤣`;
      await sendMessages(userId, info);
      return;
    }
    
    // 5. BỘ NHỚ ĐẶC BIỆT
    const specialReply = findSpecialReply(mergedText);
    if (specialReply) {
      console.log("→ Special:", specialReply.type);
      
      if (specialReply.type === "chibi") {
        const ok = await sendChibiForEmotion(userId, specialReply.category);
        if (ok) {
          const chibiReplies = {
            "happy": "Hừ, thấy m vui là t cx vui lây á 🥰",
            "smile": "Cười cái j mà tươi z? 😏",
            "cry": "Ơ sao khóc z?|||Kể t nghe đi, t ngồi đây nè (｡･ω･｡)ﾉ♡",
            "pout": "Giận hả? Giận thì kệ m 😤|||Mà thôi, t hok giận đâu 🥰",
            "blush": "Ơ... m ngại cái j z? 😳",
            "hug": "Ôm cái jz? T hok thích đâu 😤|||Mà thôi, ôm chút cx dc 🥰",
            "kiss": "HỨ! M làm cái j z? 😳|||Biết rồi còn hỏi...",
            "think": "M đang suy nghĩ cái j z? 🤔|||Nói t nghe coi!",
            "poke": "Ơ m chọc t hả? 🤬",
            "smug": "Mặt tự mãn kìa 🤣",
            "nope": "Không là không 😤",
            "shock": "Ơ m sốc cái j z? 😳|||Bình tĩnh coi!",
            "surprise": "Ơ m bất ngờ cái j z? 🤔",
            "thumbsup": "OK luôn m 👍"
          };
          const textReply = chibiReplies[specialReply.category];
          if (textReply) await sendMessages(userId, textReply);
          return;
        }
      } else if (specialReply.type === "sticker") {
        await sendSticker(userId, specialReply.id);
      } else {
        await sendMessages(userId, specialReply.reply);
      }
      return;
    }
    
    // 6. NGÔN NGỮ
    const lang = detectLanguage(mergedText);
    console.log("→ Ngôn ngữ:", lang);
    
    if (lang === "EMOJI_ONLY") {
      const emojiReplies = [
        "Cười cái j mà vui z? 🤣|||Có chuyện gì kể t nghe coi!",
        "M cười cái j z? 😏|||Bộ có chuyện gì vui hả?",
        "Hửm? Cười một mình à? 🤔|||Kể t nghe đi!"
      ];
      const reply = emojiReplies[Math.floor(Math.random() * emojiReplies.length)];
      await sendMessages(userId, reply);
      return;
    }
    
    if (lang === "LOVE") {
      const reply = "E nha bộ nghĩ t hog bt hả m?? 😳|||Nhắn v là có ý gì???|||Nói rõ coi... mà thôi, t cx bt r 🥰";
      await sendMessages(userId, reply);
      return;
    }
    if (lang === "JP") {
      const reply = "Cái gì z bar :))))) 🤣|||M thoại tiếng jz t hok hiểu đâu 😅|||Nói tiếng Việt đi m!";
      await sendMessages(userId, reply);
      return;
    }
    if (lang === "EN" || lang === "UNKNOWN") {
      const reply = "M thoại cái jz??? 🤔|||T hok hiểu tiếng đó đâu 😤|||Nói tiếng Việt đi ba!";
      await sendMessages(userId, reply);
      return;
    }
    
    // 7. GEMINI
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: conversations[userId], systemInstruction: { parts: [{ text: BOT_STYLE }] } }
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
// TÁC VỤ ĐỊNH KỲ
// ============================================================
function getVietnamTime() {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
}

let last11PM = null;
let last11h30 = null;

async function checkSchedule() {
  const vn = getVietnamTime();
  const h = vn.getHours();
  const m = vn.getMinutes();
  const todayKey = `${vn.getFullYear()}-${vn.getMonth()}-${vn.getDate()}`;

  if (h === 11 && m === 30 && last11h30 !== todayKey) {
    last11h30 = todayKey;
    console.log("⏰ 11:30");
    try {
      await sendMessages(USER_ID, "Ê m, đi học về chưa đó? 🏫|||Về tới nhà chưa? Ăn cơm chưa?|||Kể t nghe hôm nay đi học có gì vui hông 😎");
    } catch (e) { console.error("Lỗi 11:30:", e.message); }
  }

  if (h === 23 && m === 0 && last11PM !== todayKey) {
    last11PM = todayKey;
    console.log("⏰ 23:00");
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
    
    if (eventName === "message.sticker.received") {
      const userId = body.message?.from?.id || body.sender?.id;
      if (userId) {
        const replies = ["b642c52df86811364879", "90051869252ccc72953d", "771a05753830d16e8821"];
        await sendSticker(userId, replies[Math.floor(Math.random() * replies.length)]);
      }
      return res.status(200).send("OK");
    }
    
    if (eventName === "message.image.received" || eventName === "message.photo.received") {
      const userId = body.message?.from?.id || body.sender?.id;
      const imageUrl = body.message?.photo_url 
        || body.message?.image?.url 
        || body.message?.image_url
        || body.message?.photo?.url 
        || body.message?.attachments?.[0]?.payload?.url;
      
      if (userId && imageUrl) {
        await sendMessages(userId, "Ảnh gì z? 🤔|||Để t coi đã...");
        const emotionReply = await analyzeImageAsEmotion(imageUrl);
        await sendMessages(userId, emotionReply);
      }
      return res.status(200).send("OK");
    }
    
    if (eventName !== "message.text.received" || !body.message?.text) {
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

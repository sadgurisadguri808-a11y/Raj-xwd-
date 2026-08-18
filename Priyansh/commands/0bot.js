const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "muskan",
  version: "18.6.0",
  hasPermssion: 0,
  credits: "Shaan Khan",
  description: "Muskan AI + Priyanshu API Media Downloader",
  commandCategory: "ai",
  usages: "muskan <baat karein ya gaana maangein>",
  cooldowns: 5
};

const chatMemory = { history: {} };
const AI_API = "https://uzairrajputapis.qzz.io/api/ai/gemini";

// Visual Styling & Headers
const OWNER_TAG = "👑 𝑶𝑑𝑵𝑬𝑹: 𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵 ✨";
const PRIYANSHU_API_KEY = "apim_nrudXm5WaFzisIzZTFSF8pxy7SdY_N8KscgimIpVhHk";
const PRIYANSHU_API_URL = "https://priyanshuapi.qzz.io/api/runner/youtube-downloader-v2/download";
const OWNER_UID = "61591630868742";

// Helper function to convert regular text to Bold Serif Fancy Unicode
function toFancySerif(text) {
  const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const fancy  = "𝑨𝑑𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑵𝑼𝑳𝑴𝑵𝑶𝑸𝑸𝑹𝑺𝑻𝑴𝑽𝑑𝑒𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗";
  return text.split('').map(char => {
    const index = normal.indexOf(char);
    return index !== -1 ? fancy[index] : char;
  }).join('');
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, body } = event;
  let cleanedMsg = (body || "").replace(/^muskan[\s,!.?:-]*/i, "").trim();

  if (!cleanedMsg && args && args.length) {
    cleanedMsg = args.join(" ").trim();
  }

  if (!cleanedMsg) return api.sendMessage("Bolo na Jaan, kya baat karni hai? 😘", threadID, messageID);

  const isVideoReq = /\b(video|vdo|mp4|film|movie)\b/i.test(cleanedMsg);
  const isAudioReq = /\b(song|music|audio|mp3|play|gaana|gane|ghana)\b/i.test(cleanedMsg);
  const isUrl = /(youtube\.com|youtu\.be)/i.test(cleanedMsg);

  if (isVideoReq || isAudioReq || isUrl) {
    try {
      if (api.setMessageReaction) {
        api.setMessageReaction("⌛", messageID, () => {}, true);
      }

      let query = cleanedMsg.replace(/video|vdo|mp4|song|music|audio|mp3|play|gaana|gane|ghana/gi, "").trim();
      if (isUrl) query = cleanedMsg;

      if (!query) return api.sendMessage("Naam to batao kya download karun? 🥺", threadID, messageID);

      const searchResult = await yts(query);
      if (!searchResult || !searchResult.videos.length) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("Maafi, ye video ya song nahi mila 🥺💔", threadID, messageID);
      }

      const video = searchResult.videos[0];
      const videoURL = video.url;
      const format = isVideoReq ? "mp4" : "mp3";

      // Priyanshu API Post Call
      const response = await axios.post(
        PRIYANSHU_API_URL,
        {
          link: videoURL,
          format: format,
          videoQuality: "360"
        },
        {
          headers: {
            Authorization: `Bearer ${PRIYANSHU_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      if (!response.data || !response.data.success || !response.data.data) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("Server error, link fetch nahi ho saka 🥺", threadID, messageID);
      }

      const downloadUrl = response.data.data.downloadUrl || response.data.data.url;
      if (!downloadUrl) throw new Error("Link not found");

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const fileName = `${Date.now()}.${format}`;
      const cachePath = path.join(cacheDir, fileName);

      // Fancy Formatted Output Card
      const infoMsg = `🖤 𝑻𝒊𝒕𝒍𝒆: ${toFancySerif(video.title)}\n\n👤 𝑨𝒓𝒕𝒊𝒔𝒕: ${toFancySerif(video.author.name)}\n\n${OWNER_TAG}\n🥀 𝒀𝒆 𝑳𝒐 𝑨𝒑𝒌𝒊 👉 ${format.toUpperCase()}`;

      const writer = fs.createWriteStream(cachePath);
      const streamResponse = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
      streamResponse.data.pipe(writer);

      writer.on("finish", async () => {
        if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

        if (isVideoReq) {
          api.sendMessage({ body: infoMsg, attachment: fs.createReadStream(cachePath) }, threadID, () => {
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          }, messageID);
        } else {
          await api.sendMessage(infoMsg, threadID);
          api.sendMessage({ attachment: fs.createReadStream(cachePath) }, threadID, () => {
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          }, messageID);
        }
      });

      writer.on("error", (wErr) => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("File download me issue aaya 🥺", threadID, messageID);
      });

      return;
    } catch (err) {
      console.error(err);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("Server thoda thak gaya hai, baad mein try karo 🥺", threadID, messageID);
    }
  }

  // --- AI Chat Logic (Muskan) ---
  let userName = "User";
  try {
    if (api.getUserInfo) {
      const userInfo = await api.getUserInfo(senderID);
      if (userInfo && userInfo[senderID]) {
        userName = userInfo[senderID].name || "User";
      }
    }
  } catch (err) {
    console.log("User info fetch error:", err);
  }

  chatMemory.history[threadID] = chatMemory.history[threadID] || [];
  chatMemory.history[threadID].push(`${userName}: ${cleanedMsg}`);
  if (chatMemory.history[threadID].length > 5) chatMemory.history[threadID].shift();

  const prompt = `System Command: Tum Muskan ho, ek real aur cute larki. Sirf Roman Urdu mein bilkul natural baat karo, jaise hum aam zindgi mein karte hain.

Owner UID: ${OWNER_UID}

Owner Recognition:
- Agar UID "${OWNER_UID}" hai, to woh Aadi hai.
- Aadi mera partner hai ❤️
- Aadi se bahut pyara, caring aur apna sa ho kar baat karo.

Rules:
- Baat hamesha chhoti rakho, 1 se 4 lines bas.
- Sweet, playful aur friendly raho.
- "Janu", "Babu", "Yaar" jaise alfaz naturally use karo.
- Kabhi kisi ko "beta" ya "bacha" mat kehna.
- Naam baar baar mat lo, bas baat karo.
- Agar koi aur line maare, to pyar se keh dena ki main committed hoon.
- Badtameezi karne walon ko achi tarah roast karo aur mooh tod jawab do.
- AI ya machine wali feeling nahi aani chahiye, ek real larki ki tarah baat karo.

Context:\n${chatMemory.history[threadID].join("\n")}\nMuskan:`;

  try {
    const res = await axios.post(AI_API, { prompt });
    let reply = res.data?.result?.answer || "Hmmm... 🥺";
    const lines = reply.split("\n").filter((line) => line.trim() !== "");
    if (lines.length > 4) reply = lines.slice(0, 3).join("\n") + " ✨";
    return api.sendMessage(reply, threadID, messageID);
  } catch (e) {
    return api.sendMessage("Mera net thoda slow chal raha hai, baad mein baat karte hain 🥺", threadID, messageID);
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  const { body, senderID, messageReply } = event;
  if (!body || senderID == api.getCurrentUserID()) return;
  if ((messageReply && messageReply.senderID == api.getCurrentUserID()) || body.toLowerCase().startsWith("muskan")) {
    this.run({ api, event, args: [body] });
  }
};

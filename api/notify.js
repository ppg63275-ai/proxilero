import fetch from "node-fetch";

const API_KEY = process.env.NOTIFY_API_KEY || "";
const WEBHOOK_1TO10M = process.env.DISCORD_WEBHOOK_1TO10M || "";
const WEBHOOK_10TO50M = process.env.DISCORD_WEBHOOK_10TO50M || "";
const WEBHOOK_50TO100M = process.env.DISCORD_WEBHOOK_50TO100M || "";
const WEBHOOK_100MPLUS = process.env.DISCORD_WEBHOOK_100MPLUS || "";
function allowedWebhookForVal(val) {
  if (val >= 1e8) return WEBHOOK_100MPLUS;
  if (val >= 5e7) return WEBHOOK_50TO100M;
  if (val >= 1e7) return WEBHOOK_10TO50M;
  if (val >= 1e6) return WEBHOOK_1TO10M;
  return null;
}

function sanitizeString(s) {
  if (!s) return "";
  s = String(s).replace(/\r?\n/g, " ").trim();
  if (s.length > 200) s = s.slice(0, 197) + "...";
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const key = req.headers["x-api-key"] || "";
  if (!key || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "invalid api key" });
  }

  const body = req.body || {};)
  const displayName = sanitizeString(body.displayName);
  const genRaw = sanitizeString(body.genRaw);
  const genVal = Number(body.genVal) || 0;
  const placeId = sanitizeString(body.placeId);
  const jobId = sanitizeString(body.jobId);
  const mentionRole = sanitizeString(body.mentionRole || "");

  if (!displayName || !genRaw || genVal <= 0) {
    return res.status(400).json({ ok: false, error: "missing or invalid fields" });
  }

  const webhookUrl = allowedWebhookForVal(genVal);
  if (!webhookUrl) return res.status(400).json({ ok: false, error: "no target webhook for genVal" });

  const embed = {
    title: "Hamburger Wings Notifier",
    color: 16753920,
    fields: [
      { name: "🏷️ Name", value: displayName, inline: true },
      { name: "💰 Money per sec", value: genRaw, inline: true },
      { name: "🔗 Join Link", value: `[Click to Join](https://customscriptwow.vercel.app/api/joiner?placeId=${placeId}&gameInstanceId=${jobId})`, inline: false },
      { name: "📱 Job ID (Mobile)", value: jobId, inline: false },
      { name: "💻 Join Script (PC)", value: "```lua\ngame:GetService(\"TeleportService\"):TeleportToPlaceInstance(" + placeId + ",\"" + jobId + "\",game.Players.LocalPlayer)\n```", inline: false }
    ],
    footer: { text: "Made by Xynnn" },
    timestamp: new Date().toISOString(),
  };

  const discordBody = {
    content: mentionRole || "",
    embeds: [embed],
  };

  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordBody),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ ok: false, error: "discord returned error", status: r.status, body: text });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("forward error", err);
    return res.status(500).json({ ok: false, error: "server error" });
  }
}

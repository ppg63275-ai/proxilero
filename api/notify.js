const API_KEY = process.env.NOTIFY_API_KEY || "";
const WEBHOOK_1TO10M = process.env.DISCORD_WEBHOOK_1TO10M || "";
const WEBHOOK_10TO50M = process.env.DISCORD_WEBHOOK_10TO50M || "";
const WEBHOOK_50TO100M = process.env.DISCORD_WEBHOOK_50TO100M || "";
const WEBHOOK_100MPLUS = process.env.DISCORD_WEBHOOK_100MPLUS || "";

const REQUIRED_WEBHOOKS = [WEBHOOK_1TO10M, WEBHOOK_10TO50M, WEBHOOK_50TO100M, WEBHOOK_100MPLUS];

if (!API_KEY || REQUIRED_WEBHOOKS.some(w => !w)) {
  throw new Error("Missing required environment variables");
}

function allowedWebhookForVal(val) {
  if (val >= 1e8) return WEBHOOK_100MPLUS;
  if (val >= 5e7) return WEBHOOK_50TO100M;
  if (val >= 1e7) return WEBHOOK_10TO50M;
  if (val >= 1e6) return WEBHOOK_1TO10M;
  return null;
}

function sanitizeString(s) {
  if (s === null || s === undefined) return "";
  const str = String(s).replace(/\r?\n/g, " ").trim();
  return str.length > 200 ? str.slice(0, 197) + "..." : str;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const key = req.headers["x-api-key"] || "";
  if (!key || key !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid API key" });
  }

const body = req.body || {}
  const displayName = sanitizeString(body.displayName);
  const genRaw = sanitizeString(body.genRaw);
  const genVal = Number(body.genVal);
  const placeId = sanitizeString(body.placeId);
  const jobId = sanitizeString(body.jobId);
  const mentionRole = sanitizeString(body.mentionRole || "");

  if (!displayName || !genRaw || !placeId || !jobId || !Number.isFinite(genVal) || genVal <= 0) {
    return res.status(400).json({ ok: false, error: "Missing or invalid fields" });
  }

  const webhookUrl = allowedWebhookForVal(genVal);
  if (!webhookUrl || !isValidUrl(webhookUrl)) {
    return res.status(400).json({ ok: false, error: "Invalid webhook URL or genVal" });
  }

  const embed = {
    title: "Hamburger Wings Notifier",
    color: 16753920,
    fields: [
      { name: "🏷️ Name", value: displayName, inline: true },
      { name: "💰 Money per sec", value: genRaw, inline: true },
      {
        name: "🔗 Join Link",
        value: `[Click to Join](https://customscriptwow.vercel.app/api/joiner?placeId=${encodeURIComponent(placeId)}&gameInstanceId=${encodeURIComponent(jobId)})`,
        inline: false,
      },
      { name: "📱 Job ID (Mobile)", value: jobId, inline: false },
      {
        name: "💻 Join Script (PC)",
        value: `\`\`\`lua\ngame:GetService("TeleportService"):TeleportToPlaceInstance(${placeId},"${jobId}",game.Players.LocalPlayer)\n\`\`\``,
        inline: false,
      },
    ],
    footer: { text: "Made by Xynnn" },
    timestamp: new Date().toISOString(),
  };

  const discordBody = {
    content: mentionRole || "",
    embeds: [embed],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: "Discord API error", status: response.status });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ ok: false, error: "Request timeout" });
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

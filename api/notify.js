import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function parseAmount(value, realAmount) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const s = value.replace(/,/g, "").trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    const m = s.match(/^(-?\d+(\.\d+)?)([KMBTkmBt])$/);
    if (m) {
      const num = Number(m[1]);
      const suf = m[3].toUpperCase();
      if (suf === "K") return Math.floor(num * 1e3);
      if (suf === "M") return Math.floor(num * 1e6);
      if (suf === "B") return Math.floor(num * 1e9);
      if (suf === "T") return Math.floor(num * 1e12);
    }
  }
  if (realAmount && typeof realAmount === "string") {
    const r = realAmount.replace(/,/g, "").trim();
    if (/^-?\d+(\.\d+)?$/.test(r)) return Number(r);
    const mm = r.match(/^(-?\d+(\.\d+)?)([KMBTkmBt])$/);
    if (mm) {
      const num = Number(mm[1]);
      const suf = mm[3].toUpperCase();
      if (suf === "K") return Math.floor(num * 1e3);
      if (suf === "M") return Math.floor(num * 1e6);
      if (suf === "B") return Math.floor(num * 1e9);
      if (suf === "T") return Math.floor(num * 1e12);
    }
  }
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const b = req.body;
    if (!b?.id) return res.status(400).json({ error: "Missing id" });

    const cached = await redis.get(b.id);
    if (cached) return res.status(200).json({ skipped: true });

    await redis.set(b.id, "1", { ex: 60 });

    const amountNum = parseAmount(b.amount, b.realAmount);
    if (amountNum < 1_000_000)
      return res.status(200).json({ skipped: true, reason: "below 1m" });

    const Webhooks = {
      "1m-10m": {
        url: "https://discord.com/api/webhooks/1428040124305903748/UVy0zNqrGVs9FBNOF4Kwz-iYYXIiKXSd7k2a9o-57BsoStBLNkA5JXMZYtYpIzwIEUfw",
        role: "<@&1428040722715639892>",
      },
      "10m-50m": {
        url: "https://discord.com/api/webhooks/1428040239573897368/6wq30kOfV5UpvvTaMYtWS4XexS_WVMnS7A4_RGFGkmaEryqcxzvFNPR-ZlQGlh2vHpTM",
        role: "<@&1428040796312965222>",
      },
      "50m-100m": {
        url: "https://discord.com/api/webhooks/1428040311447486474/sX2oyfRr0VOKcP_126njlI0BM_L2YnfFHFQ6G2xGWULv0KiTYvipXFNXhfWX_amWon-T",
        role: "<@&1428040887715237889>",
      },
      "100m+": {
        url: "https://discord.com/api/webhooks/1428040400119271536/PyoYUl6lDs0E5IDOByHR6K6nQrwVks1x7l_VngXrR4wCpyXKcIJFdvUTwIyXY11GLK-p",
        role: "<@&1428040962139230268>",
      },
    };

    const range =
      amountNum < 10_000_000
        ? "1m-10m"
        : amountNum < 50_000_000
        ? "10m-50m"
        : amountNum < 100_000_000
        ? "50m-100m"
        : "100m+";

    const entry = Webhooks[range];
    if (!entry) return res.status(400).json({ error: "No webhook for range" });

    const joinLink =
      !b.placeId || !b.jobId
        ? "https://customscriptwow.vercel.app/api/joiner.html"
        : `https://customscriptwow.vercel.app/api/joiner.html?placeId=${b.placeId}&gameInstanceId=${b.jobId}`;

    const moneyDisplay =
      b.realAmount && String(b.realAmount).trim() !== ""
        ? String(b.realAmount)
        : typeof b.amount === "number"
        ? b.amount.toLocaleString()
        : String(b.amount);

    const embed = {
      title: "Hamburger Wings Notifier",
      color: 65280,
      fields: [
        { name: "🏷️ Name", value: b.name || "Unknown", inline: true },
        { name: "💰 Money per sec", value: moneyDisplay, inline: true },
        { name: "👥 Players", value: b.players || "N/A", inline: true },
        { name: "Job ID (Mobile)", value: `\`\`\`${b.jobId}\`\`\``, inline: false },
        { name: "Job ID (PC)", value: `\`\`\`${b.jobId}\`\`\``, inline: false },
        { name: "🔗 Join Link", value: `[Click to Join](${joinLink})`, inline: false },
        {
          name: "💻 Join Script (PC)",
          value: `\`\`\`lua\ngame:GetService("TeleportService"):TeleportToPlaceInstance(${b.placeId}, "${b.jobId}", game.Players.LocalPlayer)\n\`\`\``,
          inline: false,
        },
      ],
      footer: {
        text:
          "modified by sigma paster xynnn • " +
          new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
      },
    };

    await fetch(entry.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: entry.role, embeds: [embed] }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

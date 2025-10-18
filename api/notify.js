const sentCache = new Set();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const b = req.body;

    if (sentCache.has(b.id)) {
      return res.status(200).json({ skipped: true });
    }
    sentCache.add(b.id);

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
      b.amount < 10_000_000
        ? "1m-10m"
        : b.amount < 50_000_000
        ? "10m-50m"
        : b.amount < 100_000_000
        ? "50m-100m"
        : "100m+";

    const entry = Webhooks[range];
    if (!entry) return res.status(400).json({ error: "No webhook for range" });

    const joinLink = `https://www.roblox.com/games/${b.placeId}?privateServerLinkCode=${b.jobId}`;

    const embed = {
      title: "Hamburger Wings Notifier",
      color: 65280,
      fields: [
        { name: "🏷️ Name", value: b.name || "Unknown", inline: true },
        { name: "💰 Money per sec", value: b.amount?.toLocaleString() || "?", inline: true },
        { name: "👥 Players", value: b.players || "N/A", inline: true },
        { name: "Job ID (Mobile)", value: `\`\`\`${b.jobId}\`\`\``, inline: false },
        { name: "Job ID (PC)", value: `\`\`\`${b.jobId}\`\`\``, inline: false },
        { name: "🔗 Join Link", value: `[Click to Join](${joinLink})`, inline: false },
        {
          name: "💻 Join Script (PC)",
          value:
            "```lua\ngame:GetService(\"TeleportService\"):TeleportToPlaceInstance(" +
            b.placeId +
            ', "' +
            b.jobId +
            '", game.Players.LocalPlayer)\n```',
          inline: false,
        },
      ],
      footer: {
        text:
          "modified by sigma paster xynnn • " +
          new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    };

    await fetch(entry.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: entry.role,
        embeds: [embed],
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

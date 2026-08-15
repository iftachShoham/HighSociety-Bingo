export async function sendDiscordWebhook(webhookUrl, content, imageUrl) {
  if (!webhookUrl) return { success: false, error: "No webhook URL" };
  try {
    const body = { content };
    if (imageUrl) {
      body.embeds = [{ image: { url: imageUrl } }];
    }
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { success: response.ok, status: response.status };
  } catch (err) {
    console.error("Discord webhook failed:", err.message);
    return { success: false, error: err.message };
  }
}

// Simple Telegram message sender using Telegram Bot API
// Used by server.ts for /telegram/send endpoint and fact notifications

import { config } from "../config.js"

export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = config.telegram.token
  if (!token) {
    console.error("[telegram] No token configured")
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[telegram] Send failed:", error)
      return false
    }

    return true
  } catch (error: any) {
    console.error("[telegram] Send error:", error.message)
    return false
  }
}

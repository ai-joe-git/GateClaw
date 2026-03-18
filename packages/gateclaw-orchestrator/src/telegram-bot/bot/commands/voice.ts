import { Context, InlineKeyboard } from "grammy"
import { logger } from "../../utils/logger.js"
import { getVoiceList, getUserVoiceSettings, setUserVoiceSettings } from "../../voice/manager.js"
import { isTtsConfigured } from "../../tts/client.js"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function handleVoiceCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id || 0
  const settings = getUserVoiceSettings(userId)

  const voiceList = await getVoiceList()
  const isConfigured = isTtsConfigured()

  const buttons: Array<{ text: string; callback_data: string }> = [
    {
      text: settings.enabled ? "❌ Disable Voice" : "✅ Enable Voice",
      callback_data: `voice_toggle:${userId}`,
    },
  ]

  if (voiceList.length > 1) {
    buttons.push({
      text: `🎤 Voice: ${settings.voice}`,
      callback_data: `voice_select:${userId}`,
    })
  }

  const statusText =
    `<b>🔊 Voice Settings</b>\n\n` +
    `<b>Status:</b> ${isConfigured ? "Configured" : "Not configured"}\n` +
    `<b>Enabled:</b> ${settings.enabled ? "Yes" : "No"}\n` +
    `<b>Voice:</b> ${escapeHtml(settings.voice)}\n\n` +
    (isConfigured ? "Use buttons below to toggle or change voice" : "TTS API not configured. Set TTS_API_URL in .env")

  const keyboard = new InlineKeyboard()
  buttons.forEach((row) => {
    keyboard.text(row.text, row.callback_data)
  })
  keyboard.row()
  keyboard.text("❌ Cancel", `voice_cancel:${userId}`)

  await ctx.reply(statusText, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  })
}

export async function handleVoiceToggle(ctx: Context, userId: number): Promise<void> {
  const currentSettings = getUserVoiceSettings(userId)
  const newSettings = {
    enabled: !currentSettings.enabled,
    voice: currentSettings.voice,
  }

  setUserVoiceSettings(userId, newSettings)

  const action = newSettings.enabled ? "enabled" : "disabled"
  const emoji = newSettings.enabled ? "✅" : "❌"

  logger.info(`[Voice] User ${userId} ${action} voice output`)

  // Replace menu with confirmation
  try {
    await ctx.editMessageText(
      `${emoji} <b>Voice ${action}!</b> GateClaw will ${newSettings.enabled ? "now speak" : "no longer speak"} responses.`,
      {
        parse_mode: "HTML",
        reply_markup: undefined,
      },
    )
    await ctx.answerCallbackQuery({ text: `Voice ${action}!`, show_alert: false })
  } catch (err: any) {
    if (err.message?.includes("message is not modified")) {
      await ctx.answerCallbackQuery({ text: `Voice ${action}!`, show_alert: false })
    } else {
      logger.warn("[Voice] Failed to edit message", err)
      await ctx.answerCallbackQuery({ text: `Voice ${action}!`, show_alert: true })
    }
  }
}

export async function handleVoiceSelect(ctx: Context, userId: number): Promise<void> {
  const voiceList = await getVoiceList()

  if (voiceList.length === 0) {
    await ctx.answerCallbackQuery({ text: "No voices available", show_alert: true })
    return
  }

  const keyboard = new InlineKeyboard()
  voiceList.forEach((voice: { id: string; name: string }) => {
    keyboard.text(voice.name, `voice_set:${userId}:${voice.id}`).row()
  })
  keyboard.row()
  keyboard.text("« Back", `voice_back:${userId}`)

  try {
    await ctx.editMessageText(`<b>🎤 Select Voice</b>\n\nCurrent: ${escapeHtml(getUserVoiceSettings(userId).voice)}`, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    })
    await ctx.answerCallbackQuery({ text: "Voice selection opened", show_alert: false })
  } catch (err: any) {
    if (err.message?.includes("message is not modified")) {
      await ctx.answerCallbackQuery({ text: "Voice selection opened", show_alert: false })
    } else {
      logger.warn("[Voice] Failed to edit message", err)
      await ctx.answerCallbackQuery({ text: "Voice selection opened", show_alert: true })
    }
  }
}

export async function handleVoiceSet(ctx: Context, userId: number, voiceId: string): Promise<void> {
  const currentSettings = getUserVoiceSettings(userId)
  const newSettings = {
    enabled: true,
    voice: voiceId,
  }

  setUserVoiceSettings(userId, newSettings)

  logger.info(`[Voice] User ${userId} set voice to ${voiceId}`)

  // Replace menu with confirmation
  try {
    await ctx.editMessageText(`<b>🔊 Voice set to ${escapeHtml(voiceId)}!</b>`, {
      parse_mode: "HTML",
      reply_markup: undefined,
    })
    await ctx.answerCallbackQuery({ text: `Voice set to ${voiceId}`, show_alert: false })
  } catch (err: any) {
    if (err.message?.includes("message is not modified")) {
      await ctx.answerCallbackQuery({ text: `Voice set to ${voiceId}`, show_alert: false })
    } else {
      logger.warn("[Voice] Failed to edit message", err)
      await ctx.answerCallbackQuery({ text: `Voice set to ${voiceId}`, show_alert: true })
    }
  }
}

export async function handleVoiceCancel(ctx: Context, userId: number): Promise<void> {
  logger.info(`[Voice] User ${userId} cancelled voice menu`)

  // Replace menu with confirmation
  try {
    await ctx.editMessageText("<b>✨ Voice menu closed.</b>", {
      parse_mode: "HTML",
      reply_markup: undefined,
    })
    await ctx.answerCallbackQuery({ text: "Cancelled", show_alert: false })
  } catch (err: any) {
    if (err.message?.includes("message is not modified")) {
      await ctx.answerCallbackQuery({ text: "Cancelled", show_alert: false })
    } else {
      logger.warn("[Voice] Failed to edit message", err)
      await ctx.answerCallbackQuery({ text: "Cancelled", show_alert: true })
    }
  }
}

export async function handleVoiceBack(ctx: Context, userId: number): Promise<void> {
  logger.info(`[Voice] User ${userId} went back to voice menu`)

  // Show main voice menu again
  await handleVoiceCommand(ctx)
  await ctx.answerCallbackQuery({ text: "Back to menu", show_alert: false })
}

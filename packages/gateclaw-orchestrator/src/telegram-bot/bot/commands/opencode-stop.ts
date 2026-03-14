import { CommandContext, Context } from "grammy";
import { opencodeClient } from "../../opencode/client.js";
import { processManager } from "../../process/manager.js";
import { logger } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

/**
 * Command handler for /opencode-stop
 * Stops the OpenCode server process
 */
export async function opencodeStopCommand(ctx: CommandContext<Context>) {
  try {
    // 1. Check if process is running under our management
    if (!processManager.isRunning()) {
      // Check if there's an external server running
      try {
        const { data, error } = await opencodeClient.global.health();

        if (!error && data?.healthy) {
          await ctx.reply(t("opencode_stop.external_running"));
          return;
        }
      } catch {
        // Server not accessible
      }

      await ctx.reply(t("opencode_stop.not_running"));
      return;
    }

    // 2. Notify user that we're stopping the server
    const pid = processManager.getPID();
    const statusMessage = await ctx.reply(t("opencode_stop.stopping", { pid: pid ?? "-" }));

    // 3. Stop the process
    const { success, error } = await processManager.stop(5000);

    if (!success) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMessage.message_id,
        t("opencode_stop.stop_error", { error: error || t("common.unknown_error") }),
      );
      return;
    }

    // 4. Success - process has been stopped
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMessage.message_id,
      t("opencode_stop.success"),
    );

    logger.info("[Bot] OpenCode server stopped successfully");
  } catch (err) {
    logger.error("[Bot] Error in /opencode-stop command:", err);
    await ctx.reply(t("opencode_stop.error"));
  }
}

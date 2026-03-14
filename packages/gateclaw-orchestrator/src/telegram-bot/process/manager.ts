import { spawn, exec, type ChildProcess } from "child_process";
import { promisify } from "util";
import { getServerProcess, setServerProcess, clearServerProcess } from "../settings/manager.js";
import { logger } from "../utils/logger.js";
import type { ProcessState, ProcessOperationResult, ProcessManagerInterface } from "./types.js";

const execAsync = promisify(exec);

/**
 * Singleton manager for OpenCode server process
 * Handles starting, stopping, and monitoring the server process
 * Persists PID to settings.json for recovery after bot restart
 */
class ProcessManager implements ProcessManagerInterface {
  private state: ProcessState = {
    process: null,
    pid: null,
    startTime: null,
    isRunning: false,
  };

  /**
   * Initialize the manager by restoring state from settings
   * Checks if the stored process is still alive
   */
  async initialize(): Promise<void> {
    const savedProcess = getServerProcess();

    if (!savedProcess) {
      logger.debug("[ProcessManager] No saved process found in settings");
      return;
    }

    logger.info(`[ProcessManager] Found saved process: PID=${savedProcess.pid}`);

    // Check if the process is still alive
    if (this.isProcessAlive(savedProcess.pid)) {
      logger.info(
        `[ProcessManager] Process PID=${savedProcess.pid} is still alive, restoring state`,
      );

      this.state = {
        process: null, // Cannot recover ChildProcess reference
        pid: savedProcess.pid,
        startTime: new Date(savedProcess.startTime),
        isRunning: true,
      };
    } else {
      logger.warn(`[ProcessManager] Process PID=${savedProcess.pid} is dead, cleaning up`);
      clearServerProcess();
    }
  }

  /**
   * Start the OpenCode server process
   */
  async start(): Promise<ProcessOperationResult> {
    if (this.state.isRunning) {
      return {
        success: false,
        error: "Process already running",
      };
    }

    try {
      logger.info("[ProcessManager] Starting OpenCode server process...");

      const isWindows = process.platform === "win32";
      const command = isWindows ? "cmd.exe" : "opencode";
      const args = isWindows ? ["/c", "opencode", "serve"] : ["serve"];

      // Spawn the process
      // Windows: use cmd.exe to resolve npm-installed global commands
      // Unix-like: run opencode directly
      const childProcess = spawn(command, args, {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: isWindows,
      });

      if (!childProcess.pid) {
        throw new Error(
          "Failed to start OpenCode server process. Ensure 'opencode' is installed and available in PATH.",
        );
      }

      // Setup event handlers
      childProcess.on("error", (err) => {
        logger.error("[ProcessManager] Process error:", err);
        this.cleanup();
      });

      childProcess.on("exit", (code, signal) => {
        logger.info(`[ProcessManager] Process exited: code=${code}, signal=${signal}`);
        this.cleanup();
      });

      // Log stdout/stderr
      if (childProcess.stdout) {
        childProcess.stdout.on("data", (data) => {
          logger.debug(`[OpenCode Server] ${data.toString().trim()}`);
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on("data", (data) => {
          logger.warn(`[OpenCode Server Error] ${data.toString().trim()}`);
        });
      }

      // Save state in memory
      const startTime = new Date();
      this.state = {
        process: childProcess,
        pid: childProcess.pid,
        startTime,
        isRunning: true,
      };

      // Persist to settings.json
      setServerProcess({
        pid: childProcess.pid,
        startTime: startTime.toISOString(),
      });

      logger.info(`[ProcessManager] OpenCode server started with PID=${childProcess.pid}`);

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("[ProcessManager] Failed to start process:", err);
      this.cleanup();
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Stop the OpenCode server process
   * Sends SIGINT (Ctrl+C) and waits for graceful shutdown
   * Falls back to SIGKILL if timeout is exceeded
   */
  async stop(timeoutMs: number = 5000): Promise<ProcessOperationResult> {
    if (!this.state.isRunning || !this.state.pid) {
      return {
        success: false,
        error: "Process not running",
      };
    }

    try {
      const pid = this.state.pid;
      logger.info(`[ProcessManager] Stopping process PID=${pid}...`);

      // On Windows, use taskkill to kill the entire process tree
      // This is necessary because cmd.exe spawns child processes
      if (process.platform === "win32") {
        try {
          // /F = force terminate, /T = terminate tree, /PID = process id
          logger.debug(`[ProcessManager] Using taskkill to terminate process tree for PID=${pid}`);
          await execAsync(`taskkill /F /T /PID ${pid}`);
          logger.info(`[ProcessManager] Process tree terminated successfully for PID=${pid}`);
        } catch (err) {
          // taskkill returns error if process not found, which is ok
          const error = err as Error & { code?: number };
          if (error.message?.includes("not found")) {
            logger.debug(`[ProcessManager] Process PID=${pid} already terminated`);
          } else {
            logger.warn(`[ProcessManager] taskkill error for PID=${pid}:`, err);
          }
        }

        // Wait a bit for cleanup
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Unix-like systems: use SIGINT/SIGKILL
        if (this.state.process) {
          const childProcess = this.state.process;

          // Send SIGINT (Ctrl+C)
          logger.debug(`[ProcessManager] Sending SIGINT to PID=${pid}`);
          childProcess.kill("SIGINT");

          // Wait for graceful shutdown
          const gracefulExit = await this.waitForProcessExit(childProcess, timeoutMs);

          if (!gracefulExit && this.state.isRunning) {
            logger.warn(`[ProcessManager] Graceful shutdown failed, sending SIGKILL to PID=${pid}`);
            childProcess.kill("SIGKILL");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } else {
          // No ChildProcess reference (recovered from settings)
          logger.debug(`[ProcessManager] Sending SIGTERM to PID=${pid}`);
          try {
            process.kill(pid, "SIGTERM");
          } catch (err) {
            logger.debug(`[ProcessManager] Failed to send SIGTERM to PID=${pid}:`, err);
          }

          // Wait for process to die
          await new Promise((resolve) => setTimeout(resolve, timeoutMs));

          // Check if still alive
          if (this.isProcessAlive(pid)) {
            logger.warn(`[ProcessManager] Graceful shutdown failed, sending SIGKILL to PID=${pid}`);
            try {
              process.kill(pid, "SIGKILL");
            } catch (err) {
              logger.error(`[ProcessManager] Failed to send SIGKILL to PID=${pid}:`, err);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      this.cleanup();
      logger.info(`[ProcessManager] Process PID=${pid} stopped successfully`);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("[ProcessManager] Failed to stop process:", err);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if the process is running
   * Validates that the process with stored PID is actually alive
   */
  isRunning(): boolean {
    if (!this.state.isRunning || !this.state.pid) {
      return false;
    }

    // Verify that the process is actually alive
    if (!this.isProcessAlive(this.state.pid)) {
      logger.warn(`[ProcessManager] Process PID=${this.state.pid} appears dead, cleaning up`);
      this.cleanup();
      return false;
    }

    return true;
  }

  /**
   * Get the process ID of the running server
   */
  getPID(): number | null {
    return this.state.pid;
  }

  /**
   * Get the uptime of the server in milliseconds
   */
  getUptime(): number | null {
    if (!this.state.startTime || !this.state.isRunning) {
      return null;
    }
    return Date.now() - this.state.startTime.getTime();
  }

  /**
   * Check if a process with given PID is alive
   * Uses process.kill(pid, 0) which checks existence without killing
   */
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for process to exit
   */
  private async waitForProcessExit(
    childProcess: ChildProcess,
    timeoutMs: number,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const exitHandler = () => {
        logger.debug("[ProcessManager] Process exited gracefully");
        resolve(true);
      };

      childProcess.once("exit", exitHandler);

      setTimeout(() => {
        childProcess.removeListener("exit", exitHandler);
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * Clean up state and settings
   */
  private cleanup(): void {
    this.state = {
      process: null,
      pid: null,
      startTime: null,
      isRunning: false,
    };
    clearServerProcess();
  }
}

// Export singleton instance
export const processManager = new ProcessManager();

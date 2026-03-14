import type { ChildProcess } from "child_process";

/**
 * Internal state of the ProcessManager
 */
export interface ProcessState {
  process: ChildProcess | null;
  pid: number | null;
  startTime: Date | null;
  isRunning: boolean;
}

/**
 * Result of process start and stop operations
 */
export interface ProcessOperationResult {
  success: boolean;
  error?: string;
}

/**
 * ProcessManager interface for managing OpenCode server process
 */
export interface ProcessManagerInterface {
  /**
   * Initialize the manager by restoring state from settings
   * Should be called on bot startup
   */
  initialize(): Promise<void>;

  /**
   * Start the OpenCode server process
   * Saves PID to settings.json for recovery after bot restart
   */
  start(): Promise<ProcessOperationResult>;

  /**
   * Stop the OpenCode server process
   * Clears PID from settings.json
   * @param timeoutMs - Graceful shutdown timeout in milliseconds (default: 5000)
   */
  stop(timeoutMs?: number): Promise<ProcessOperationResult>;

  /**
   * Check if the process is running
   * Validates that the process with stored PID is actually alive
   */
  isRunning(): boolean;

  /**
   * Get the process ID of the running server
   */
  getPID(): number | null;

  /**
   * Get the uptime of the server in milliseconds
   */
  getUptime(): number | null;
}

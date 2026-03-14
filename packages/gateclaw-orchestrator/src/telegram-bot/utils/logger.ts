import { config } from "../config.js";

/**
 * Available log levels in order of severity
 * Lower numbers indicate lower severity (more verbose)
 */
type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Mapping of log levels to numeric values for comparison
 * Used to determine if a message should be logged based on configured level
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Normalizes a string value to a valid LogLevel
 * Falls back to 'info' if the value is invalid
 *
 * @param value - The log level string to normalize
 * @returns A valid LogLevel
 */
function normalizeLogLevel(value: string): LogLevel {
  if (value in LOG_LEVELS) {
    return value as LogLevel;
  }

  return "info";
}

/**
 * Formats the log message prefix with timestamp and level
 *
 * @param level - The log level for the message
 * @returns Formatted prefix string
 */
function formatPrefix(level: LogLevel): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
}

/**
 * Formats individual arguments for logging
 * Special handling for Error objects to extract stack trace
 *
 * @param arg - The argument to format
 * @returns Formatted argument
 */
function formatArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return arg.stack ?? `${arg.name}: ${arg.message}`;
  }

  return arg;
}

/**
 * Prepends formatted prefix to log arguments
 * Handles different argument formats (string vs non-string first argument)
 *
 * @param level - The log level for prefix formatting
 * @param args - The arguments to log
 * @returns Array with prefix prepended
 */
function withPrefix(level: LogLevel, args: unknown[]): unknown[] {
  const formattedArgs = args.map((arg) => formatArg(arg));
  const prefix = formatPrefix(level);

  if (formattedArgs.length === 0) {
    return [prefix];
  }

  if (typeof formattedArgs[0] === "string") {
    return [`${prefix} ${formattedArgs[0]}`, ...formattedArgs.slice(1)];
  }

  return [prefix, ...formattedArgs];
}

/**
 * Determines if a message should be logged based on configured log level
 * Messages with level >= configured level will be logged
 *
 * @param level - The level of the message to check
 * @returns True if the message should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const configLevel = normalizeLogLevel(config.server.logLevel);
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
}

/**
 * Logger interface with methods for different log levels
 * Each method checks if the message should be logged based on configured level
 * and formats the output with timestamp and level prefix
 */
export const logger = {
  /**
   * Logs debug-level messages (most verbose)
   * Used for detailed diagnostics and internal operations
   *
   * @param args - Arguments to log
   */
  debug: (...args: unknown[]): void => {
    if (shouldLog("debug")) {
      console.log(...withPrefix("debug", args));
    }
  },

  /**
   * Logs info-level messages
   * Used for important events and general information
   *
   * @param args - Arguments to log
   */
  info: (...args: unknown[]): void => {
    if (shouldLog("info")) {
      console.log(...withPrefix("info", args));
    }
  },

  /**
   * Logs warning-level messages
   * Used for recoverable errors and potential issues
   *
   * @param args - Arguments to log
   */
  warn: (...args: unknown[]): void => {
    if (shouldLog("warn")) {
      console.warn(...withPrefix("warn", args));
    }
  },

  /**
   * Logs error-level messages
   * Used for critical failures and exceptions
   *
   * @param args - Arguments to log
   */
  error: (...args: unknown[]): void => {
    if (shouldLog("error")) {
      console.error(...withPrefix("error", args));
    }
  },
};

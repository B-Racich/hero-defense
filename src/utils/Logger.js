/**
 * Logging utility with configurable levels
 */
export class Logger {
    /**
     * @param {string} module - Module name for this logger
     */
    constructor(module) {
      this.module = module;
      this.enabled = true; // Can be disabled to mute a specific logger
    }
    
    /**
     * Global log level setting
     * 0 = OFF
     * 1 = ERROR
     * 2 = WARN
     * 3 = INFO
     * 4 = DEBUG
     */
    static logLevel = 3; // Default to INFO
    
    /**
     * Whether to include timestamps in logs
     */
    static showTimestamps = true;
    
    /**
     * Whether to include module names in logs
     */
    static showModuleNames = true;
    
    /**
     * Format a log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @returns {string} Formatted message
     */
    formatMessage(level, message) {
      const parts = [];
      
      // Add timestamp if enabled
      if (Logger.showTimestamps) {
        parts.push(`[${new Date().toISOString()}]`);
      }
      
      // Add level
      parts.push(`[${level}]`);
      
      // Add module name if enabled
      if (Logger.showModuleNames) {
        parts.push(`[${this.module}]`);
      }
      
      // Add message
      parts.push(message);
      
      return parts.join(' ');
    }
    
    /**
     * Log an error message
     * @param {string} message - Log message
     * @param {*} error - Optional error object
     */
    error(message, error = null) {
      if (!this.enabled || Logger.logLevel < 1) return;
      
      const formattedMessage = this.formatMessage('ERROR', message);
      console.error(formattedMessage);
      
      if (error) {
        console.error(error);
      }
    }
    
    /**
     * Log a warning message
     * @param {string} message - Log message
     */
    warn(message) {
      if (!this.enabled || Logger.logLevel < 2) return;
      
      const formattedMessage = this.formatMessage('WARN', message);
      console.warn(formattedMessage);
    }
    
    /**
     * Log an info message
     * @param {string} message - Log message
     */
    info(message) {
      if (!this.enabled || Logger.logLevel < 3) return;
      
      const formattedMessage = this.formatMessage('INFO', message);
      console.info(formattedMessage);
    }
    
    /**
     * Log a debug message
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    debug(message, data = null) {
      if (!this.enabled || Logger.logLevel < 4) return;
      
      const formattedMessage = this.formatMessage('DEBUG', message);
      
      if (data) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
    }
    
    /**
     * Enable or disable this logger
     * @param {boolean} enabled - Whether the logger is enabled
     */
    setEnabled(enabled) {
      this.enabled = enabled;
    }
    
    /**
     * Set the global log level
     * @param {number} level - Log level (0-4)
     */
    static setLogLevel(level) {
      Logger.logLevel = Math.max(0, Math.min(4, level));
    }
  }
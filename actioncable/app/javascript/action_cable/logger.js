const logger = {
  logger: self.console,
  enabled: false,
}

export function log(...messages) {
  if (logger.enabled) {
    messages.push(Date.now())
    logger.logger.log("[ActionCable]", ...messages)
  }
}

export { logger }

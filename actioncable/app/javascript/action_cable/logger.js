let enabled = false
let logger = window.console

export function log(...messages) {
  if (enabled) {
    messages.push(Date.now())
    logger.log("[ActionCable]", ...messages)
  }
}

export function setLogger(newLogger) {
  logger = newLogger
}

export function startDebugging() {
  enabled = true
}

export function stopDebugging() {
  enabled = false
}

export { logger }

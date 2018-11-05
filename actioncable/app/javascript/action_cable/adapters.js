let adapters

if (typeof self !== "undefined") {
  adapters = {
    logger: self.console,
    WebSocket: self.WebSocket
  }
} else {
  adapters = {}
}

export default adapters

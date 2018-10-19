import adapters from "./adapters"
import ConnectionMonitor from "./connection_monitor"
import INTERNAL from "./internal"
import { log } from "./logger"

// Encapsulate the cable connection held by the consumer. This is an internal class not intended for direct user manipulation.

const {message_types, protocols} = INTERNAL
const supportedProtocols = protocols.slice(0, protocols.length - 1)

const indexOf = [].indexOf

class Connection {
  constructor(consumer) {
    this.open = this.open.bind(this)
    this.consumer = consumer
    this.subscriptions = this.consumer.subscriptions
    this.monitor = new ConnectionMonitor(this)
    this.disconnected = true
  }

  send(data) {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data))
      return true
    } else {
      return false
    }
  }

  open() {
    if (this.isActive()) {
      log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`)
      return false
    } else {
      log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`)
      if (this.webSocket) { this.uninstallEventHandlers() }
      this.webSocket = new adapters.WebSocket(this.consumer.url, protocols)
      this.installEventHandlers()
      this.monitor.start()
      return true
    }
  }

  close({allowReconnect} = {allowReconnect: true}) {
    if (!allowReconnect) { this.monitor.stop() }
    if (this.isActive()) { return (this.webSocket ? this.webSocket.close() : undefined) }
  }

  reopen() {
    log(`Reopening WebSocket, current state is ${this.getState()}`)
    if (this.isActive()) {
      try {
        return this.close()
      } catch (error) {
        log("Failed to reopen WebSocket", error)
      }
      finally {
        log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`)
        setTimeout(this.open, this.constructor.reopenDelay)
      }
    } else {
      return this.open()
    }
  }

  getProtocol() {
    return (this.webSocket ? this.webSocket.protocol : undefined)
  }

  isOpen() {
    return this.isState("open")
  }

  isActive() {
    return this.isState("open", "connecting")
  }

  // Private

  isProtocolSupported() {
    return indexOf.call(supportedProtocols, this.getProtocol()) >= 0
  }

  isState(...states) {
    return indexOf.call(states, this.getState()) >= 0
  }

  getState() {
    for (let state in adapters.WebSocket) {
      const value = adapters.WebSocket[state]

      if (value === (this.webSocket ? this.webSocket.readyState : undefined)) {
        return state.toLowerCase()
      }
    }
    return null
  }

  installEventHandlers() {
    for (let eventName in this.events) {
      const handler = this.events[eventName].bind(this)
      this.webSocket[`on${eventName}`] = handler
    }
  }

  uninstallEventHandlers() {
    for (let eventName in this.events) {
      this.webSocket[`on${eventName}`] = function() {}
    }
  }

}

Connection.reopenDelay = 500

Connection.prototype.events = {
  message(event) {
    if (!this.isProtocolSupported()) { return }
    const {identifier, message, type} = JSON.parse(event.data)
    switch (type) {
      case message_types.welcome:
        this.monitor.recordConnect()
        return this.subscriptions.reload()
      case message_types.ping:
        return this.monitor.recordPing()
      case message_types.confirmation:
        return this.subscriptions.notify(identifier, "connected")
      case message_types.rejection:
        return this.subscriptions.reject(identifier)
      default:
        return this.subscriptions.notify(identifier, "received", message)
    }
  },

  open() {
    log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
    this.disconnected = false
    if (!this.isProtocolSupported()) {
      log("Protocol is unsupported. Stopping monitor and disconnecting.")
      return this.close({allowReconnect: false})
    }
  },

  close(event) {
    log("WebSocket onclose event")
    if (this.disconnected) { return }
    this.disconnected = true
    this.monitor.recordDisconnect()
    return this.subscriptions.notifyAll("disconnected", {willAttemptReconnect: this.monitor.isRunning()})
  },

  error() {
    log("WebSocket onerror event")
  }
}

export default Connection

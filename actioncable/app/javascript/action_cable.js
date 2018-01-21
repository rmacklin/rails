import Connection from "./action_cable/connection"
import ConnectionMonitor from "./action_cable/connection_monitor"
import Consumer from "./action_cable/consumer"
import INTERNAL from "./action_cable/internal"
import Subscription from "./action_cable/subscription"
import Subscriptions from "./action_cable/subscriptions"

const ActionCable = {
  INTERNAL,
  WebSocket: window.WebSocket,
  logger: window.console,

  createConsumer(url) {
    if (url == null) {
      const urlConfig = this.getConfig("url")
      url = (urlConfig ? urlConfig : this.INTERNAL.default_mount_path)
    }
    return new Consumer(this.createWebSocketURL(url))
  },

  getConfig(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`)
    return (element ? element.getAttribute("content") : undefined)
  },

  createWebSocketURL(url) {
    if (url && !/^wss?:/i.test(url)) {
      const a = document.createElement("a")
      a.href = url
      // Fix populating Location properties in IE. Otherwise, protocol will be blank.
      a.href = a.href
      a.protocol = a.protocol.replace("http", "ws")
      return a.href
    } else {
      return url
    }
  },

  startDebugging() {
    this.debugging = true
  },

  stopDebugging() {
    this.debugging = null
  },

  log(...messages) {
    if (this.debugging) {
      messages.push(Date.now())
      this.logger.log("[ActionCable]", ...messages)
    }
  }
}

ActionCable.Connection = Connection
ActionCable.ConnectionMonitor = ConnectionMonitor
ActionCable.Consumer = Consumer
ActionCable.Subscription = Subscription
ActionCable.Subscriptions = Subscriptions

export default ActionCable

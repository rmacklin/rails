import Consumer from "./consumer"
import INTERNAL from "./internal"

export default {
  WebSocket: window.WebSocket,

  createConsumer(url) {
    if (url == null) {
      const urlConfig = this.getConfig("url")
      url = (urlConfig ? urlConfig : INTERNAL.default_mount_path)
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
  }
}

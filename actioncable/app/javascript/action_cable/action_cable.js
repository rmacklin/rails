import Connection from "./connection"
import ConnectionMonitor from "./connection_monitor"
import Consumer from "./consumer"
import INTERNAL from "./internal"
import { log, logger } from "./logger"
import Subscription from "./subscription"
import Subscriptions from "./subscriptions"

export function getConfig(name) {
  const element = document.head.querySelector(`meta[name='action-cable-${name}']`)
  return (element ? element.getAttribute("content") : undefined)
}

export function createWebSocketURL(url) {
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

export function createConsumer(url, { getConfig = getConfig, createWebSocketURL = createWebSocketURL }) {
  if (url == null) {
    const urlConfig = getConfig("url")
    url = (urlConfig ? urlConfig : INTERNAL.default_mount_path)
  }
  return new Consumer(createWebSocketURL(url))
}

export function startDebugging() {
  logger.enabled = true
}

export function stopDebugging() {
  logger.enabled = false
}

export { Connection, ConnectionMonitor, Consumer, INTERNAL, log, Subscription, Subscriptions }

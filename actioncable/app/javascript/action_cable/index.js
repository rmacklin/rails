import ActionCable from "./action_cable"
import Connection from "./connection"
import ConnectionMonitor from "./connection_monitor"
import Consumer from "./consumer"
import INTERNAL from "./internal"
import { log, logger, setLogger, startDebugging, stopDebugging } from "./logger"
import Subscription from "./subscription"
import Subscriptions from "./subscriptions"
import { setAdapter, WebSocketAdapter } from "./websocket_adapter"

Object.defineProperties(ActionCable, {
  WebSocket: {
    get() { return WebSocketAdapter },
    set(value) { setAdapter(value) }
  },
  logger: {
    get() { return logger },
    set(value) { setLogger(value) }
  }
})

ActionCable.Connection = Connection
ActionCable.ConnectionMonitor = ConnectionMonitor
ActionCable.Consumer = Consumer
ActionCable.INTERNAL = INTERNAL
ActionCable.log = log
ActionCable.startDebugging = startDebugging
ActionCable.stopDebugging = stopDebugging
ActionCable.Subscription = Subscription
ActionCable.Subscriptions = Subscriptions

export default ActionCable

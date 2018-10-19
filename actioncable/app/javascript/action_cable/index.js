import { ActionCable, createConsumer, createWebSocketURL, getConfig, startDebugging, stopDebugging } from "./action_cable"
import Connection from "./connection"
import ConnectionMonitor from "./connection_monitor"
import Consumer from "./consumer"
import INTERNAL from "./internal"
import { log, logger } from "./logger"
import Subscription from "./subscription"
import Subscriptions from "./subscriptions"

ActionCable.createConsumer = createConsumer
ActionCable.createWebSocketURL = createWebSocketURL
ActionCable.Connection = Connection
ActionCable.ConnectionMonitor = ConnectionMonitor
ActionCable.Consumer = Consumer
ActionCable.getConfig = getConfig
ActionCable.INTERNAL = INTERNAL
ActionCable.log = log
ActionCable.startDebugging = startDebugging
ActionCable.stopDebugging = stopDebugging
ActionCable.Subscription = Subscription
ActionCable.Subscriptions = Subscriptions

Object.defineProperties(ActionCable, {
  logger: {
    get() { return logger.logger },
    set(value) { logger.logger = value }
  }
})

export default ActionCable

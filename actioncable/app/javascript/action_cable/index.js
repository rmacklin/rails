import * as ActionCable from "./action_cable"
import adapters from "./adapters"
import { logger } from "./logger"

export default Object.defineProperties(Object.create(ActionCable), {
  logger: {
    get() { return logger.logger },
    set(value) { logger.logger = value }
  },
  WebSocket: {
    get() { return adapters.WebSocket },
    set(value) { adapters.WebSocket = value }
  }
})

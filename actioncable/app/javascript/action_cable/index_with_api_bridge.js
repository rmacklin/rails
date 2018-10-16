// This file provides a bridge between the module-based ActionCable API and the
// previous API. The compiled bundle is built from this bridge so that existing
// applications won't need to be modified to use ActionCable v6.0. Those who
// switch to using the ActionCable source directly can avoid the bloat of this
// bridge.

import ActionCable from "./index"
import { log, logger, setLogger, startDebugging, stopDebugging } from "./logger"
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

ActionCable.log = log
ActionCable.startDebugging = startDebugging
ActionCable.stopDebugging = stopDebugging

export default ActionCable

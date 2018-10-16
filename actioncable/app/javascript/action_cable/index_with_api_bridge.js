// This file provides a bridge between the module-based ActionCable API and the
// previous API. The compiled bundle is built from this bridge so that existing
// applications won't need to be modified to use ActionCable v6.0. However,
// users who upgrade and switch to using the ActionCable ES2015 module-based
// source directly will avoid the bloat of this bridge - and if they use a
// tree-shaking bundler then their application will not include functions they
// never use (e.g. startDebugging and stopDebugging).

import ActionCable from "./index"
import INTERNAL from "./internal"
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

ActionCable.INTERNAL = INTERNAL
ActionCable.log = log
ActionCable.startDebugging = startDebugging
ActionCable.stopDebugging = stopDebugging

export default ActionCable

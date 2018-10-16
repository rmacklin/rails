let WebSocketAdapter = window.WebSocket

export function setAdapter(adapter) {
  WebSocketAdapter = adapter
}

export { WebSocketAdapter }

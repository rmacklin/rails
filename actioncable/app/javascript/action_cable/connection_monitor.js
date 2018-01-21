import ActionCable from "../action_cable"

// Responsible for ensuring the cable connection is in good health by validating the heartbeat pings sent from the server, and attempting
// revival reconnections if things go astray. Internal class, not intended for direct user manipulation.

const now = () => new Date().getTime()

const secondsSince = time => (now() - time) / 1000

const clamp = (number, min, max) => Math.max(min, Math.min(max, number))

class ConnectionMonitor {
  constructor(connection) {
    this.visibilityDidChange = this.visibilityDidChange.bind(this)
    this.connection = connection
    this.reconnectAttempts = 0
  }

  start() {
    if (!this.isRunning()) {
      this.startedAt = now()
      delete this.stoppedAt
      this.startPolling()
      document.addEventListener("visibilitychange", this.visibilityDidChange)
      ActionCable.log(`ConnectionMonitor started. pollInterval = ${this.getPollInterval()} ms`)
    }
  }

  stop() {
    if (this.isRunning()) {
      this.stoppedAt = now()
      this.stopPolling()
      document.removeEventListener("visibilitychange", this.visibilityDidChange)
      ActionCable.log("ConnectionMonitor stopped")
    }
  }

  isRunning() {
    return this.startedAt && !this.stoppedAt
  }

  recordPing() {
    this.pingedAt = now()
  }

  recordConnect() {
    this.reconnectAttempts = 0
    this.recordPing()
    delete this.disconnectedAt
    ActionCable.log("ConnectionMonitor recorded connect")
  }

  recordDisconnect() {
    this.disconnectedAt = now()
    ActionCable.log("ConnectionMonitor recorded disconnect")
  }

  // Private

  startPolling() {
    this.stopPolling()
    this.poll()
  }

  stopPolling() {
    clearTimeout(this.pollTimeout)
  }

  poll() {
    this.pollTimeout = setTimeout(() => {
      this.reconnectIfStale()
      this.poll()
    }
    , this.getPollInterval())
  }

  getPollInterval() {
    const {min, max} = this.constructor.pollInterval
    const interval = 5 * Math.log(this.reconnectAttempts + 1)
    return Math.round(clamp(interval, min, max) * 1000)
  }

  reconnectIfStale() {
    if (this.connectionIsStale()) {
      ActionCable.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, pollInterval = ${this.getPollInterval()} ms, time disconnected = ${secondsSince(this.disconnectedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`)
      this.reconnectAttempts++
      if (this.disconnectedRecently()) {
        ActionCable.log("ConnectionMonitor skipping reopening recent disconnect")
      } else {
        ActionCable.log("ConnectionMonitor reopening")
        this.connection.reopen()
      }
    }
  }

  connectionIsStale() {
    return secondsSince(this.pingedAt ? this.pingedAt : this.startedAt) > this.constructor.staleThreshold
  }

  disconnectedRecently() {
    return this.disconnectedAt && (secondsSince(this.disconnectedAt) < this.constructor.staleThreshold)
  }

  visibilityDidChange() {
    if (document.visibilityState === "visible") {
      setTimeout(() => {
        if (this.connectionIsStale() || !this.connection.isOpen()) {
          ActionCable.log(`ConnectionMonitor reopening stale connection on visibilitychange. visbilityState = ${document.visibilityState}`)
          this.connection.reopen()
        }
      }
      , 200)
    }
  }

}

ConnectionMonitor.pollInterval = {
  min: 3,
  max: 30
}

ConnectionMonitor.staleThreshold = 6 // Server::Connections::BEAT_INTERVAL * 2 (missed two pings)

export default ConnectionMonitor

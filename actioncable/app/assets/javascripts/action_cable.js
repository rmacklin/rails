(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.ActionCable = factory();
})(this, function() {
  "use strict";
  var enabled = false;
  var logger = window.console;
  function log() {
    if (enabled) {
      var _logger;
      for (var _len = arguments.length, messages = Array(_len), _key = 0; _key < _len; _key++) {
        messages[_key] = arguments[_key];
      }
      messages.push(Date.now());
      (_logger = logger).log.apply(_logger, [ "[ActionCable]" ].concat(messages));
    }
  }
  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
    return typeof obj;
  } : function(obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };
  var classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var createClass = function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();
  var now = function now() {
    return new Date().getTime();
  };
  var secondsSince = function secondsSince(time) {
    return (now() - time) / 1e3;
  };
  var clamp = function clamp(number, min, max) {
    return Math.max(min, Math.min(max, number));
  };
  var ConnectionMonitor = function() {
    function ConnectionMonitor(connection) {
      classCallCheck(this, ConnectionMonitor);
      this.visibilityDidChange = this.visibilityDidChange.bind(this);
      this.connection = connection;
      this.reconnectAttempts = 0;
    }
    createClass(ConnectionMonitor, [ {
      key: "start",
      value: function start() {
        if (!this.isRunning()) {
          this.startedAt = now();
          delete this.stoppedAt;
          this.startPolling();
          document.addEventListener("visibilitychange", this.visibilityDidChange);
          log("ConnectionMonitor started. pollInterval = " + this.getPollInterval() + " ms");
        }
      }
    }, {
      key: "stop",
      value: function stop() {
        if (this.isRunning()) {
          this.stoppedAt = now();
          this.stopPolling();
          document.removeEventListener("visibilitychange", this.visibilityDidChange);
          log("ConnectionMonitor stopped");
        }
      }
    }, {
      key: "isRunning",
      value: function isRunning() {
        return this.startedAt && !this.stoppedAt;
      }
    }, {
      key: "recordPing",
      value: function recordPing() {
        this.pingedAt = now();
      }
    }, {
      key: "recordConnect",
      value: function recordConnect() {
        this.reconnectAttempts = 0;
        this.recordPing();
        delete this.disconnectedAt;
        log("ConnectionMonitor recorded connect");
      }
    }, {
      key: "recordDisconnect",
      value: function recordDisconnect() {
        this.disconnectedAt = now();
        log("ConnectionMonitor recorded disconnect");
      }
    }, {
      key: "startPolling",
      value: function startPolling() {
        this.stopPolling();
        this.poll();
      }
    }, {
      key: "stopPolling",
      value: function stopPolling() {
        clearTimeout(this.pollTimeout);
      }
    }, {
      key: "poll",
      value: function poll() {
        var _this = this;
        this.pollTimeout = setTimeout(function() {
          _this.reconnectIfStale();
          _this.poll();
        }, this.getPollInterval());
      }
    }, {
      key: "getPollInterval",
      value: function getPollInterval() {
        var _constructor$pollInte = this.constructor.pollInterval, min = _constructor$pollInte.min, max = _constructor$pollInte.max;
        var interval = 5 * Math.log(this.reconnectAttempts + 1);
        return Math.round(clamp(interval, min, max) * 1e3);
      }
    }, {
      key: "reconnectIfStale",
      value: function reconnectIfStale() {
        if (this.connectionIsStale()) {
          log("ConnectionMonitor detected stale connection. reconnectAttempts = " + this.reconnectAttempts + ", pollInterval = " + this.getPollInterval() + " ms, time disconnected = " + secondsSince(this.disconnectedAt) + " s, stale threshold = " + this.constructor.staleThreshold + " s");
          this.reconnectAttempts++;
          if (this.disconnectedRecently()) {
            log("ConnectionMonitor skipping reopening recent disconnect");
          } else {
            log("ConnectionMonitor reopening");
            this.connection.reopen();
          }
        }
      }
    }, {
      key: "connectionIsStale",
      value: function connectionIsStale() {
        return secondsSince(this.pingedAt ? this.pingedAt : this.startedAt) > this.constructor.staleThreshold;
      }
    }, {
      key: "disconnectedRecently",
      value: function disconnectedRecently() {
        return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
      }
    }, {
      key: "visibilityDidChange",
      value: function visibilityDidChange() {
        var _this2 = this;
        if (document.visibilityState === "visible") {
          setTimeout(function() {
            if (_this2.connectionIsStale() || !_this2.connection.isOpen()) {
              log("ConnectionMonitor reopening stale connection on visibilitychange. visbilityState = " + document.visibilityState);
              _this2.connection.reopen();
            }
          }, 200);
        }
      }
    } ]);
    return ConnectionMonitor;
  }();
  ConnectionMonitor.pollInterval = {
    min: 3,
    max: 30
  };
  ConnectionMonitor.staleThreshold = 6;
  var INTERNAL = {
    message_types: {
      welcome: "welcome",
      ping: "ping",
      confirmation: "confirm_subscription",
      rejection: "reject_subscription"
    },
    default_mount_path: "/cable",
    protocols: [ "actioncable-v1-json", "actioncable-unsupported" ]
  };
  var WebSocketAdapter = window.WebSocket;
  var message_types = INTERNAL.message_types, protocols = INTERNAL.protocols;
  var supportedProtocols = protocols.slice(0, protocols.length - 1);
  var indexOf = [].indexOf;
  var Connection = function() {
    function Connection(consumer) {
      classCallCheck(this, Connection);
      this.open = this.open.bind(this);
      this.consumer = consumer;
      this.subscriptions = this.consumer.subscriptions;
      this.monitor = new ConnectionMonitor(this);
      this.disconnected = true;
    }
    createClass(Connection, [ {
      key: "send",
      value: function send(data) {
        if (this.isOpen()) {
          this.webSocket.send(JSON.stringify(data));
          return true;
        } else {
          return false;
        }
      }
    }, {
      key: "open",
      value: function open() {
        if (this.isActive()) {
          log("Attempted to open WebSocket, but existing socket is " + this.getState());
          return false;
        } else {
          log("Opening WebSocket, current state is " + this.getState() + ", subprotocols: " + protocols);
          if (this.webSocket) {
            this.uninstallEventHandlers();
          }
          this.webSocket = new WebSocketAdapter(this.consumer.url, protocols);
          this.installEventHandlers();
          this.monitor.start();
          return true;
        }
      }
    }, {
      key: "close",
      value: function close() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
          allowReconnect: true
        }, allowReconnect = _ref.allowReconnect;
        if (!allowReconnect) {
          this.monitor.stop();
        }
        if (this.isActive()) {
          return this.webSocket ? this.webSocket.close() : undefined;
        }
      }
    }, {
      key: "reopen",
      value: function reopen() {
        log("Reopening WebSocket, current state is " + this.getState());
        if (this.isActive()) {
          try {
            return this.close();
          } catch (error) {
            log("Failed to reopen WebSocket", error);
          } finally {
            log("Reopening WebSocket in " + this.constructor.reopenDelay + "ms");
            setTimeout(this.open, this.constructor.reopenDelay);
          }
        } else {
          return this.open();
        }
      }
    }, {
      key: "getProtocol",
      value: function getProtocol() {
        return this.webSocket ? this.webSocket.protocol : undefined;
      }
    }, {
      key: "isOpen",
      value: function isOpen() {
        return this.isState("open");
      }
    }, {
      key: "isActive",
      value: function isActive() {
        return this.isState("open", "connecting");
      }
    }, {
      key: "isProtocolSupported",
      value: function isProtocolSupported() {
        return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
      }
    }, {
      key: "isState",
      value: function isState() {
        for (var _len = arguments.length, states = Array(_len), _key = 0; _key < _len; _key++) {
          states[_key] = arguments[_key];
        }
        return indexOf.call(states, this.getState()) >= 0;
      }
    }, {
      key: "getState",
      value: function getState() {
        for (var state in WebSocketAdapter) {
          var value = WebSocketAdapter[state];
          if (value === (this.webSocket ? this.webSocket.readyState : undefined)) {
            return state.toLowerCase();
          }
        }
        return null;
      }
    }, {
      key: "installEventHandlers",
      value: function installEventHandlers() {
        for (var eventName in this.events) {
          var handler = this.events[eventName].bind(this);
          this.webSocket["on" + eventName] = handler;
        }
      }
    }, {
      key: "uninstallEventHandlers",
      value: function uninstallEventHandlers() {
        for (var eventName in this.events) {
          this.webSocket["on" + eventName] = function() {};
        }
      }
    } ]);
    return Connection;
  }();
  Connection.reopenDelay = 500;
  Connection.prototype.events = {
    message: function message(event) {
      if (!this.isProtocolSupported()) {
        return;
      }
      var _JSON$parse = JSON.parse(event.data), identifier = _JSON$parse.identifier, message = _JSON$parse.message, type = _JSON$parse.type;
      switch (type) {
       case message_types.welcome:
        this.monitor.recordConnect();
        return this.subscriptions.reload();

       case message_types.ping:
        return this.monitor.recordPing();

       case message_types.confirmation:
        return this.subscriptions.notify(identifier, "connected");

       case message_types.rejection:
        return this.subscriptions.reject(identifier);

       default:
        return this.subscriptions.notify(identifier, "received", message);
      }
    },
    open: function open() {
      log("WebSocket onopen event, using '" + this.getProtocol() + "' subprotocol");
      this.disconnected = false;
      if (!this.isProtocolSupported()) {
        log("Protocol is unsupported. Stopping monitor and disconnecting.");
        return this.close({
          allowReconnect: false
        });
      }
    },
    close: function close(event) {
      log("WebSocket onclose event");
      if (this.disconnected) {
        return;
      }
      this.disconnected = true;
      this.monitor.recordDisconnect();
      return this.subscriptions.notifyAll("disconnected", {
        willAttemptReconnect: this.monitor.isRunning()
      });
    },
    error: function error() {
      log("WebSocket onerror event");
    }
  };
  var extend = function extend(object, properties) {
    if (properties != null) {
      for (var key in properties) {
        var value = properties[key];
        object[key] = value;
      }
    }
    return object;
  };
  var Subscription = function() {
    function Subscription(consumer) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var mixin = arguments[2];
      classCallCheck(this, Subscription);
      this.consumer = consumer;
      this.identifier = JSON.stringify(params);
      extend(this, mixin);
    }
    createClass(Subscription, [ {
      key: "perform",
      value: function perform(action) {
        var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        data.action = action;
        return this.send(data);
      }
    }, {
      key: "send",
      value: function send(data) {
        return this.consumer.send({
          command: "message",
          identifier: this.identifier,
          data: JSON.stringify(data)
        });
      }
    }, {
      key: "unsubscribe",
      value: function unsubscribe() {
        return this.consumer.subscriptions.remove(this);
      }
    } ]);
    return Subscription;
  }();
  var Subscriptions = function() {
    function Subscriptions(consumer) {
      classCallCheck(this, Subscriptions);
      this.consumer = consumer;
      this.subscriptions = [];
    }
    createClass(Subscriptions, [ {
      key: "create",
      value: function create(channelName, mixin) {
        var channel = channelName;
        var params = (typeof channel === "undefined" ? "undefined" : _typeof(channel)) === "object" ? channel : {
          channel: channel
        };
        var subscription = new Subscription(this.consumer, params, mixin);
        return this.add(subscription);
      }
    }, {
      key: "add",
      value: function add(subscription) {
        this.subscriptions.push(subscription);
        this.consumer.ensureActiveConnection();
        this.notify(subscription, "initialized");
        this.sendCommand(subscription, "subscribe");
        return subscription;
      }
    }, {
      key: "remove",
      value: function remove(subscription) {
        this.forget(subscription);
        if (!this.findAll(subscription.identifier).length) {
          this.sendCommand(subscription, "unsubscribe");
        }
        return subscription;
      }
    }, {
      key: "reject",
      value: function reject(identifier) {
        var _this = this;
        return this.findAll(identifier).map(function(subscription) {
          _this.forget(subscription);
          _this.notify(subscription, "rejected");
          return subscription;
        });
      }
    }, {
      key: "forget",
      value: function forget(subscription) {
        this.subscriptions = this.subscriptions.filter(function(s) {
          return s !== subscription;
        });
        return subscription;
      }
    }, {
      key: "findAll",
      value: function findAll(identifier) {
        return this.subscriptions.filter(function(s) {
          return s.identifier === identifier;
        });
      }
    }, {
      key: "reload",
      value: function reload() {
        var _this2 = this;
        return this.subscriptions.map(function(subscription) {
          return _this2.sendCommand(subscription, "subscribe");
        });
      }
    }, {
      key: "notifyAll",
      value: function notifyAll(callbackName) {
        var _this3 = this;
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        return this.subscriptions.map(function(subscription) {
          return _this3.notify.apply(_this3, [ subscription, callbackName ].concat(args));
        });
      }
    }, {
      key: "notify",
      value: function notify(subscription, callbackName) {
        for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
          args[_key2 - 2] = arguments[_key2];
        }
        var subscriptions = void 0;
        if (typeof subscription === "string") {
          subscriptions = this.findAll(subscription);
        } else {
          subscriptions = [ subscription ];
        }
        return subscriptions.map(function(subscription) {
          return typeof subscription[callbackName] === "function" ? subscription[callbackName].apply(subscription, args) : undefined;
        });
      }
    }, {
      key: "sendCommand",
      value: function sendCommand(subscription, command) {
        var identifier = subscription.identifier;
        return this.consumer.send({
          command: command,
          identifier: identifier
        });
      }
    } ]);
    return Subscriptions;
  }();
  var Consumer = function() {
    function Consumer(url) {
      classCallCheck(this, Consumer);
      this.url = url;
      this.subscriptions = new Subscriptions(this);
      this.connection = new Connection(this);
    }
    createClass(Consumer, [ {
      key: "send",
      value: function send(data) {
        return this.connection.send(data);
      }
    }, {
      key: "connect",
      value: function connect() {
        return this.connection.open();
      }
    }, {
      key: "disconnect",
      value: function disconnect() {
        return this.connection.close({
          allowReconnect: false
        });
      }
    }, {
      key: "ensureActiveConnection",
      value: function ensureActiveConnection() {
        if (!this.connection.isActive()) {
          return this.connection.open();
        }
      }
    } ]);
    return Consumer;
  }();
  var ActionCable = {
    createConsumer: function createConsumer(url) {
      if (url == null) {
        var urlConfig = this.getConfig("url");
        url = urlConfig ? urlConfig : this.INTERNAL.default_mount_path;
      }
      return new Consumer(this.createWebSocketURL(url));
    },
    getConfig: function getConfig(name) {
      var element = document.head.querySelector("meta[name='action-cable-" + name + "']");
      return element ? element.getAttribute("content") : undefined;
    },
    createWebSocketURL: function createWebSocketURL(url) {
      if (url && !/^wss?:/i.test(url)) {
        var a = document.createElement("a");
        a.href = url;
        a.href = a.href;
        a.protocol = a.protocol.replace("http", "ws");
        return a.href;
      } else {
        return url;
      }
    }
  };
  ActionCable.Connection = Connection;
  ActionCable.ConnectionMonitor = ConnectionMonitor;
  ActionCable.Consumer = Consumer;
  ActionCable.INTERNAL = INTERNAL;
  ActionCable.Subscription = Subscription;
  ActionCable.Subscriptions = Subscriptions;
  return ActionCable;
});

var EventEmitter = require('events')
var os = require('os')
var StreamDuplex = require('stream').Duplex

var net, Server, Socket

net = {}

function getRandomPort () {
  var max = 61000
  var min = 32768
  return Math.floor(Math.random() * (max - min)) + min
}

function init () {
  var ifaces, keys

  net._addresses = []
  net._hasIPv6 = false
  net._hostname = os.hostname()

  ifaces = os.networkInterfaces()
  keys = Object.keys(ifaces)
  keys.forEach(function (iface) {
    var addresses = ifaces[iface].map(function (addr) {
      if (addr.family === 'IPv6') net._hasIPv6 = true
      return { address: addr.address, family: addr.family, internal: addr.internal }
    })
    net._addresses = net._addresses.concat(addresses)
  })
}

function isAnyhost (host) {
  return host === '0.0.0.0' || host === '::'
}

function isLocalhost (host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

function makeConnection (options) {
  var index = net._servers.findIndex(function (item) {
    return this._id === item._id
  })
  if (index === -1) {
    // TODO: connect error
  }
}

net._servers = []

Server = net.Server = function () {
  EventEmitter.call(this)

  this._connections = []
  this._listening = false
  this._options = {
    'EADDRINUSE': false
  }
}
require('util').inherits(Server, EventEmitter)

Server.prototype.address = function () {
  if (this._isPipe) {
    return this._id
  }
  var address = {
    port: this._port,
    family: this._family,
    address: this._adddress
  }
  return address
}

Server.prototype.close = function (callback) {
  if (this._listening) {
    var index = net._servers.findIndex(function (item) {
      return this._port === item._port && this._address === item._address
    })
    if (index > -1) net._servers.splice(index, 1)
    this._listening = false
  }
  this.on('__drain_connections', function () {
    this.emit('close')
  })
  this.on('close', callback)
  return this
}

Server.prototype._connect = function (socket) {
  this._connections.push(socket)
  this.emit('connection', socket)
}

Server.prototype._getConnectionKey = function () {
  return [
    this._isPipe ? '-1' : this._family === 'IPv6' ? '6' : '4',
    this._isPipe ? this._path : this._host,
    this._isPipe ? '-1' : this._port
  ].join(':')
}

Server.prototype.getConnections = function (callback) {
  var self = this
  setTimeout(function () {
    callback(self._connections.length)
  }, 0)
}

Server.prototype.listen = function () {
  var args, callback, opts, self

  args = [].slice.call(arguments)
  opts = {}
  self = this

  if (typeof args[0] === 'object') {
    opts = args[0]
    if (typeof args[1] === 'function') {
      callback = args[1]
    }
  } else if (typeof args[0] === 'string') {
    opts.path = args[0]
    if (typeof args[1] === 'number') {
      opts.backlog = args[1]
      if (typeof args[2] === 'function') {
        callback = args[2]
      }
    } else if (typeof args[1] === 'function') {
      callback = args[1]
    }
  } else if (typeof args[0] === 'number') {
    opts.port = args[0]
    if (typeof args[1] === 'string') {
      opts.hostname = args[1]
      if (typeof args[2] === 'number') {
        opts.backlog = args[2]
        if (typeof args[3] === 'function') {
          callback = args[3]
        }
      } else if (typeof args[2] === 'function') {
        callback = args[2]
      }
    } else if (typeof args[1] === 'number') {
      opts.backlog = args[1]
      if (typeof args[2] === 'function') {
        callback = args[2]
      }
    } else if (typeof args[1] === 'function') {
      callback = args[1]
    }
  }

  if (opts.path) {
    this._id = opts.path
    this._isPipe = true
    this._path = opts.path
  } else {
    this._isPipe = false
    this._port = opts.port || getRandomPort()
    this._host = opts.host || 'localhost'
    if (isAnyhost(this._host) && net._hasIPv6) this._host = '::'
    this._id = this._host + ':' + this._port
    this._family = 'IPv' + (this._host === isAnyhost() && net._hasIPv6 ? '6' : this._host === '::1' ? '6' : '4')
  }
  this._pipeName = this._isPipe ? opts.path : net._hostname
  this._connectionKey = this._getConnectionKey()

  if (callback) this.on('listening', callback)

  setTimeout(function () {
    if (self._options['EADDRINUSE']) {
      var err = new Error('listen EADDRINUSE')
      err.code = 'EADDRINUSE'
      self.emit('error', err)
    } else {
      self._listening = true
      net._servers.push(self)
      self.emit('listening')
    }
  }, 100)

  return this
}

Server.prototype.$option = function (option, value) {
  var keys = Object.keys(this._options)
  if (keys.indexOf(option) === -1) return
  if (value === undefined) return this._options[option]
  this._options[option] = value
}

Socket = net.Socket = function () {
  StreamDuplex.call(this)
}
require('util').inherits(Socket, StreamDuplex)

init()

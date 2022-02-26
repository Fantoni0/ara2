// Required Packages
require('dotenv').config()
const zmq = require('zeromq')

// Required Classes

BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

class Proxy {
  constructor (address, portPull, nDealers, nGuards, dealersPub, guardsPub, params) {
    this.address = address
    this.portPull = portPull
    this.nDealers = nDealers
    this.nGuards = nGuards
    this.portPubDealers = dealersPub
    this.portPubGuards = guardsPub
    this.pushUser = zmq.socket('push')
    this.pullUsers = zmq.socket('pull')
    this.pubDealers = zmq.socket('pub')
    this.pubGuards = zmq.socket('pub')
    this.pullDealers = []
    this.pullGuards = []
    this.dealersIps = params.dealersIps
    this.guardsIps = params.guardsIps
    this.dealersPushPorts = params.dealersPushPorts
    this.guardsPushPorts = params.guardsPushPorts
    this.userAddress = params.userAddress
    this.userPortPull = params.userPortPull
    this.requests = new Map()
    this.requestsAccess = new Map ()
    this.nRequests = 0
    this.nRequestsAccess = 0
    for (let i = 0; i < this.nDealers; i++) {
      this.pullDealers.push(zmq.socket('pull'))
    }
    for (let i = 0; i < this.nGuards; i++) {
      this.pullGuards.push(zmq.socket('pull'))
    }
  }

  async init () {
    // Bind sockets
    // Communication with user
    await this.pullUsers.bind('tcp://' + this.address + ':' + this.portPull)
    await this.pushUser.connect('tcp://' + this.userAddress + ':' + this.userPortPull)
    this.pullUsers.on("message", (msg) => this.handleUser(msg))
    // Communication with Dealers
    await this.pubDealers.bind('tcp://' + this.address + ':' + this.portPubDealers)
    for (let i = 0; i < this.nDealers; i++) {
      this.pullDealers[i].connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPushPorts[i])
      this.pullDealers[i].on('message', (msg) => this.handleDealer(msg))
    }
    // Communication with guards
    await this.pubGuards.bind('tcp://' + this.address + ':' + this.portPubGuards)
    for (let i = 0; i < this.nGuards; i++) {
      this.pullGuards[i].bind('tcp://' + this.guardsIps[i] + ':' + this.guardsPushPorts[i])
      this.pullGuards[i].on('message', (msg) => this.handleGuard(msg))
    }
  }

  handleUser (msg) {
    const message = JSON.parse(msg)
    console.log("MENSAJE RECIBIDO del usuario " + msg)
    if (message.kind === "getToken") {
      this.nRequests++
      this.requests.set(message.id, {message: message, dealerResponses: []})
      this.pubDealers.send(JSON.stringify(message))
    } else if (message.kind === "getAccess") {
      this.nRequestsAccess++
      this.requestsAccess.set(message.id, {message: message, guardsResponses: []})
      this.pubGuards.send(JSON.stringify(message))
    }
  }

  handleDealer (msg) {
    const message = JSON.parse(msg)
    let request = this.requests.get(message.id)
    request.dealerResponses.push(message)
    if (request.dealerResponses.length === this.nDealers) {
      console.log("Got response from all dealers")
      let response = {
        id: request.message.id,
        kind: "dealers",
        value: request.message.value,
        responses: request.dealerResponses
      }
      this.pushUser.send(JSON.stringify(response))
    }
  }

  handleGuard (msg) {
    const message = JSON.parse(msg)
    console.log("La proxy ha recibido la respuesta final de los guardias", message)

    let request = this.requestsAccess.get(message.id)
    request.guardsResponses.push(message)
    if (request.guardsResponses.length === this.nGuards) {
      let response = {
        id: message.id,
        kind: "guards",
        responses: request.guardsResponses
      }
      this.pushUser.send(JSON.stringify(response))
    }

  }

}

module.exports = Proxy;

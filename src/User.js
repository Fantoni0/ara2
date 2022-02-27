// Required Packages
const zmq = require("zeromq");

require('dotenv').config()

// Required Classes
const utils = require("./Utils")
const crypto = require("crypto");

class User {
  constructor(address, proxyAddress, proxyPort, requests, nDealers, nGuards, params) {
    this.address = address || process.env.USER_ADDRESS
    this.proxyAddress = proxyAddress
    this.proxyPort = proxyPort
    this.numberOfSimulations = requests
    this.requests = new Map()
    this.pushProxy = zmq.socket('push')
    this.pullProxy = zmq.socket('pull')
    this.nDealers = nDealers
    this.nGuards = nGuards
    this.userPullPort = params.userPortPull
    this.mode = params.mode
    this.modulo = params.modulo
    this.maxBits = params.maxBits
    this.interval = undefined
    this.requestsSent = 0
  }

  async init() {
    // Bind sockets
    await this.pushProxy.connect('tcp://' + this.proxyAddress + ':' + this.proxyPort)
    await this.pullProxy.bind('tcp://' + this.address + ':' + this.userPullPort)
    this.pullProxy.on("message", (msg) => this.handleProxy(msg))
    this.interval = setInterval(() => {this.sendMsgProxy()}, 1000)
  }

  handleProxy(msg) {
    const message = JSON.parse(msg)
    console.log("USUARIO= Respuesta de la proxy", message)
    if (message.kind === "dealers") {
      if (message.responses.length !== this.nDealers) {
        console.log("Not all dealers responded my request")
        return
      }
      let request = this.requests[message.id]
      if (this.mode === "ARA2") console.log("//TODO: desencriptar valor")
      request.responses = message.responses
      if (this.mode === "TRA2") {
        request["token"] = [request.value, message.responses[0].value]
      }else if (this.mode === "ARA2") {
        request["token"] = [request.value,
          message.responses.reduce((x,y) => {return BigInt(x.value) * BigInt(y.value)})]
      } else {
        request["token"] = [request.value,
          message.responses.reduce((x,y) => {return BigInt(x.value) + BigInt(y.value)})]
      }

      // Once the token has been obtained, we can ask for access.
      // Anonymous Id is added to facilitate the handling of access requests by the
      // guards in the case of network latencies. Please note it is NOT related in
      // any way and cannot be used to trace the user.
      let accessMsg = {
        anonymousId: this.generateId(6),
        kind: "getAccess",
        token: request.token
      }
      this.pushProxy.send(JSON.stringify(accessMsg))
    } else if (message.kind === "guards") {
      if (message.responses.length !== this.nGuards) {
        console.log("Not all dealers responded my request")
        return
      } else if (message.responses.reduce((x,y) =>
        {return x.success * y.success})) {
        console.log("Token was accepted and access granted!")
      } else {
        console.log("Token rejected, access denied")
      }
    }
  }

  sendMsgProxy () {
    this.requestsSent++
    if(this.requestsSent >= this.numberOfSimulations) clearInterval(this.interval)
    let message = {
      id: "User " + this.generateId(6),
      kind: "getToken",
      value: this.generateRandomValue()
    }
    this.requests[message.id] = {id: message.id, value: message.value, responses: []}
    this.pushProxy.send(JSON.stringify(message))
  }

  generateId (size) {
    return crypto.randomBytes(size)
      .toString('hex')
      .slice(0, size)
  }

  generateRandomValue () {
    const value =  BigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
    if (this.mode === "ARA2") {
      return value // TODO: Mask value
    } else {
      return value
    }
  }
}

module.exports = User;

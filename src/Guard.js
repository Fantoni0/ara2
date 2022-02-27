// Required Packages
const zmq = require("zeromq");
require('dotenv').config()

// Required Classes
const utils = require("./Utils")

BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

class Guard {
  constructor(id, address, portPush, portPub, nDealers, nGuards,  params) {
    this.id = id
    this.name = "Guard: " + this.id
    this.address = address
    this.portPush = portPush
    this.portPub = portPub
    this.nDealers = nDealers
    this.nGuards = nGuards
    this.dealersIps = params.dealersIps
    this.guardsIps = params.guardsIps
    this.dealersPorts = params.dealersPorts
    this.guardsPubPorts = params.guardsPubPorts
    this.pushSocket = zmq.socket('push')
    this.subSocket = zmq.socket('sub')
    this.subProxy = zmq.socket("sub")
    this.subGuardsSocket = zmq.socket('sub')
    this.pubGuardsSocket = zmq.socket('pub')
    this.usedCredentials = new Map()
    this.requests = new Map()
    this.maxDegree = params.maxDegree
    this.maxBits = params.maxBits
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.proxyAddress = params.proxyAddress
    this.proxyPortPubGuards = params.proxyPortPubGuards
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? BigInt(0) : []

  }

  async init() {
    // Connect socket to all dealers
    for (let i = 0;  i < this.nDealers; i++){
      await this.subSocket.connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPorts[i])
    }
    this.subSocket.on("message", (topic, msg) => this.handleDealer(topic, msg))
    // Subscribe to own messages
    this.subSocket.subscribe("")
    setTimeout(() => console.log("GUARD SECRET= ", this.secret), 5000)

    // Connect to Proxy
    this.subProxy.connect('tcp://' + this.proxyAddress + ':' + this.proxyPortPubGuards)
    this.subProxy.subscribe("")
    this.subProxy.on("message", (msg) => this.handleProxy(msg))

    await this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    // Connect to other guards.
    await this.pubGuardsSocket.bind('tcp://' + this.address + ':' + this.portPub)
    setTimeout(() => {
      for (let i = 0;  i < this.guardsIps.length; i++){
        if (i === this.id - 1) continue
        this.subGuardsSocket.connect('tcp://' + this.guardsIps[i] + ':' + this.guardsPubPorts[i])
      }
      this.subGuardsSocket.subscribe("")
      this.subGuardsSocket.on("message", (msg) => this.handleGuard(msg))
    }, 1000)
  }

  handleDealer (topic, msg) {
    const message = JSON.parse(msg)
    const rectopic = JSON.parse(topic)
    if (rectopic !== this.id) return;
    if (this.mode !== 'ARA2') {
      message.partialSecret = utils.reCastPolynomialToBigInt(JSON.parse(message.partialSecret))
    }
    this.secretParts.push(message.partialSecret)
    if (this.mode === 'ARA2') {
      this.secret += BigInt(message.partialSecret)
    } else {
      this.secret = utils.addPolynomials(this.secret, message.partialSecret)
    }
  }

  handleProxy (msg) {
    const message = JSON.parse(msg)
    console.log("Guard-Mensaje recibido de la proxy", message, this.id)
    let partialResult = this.evaluateSecret(message.token[0])
    if (this.requests[message.anonymousId] !== undefined) {
      console.log("YA ESTABA CREADO", this.id)
      this.requests[message.anonymousId].guardsResponses.push(partialResult)
    } else {
      this.requests[message.anonymousId] = {message: message, guardsResponses: [partialResult]}
    }
    let request = this.requests[message.anonymousId]

    if (this.checkAllResponses(request, message)) {
      console.log("I was the last to get a resonse")
    } else {
      // Broadcast partial result to other guards
      let broadcastMsg = {
        anonymousId: message.anonymousId,
        partialResult: partialResult
      }
      console.log("Mandando a otros guardias")
      this.pubGuardsSocket.send(JSON.stringify(broadcastMsg))
    }
  }

  handleGuard (msg) {
    const message = JSON.parse(msg)
    console.log("Mensage de otros guardias", message, this.id)
    // Update partial result
    console.log(this.requests, this.id)
    let request
    if (this.requests[message.anonymousId] !== undefined) {
      request = this.requests[message.anonymousId]
    } else {
      console.log("NO LO TENIA", this.id)
      request = {message: message, guardsResponses: []}
      this.requests[message.anonymousId] = request
    }
    request.guardsResponses.push(BigInt(message.partialResult))
    this.checkAllResponses(request, message)
  }

  checkAllResponses (request, message) {
    console.log("Guard" + this.id + ". Checking for " + message.anonymousId)

    if (request.guardsResponses.length === this.nGuards) {
      console.log("RESPOSES= ", request.guardsResponses)
      let finalResult
      if (this.mode === "ARA2") {
        finalResult = request.guardsResponses.reduce((x, y) => {return x * y})
      } else {
        finalResult = request.guardsResponses.reduce((x, y) => {return x + y})
      }
      console.log("FINAL RESULT= ", finalResult)
      request["finalResult"] = finalResult
      let result
      if (finalResult === BigInt(request.message.token[1])) {
        result = {
          id: message.anonymousId,
          message: "Access Granted",
          guard: this.id,
          success: true
        }
      } else {
        result = {
          id: message.anonymousId,
          message: "Access Denied",
          guard: this.id,
          success: false
        }
      }
      this.pushSocket.send(JSON.stringify(result))
      return true
    } else {
      return false
    }
  }

  evaluateSecret (value) {
    let partialResult
    value = BigInt(value)
    if (this.mode === "ARA2") {
      partialResult = (value ** this.secret) % this.modulo
    } else {
      partialResult = utils.evaluatePolynomial(this.secret, value)
    }
    return partialResult
  }
}

module.exports = Guard;

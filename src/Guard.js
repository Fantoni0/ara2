// Required Packages
const zmq = require('zeromq')
require('dotenv').config()
const bigInt = require('big-integer')
// Required Classes
const utils = require('./Utils')

BigInt.prototype.toJSON = function () { return this.toString() }
BigInt.prototype.fromJSON = function () { return BigInt(this) }

class Guard {
  /**
   * Guard entity in charge of hadnling the access to the resource.
   *
   * @param {number} id Numerical id to identify the Dealer instance.
   * @param {string} address Address to bind the instance.
   * @param {number} portPush Port number to set the Push ZMQ socket.
   * @param {number} portPub Port number to set the Push ZMQ socket.
   * @param {number} nDealers Number of Dealers in the setup.
   * @param {number} nGuards Number of Guards in the setup.
   * @param {Object} params Object containing different parameters associated to ZMQ sockets.
   */
  constructor (id, address, portPush, portPub, nDealers, nGuards, params) {
    this.id = id
    this.name = 'Guard: ' + this.id
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
    this.subProxy = zmq.socket('sub')
    this.subGuardsSocket = zmq.socket('sub')
    this.pubGuardsSocket = zmq.socket('pub')
    this.usedCredentials = new Map()
    this.requests = new Map()
    this.maxDegree = params.maxDegree
    this.maxBits = params.maxBits
    this.modulo = bigInt(params.modulo)
    this.mode = params.mode
    this.proxyAddress = params.proxyAddress
    this.proxyPortPubGuards = params.proxyPortPubGuards
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? bigInt() : []
  }

  /**
   * Initiates the Guard instance.
   * Sets upt ZMQ sockets and connects to Proxy, Dealers and other Guards.
   * @return {Promise<void>}
   */
  async init () {
    // Connect socket to all dealers
    for (let i = 0; i < this.nDealers; i++) {
      await this.subSocket.connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPorts[i])
    }
    this.subSocket.on('message', (topic, msg) => this.handleDealer(topic, msg))
    // Subscribe to own messages
    this.subSocket.subscribe('')

    // Connect to Proxy
    this.subProxy.connect('tcp://' + this.proxyAddress + ':' + this.proxyPortPubGuards)
    this.subProxy.subscribe('')
    this.subProxy.on('message', (msg) => this.handleProxy(msg))

    await this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    // Connect to other guards.
    await this.pubGuardsSocket.bind('tcp://' + this.address + ':' + this.portPub)
    setTimeout(() => {
      for (let i = 0; i < this.guardsIps.length; i++) {
        if (i === this.id - 1) continue
        this.subGuardsSocket.connect('tcp://' + this.guardsIps[i] + ':' + this.guardsPubPorts[i])
      }
      this.subGuardsSocket.subscribe('')
      this.subGuardsSocket.on('message', (msg) => this.handleGuard(msg))
    }, 1000)
  }

  /**
   * Handles message containing the partial secret from the Dealers.
   * @param topic Topic of the SUB ZMQ pattern.
   * @param msg Message containing the partial secret.
   */
  handleDealer (topic, msg) {
    const message = JSON.parse(msg)
    const rectopic = JSON.parse(topic)
    if (rectopic !== this.id) return
    // Parse content
    if (this.mode !== 'ARA2') {
      message.partialSecret = utils.reCastPolynomialToBigInt(JSON.parse(message.partialSecret))
    } else {
      message.partialSecret = bigInt(message.partialSecret)
    }
    // Add to personal secret state.
    this.secretParts.push(message.partialSecret)
    if (this.mode === 'ARA2') {
      this.secret = this.secret.add(message.partialSecret)
      this.secret = this.secret.mod(this.modulo)
    } else {
      this.secret = utils.addPolynomials(this.secret, message.partialSecret)
    }
  }

  /**
   * Handles access requests from the users forwarded by the Proxy.
   * @param msg Message of the proxy.
   */
  handleProxy (msg) {
    const message = JSON.parse(msg)
    const partialResult = this.evaluateSecret(message.token[0])
    if (this.requests[message.anonymousId] !== undefined) {
      this.requests[message.anonymousId].guardsResponses.push(partialResult)
    } else {
      this.requests[message.anonymousId] = { message: message, guardsResponses: [partialResult] }
    }
    const request = this.requests[message.anonymousId]

    if (this.checkAllResponses(request, message)) {
      console.log('I was the last one to get a response.')
      console.log('This might have been to a synchronization issue.\n A restart might be required.')
    } else {
      // Broadcast partial result to other guards
      const broadcastMsg = {
        anonymousId: message.anonymousId,
        partialResult: partialResult,
        token: message.token
      }
      this.pubGuardsSocket.send(JSON.stringify(broadcastMsg))
    }
  }

  /**
   * Handles messages from other guards when looking for consensus.
   * Decided to grant or reject the access to the resource.
   * @param msg Message from other guards.
   */
  handleGuard (msg) {
    const message = JSON.parse(msg)
    // Update partial result
    // console.log(this.requests, this.id)
    let request
    if (this.requests[message.anonymousId] !== undefined) {
      request = this.requests[message.anonymousId]
    } else {
      request = { message: message, guardsResponses: [] }
      this.requests[message.anonymousId] = request
    }
    request.guardsResponses.push(bigInt(message.partialResult))
    this.checkAllResponses(request, message)
  }

  /**
   * Checks the responses from the other guards.
   * If aggregating all of them coincides with the presented token, the access is granted.
   *
   * @param request Original request from which we are deciding to grant/revoke access.
   * @param message Message from guard
   * @return {boolean}
   */
  checkAllResponses (request, message) {
    if (request.guardsResponses.length === this.nGuards) {
      let finalResult
      if (this.mode === 'ARA2') {
        finalResult = request.guardsResponses.reduce((x, y) => { return x.multiply(y) })
      } else {
        finalResult = request.guardsResponses.reduce((x, y) => { return x.add(y) })
      }
      finalResult = finalResult.mod(this.modulo)
      request.finalResult = finalResult
      let result
      if (finalResult.eq(bigInt(message.token[1]))) {
        result = {
          id: message.anonymousId,
          message: 'Access Granted',
          guard: this.id,
          success: true
        }
      } else {
        result = {
          id: message.anonymousId,
          message: 'Access Denied',
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

  /**
   * Evaluates Guard's secret in a given point.
   * @param value Value to evaluate.
   * @return {BigInteger}
   */
  evaluateSecret (value) {
    let partialResult
    value = bigInt(value)
    if (this.mode === 'ARA2') {
      partialResult = value.modPow(this.secret, this.modulo)
    } else {
      partialResult = utils.evaluatePolynomial(this.secret, value, this.modulo)
    }
    return partialResult.mod(this.modulo)
  }
}

module.exports = Guard

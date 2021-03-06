// Required Packages
require('dotenv').config()
const zmq = require('zeromq')
const bigInt = require('big-integer')
// Required Classes

BigInt.prototype.toJSON = function () { return this.toString() }
BigInt.prototype.fromJSON = function () { return BigInt(this) }

class Proxy {
  /**
   * Proxy service to communicate users and dealers/guards.
   * It simply serves as a single point interface for a simplified user interaction.
   *
   * @param {string} address Address to bind the Proxy instacne.
   * @param {number} portPull Port to set up the ZMQ pull socket.
   * @param {number} nDealers Number of dealers in the setup.
   * @param {number} nGuards Number of guards in the setup.
   * @param {number[]} dealersPub List of port number of pub socket from dealers.
   * @param {number[]} guardsPub List of port number of pub socket from dealers.
   * @param {Object} params Object containing different parameters associated to ZMQ sockets.
   */
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
    this.requestsAccess = new Map()
    this.nRequests = 0
    this.nRequestsAccess = 0
    for (let i = 0; i < this.nDealers; i++) {
      this.pullDealers.push(zmq.socket('pull'))
    }
    for (let i = 0; i < this.nGuards; i++) {
      this.pullGuards.push(zmq.socket('pull'))
    }
  }

  /**
   * Initiates the User Object by setting up the ZMQ sockets.
   * Also connects to the Dealers and Guards.
   * @return {Promise<void>}
   */
  async init () {
    // Bind sockets
    // Communication with user
    await this.pullUsers.bind('tcp://' + this.address + ':' + this.portPull)
    await this.pushUser.connect('tcp://' + this.userAddress + ':' + this.userPortPull)
    this.pullUsers.on('message', (msg) => this.handleUser(msg))
    // Communication with Dealers
    await this.pubDealers.bind('tcp://' + this.address + ':' + this.portPubDealers)
    for (let i = 0; i < this.nDealers; i++) {
      this.pullDealers[i].connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPushPorts[i])
      this.pullDealers[i].on('message', (msg) => this.handleDealer(msg))
    }
    // Communication with guards
    await this.pubGuards.bind('tcp://' + this.address + ':' + this.portPubGuards)
    for (let i = 0; i < this.nGuards; i++) {
      this.pullGuards[i].connect('tcp://' + this.guardsIps[i] + ':' + this.guardsPushPorts[i])
      this.pullGuards[i].on('message', (msg) => this.handleGuard(msg))
    }
  }

  /**
   * Handles user request and updates the internal state to keep track of requests.
   * Forwards the message to the desired parties.
   * @param msg Message sent by the user.
   */
  handleUser (msg) {
    const message = JSON.parse(msg)
    if (message.kind === 'getToken') {
      this.nRequests++
      this.requests[message.id] = { message: message, dealerResponses: [] }
      this.pubDealers.send(JSON.stringify(message))
    } else if (message.kind === 'getAccess') {
      this.nRequestsAccess++
      this.requestsAccess[message.anonymousId] = { message: message, guardsResponses: [] }
      this.pubGuards.send(JSON.stringify(message))
    }
  }

  /**
   * Handles responses from the Dealers and sends it back to the User.
   * @param msg Message sent by the Dealer.
   */
  handleDealer (msg) {
    const message = JSON.parse(msg)
    const request = this.requests[message.id]
    request.dealerResponses.push(message)
    if (request.dealerResponses.length === this.nDealers) {
      const response = {
        id: request.message.id,
        kind: 'dealers',
        value: request.message.value,
        responses: request.dealerResponses
      }
      this.pushUser.send(JSON.stringify(response))
    }
  }

  /**
   * Handles responses from the Guards and sends it back to the User.
   * @param msg Message sent by the Guard.
   */
  handleGuard (msg) {
    const message = JSON.parse(msg)
    const request = this.requestsAccess[message.id]
    request.guardsResponses.push(message)
    if (request.guardsResponses.length === this.nGuards) {
      const response = {
        id: message.id,
        kind: 'guards',
        responses: request.guardsResponses
      }
      this.pushUser.send(JSON.stringify(response))
    }
  }
}

module.exports = Proxy

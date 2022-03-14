// Required Packages
const zmq = require('zeromq');
const crypto = require("crypto");
const bigInt = require("big-integer")
// Required Classes
const utils = require("./Utils");

BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

class Dealer {
  /**
   * Dealer entity in charge of verifying credentials and issuing access-keys.
   *
   * @param {number} id Numerical id to identify the Dealer instance.
   * @param {string} address Address to bind the instance.
   * @param {number} portPush Port number to set the Push ZMQ socket.
   * @param {number} portPub Port number to set the Push ZMQ socket.
   * @param {number} nGuards Number of Guards in the setup.
   * @param {Object} params Object containing different parameters associated to ZMQ sockets.
   */
  constructor(id, address, portPush, portPub, nGuards, params) {
    this.id = id;
    this.name = "Dealer: " + this.id
    this.address = address;
    this.portPush = portPush;
    this.portPub = portPub;
    this.nGuards = nGuards;
    this.pushSocket = zmq.socket('push')
    this.pubSocket = zmq.socket('pub')
    this.subSocket = zmq.socket("sub")
    this.usedIds = new Map()
    this.requests = new Map()
    this.maxDegree = params.maxDegree
    this.termsPolynomial = crypto.randomInt(3, 5) // Hardcoded value for PoC. Feel free to edit.
    this.maxBits = params.maxBits
    this.modulo = bigInt(params.modulo)
    this.mode = params.mode
    this.proxyAddress = params.proxyAddress
    this.proxyPortPubDealers = params.proxyPortPubDealers
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? bigInt(0) : []
  }

  /**
   * Launches the Dealer instance by setting up the ZMQ sockets, and generating its secrets.
   * @return {Promise<void>}
   */
  async init () {
    await this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    await this.pubSocket.bind('tcp://' + this.address + ':' + this.portPub)
    await this.subSocket.connect('tcp://' + this.proxyAddress + ':' + this.proxyPortPubDealers)
    this.subSocket.subscribe("")
    this.subSocket.on("message", (msg) => this.handleProxy(msg))
    this.generateRandomSecrets()
    const parent = this;
    setTimeout( () => parent.distributePartialSecretsToGuards(), 2000)
  }

  /**
   * Handles user's requests forwarded by Proxy.
   * @param msg Message sent by the Proxy.
   * @return {Promise<void>}
   */
  async handleProxy (msg) {
    const message = JSON.parse(msg)
    message.value = bigInt(message.value)
    let response
    if (this.usedIds.has(message.id)) {
      response = {
        id: message.id,
        value: NaN,
        message: "The identification was already used",
        dealer: this.id,
        success: false
      }
    } else {
      this.requests.set(message.id, message)
      this.usedIds.set(message.id, message)
      let value
      if (this.mode === "ARA2") {
        value = message.value.modPow(this.secret, this.modulo)
      } else {
        value = utils.evaluatePolynomial(this.secret, message.value, this.modulo)
      }
      response = {
        id: message.id,
        value: value,
        message: "Here is your token",
        dealer: this.id,
        success: true
      }
    }
    this.pushSocket.send(JSON.stringify(response))
  }

  /**
   * Distribute the Dealer's personal secret to all the Guards.
   * @return {Promise<void>}
   */
  async distributePartialSecretsToGuards () {
    for (let i = 0; i < this.nGuards; i++) {
      const msg = {
        sender: this.name,
        receiver: "Guard: " + i,
        partialSecret: this.mode === 'ARA2' ?
            this.secretParts[i].toString() :
            JSON.stringify(this.secretParts[i])
      }
      this.pubSocket.send([i + 1, JSON.stringify(msg)])
    }
  }

  /**
   * Generates random secrets to be used as access-keys generators.
   */
  generateRandomSecrets () {
    if (this.mode === 'ARA2') {
      for (let i = 0; i < this.nGuards; i++) {
        const exp = this.generateRandomExponent().mod(this.modulo)
        this.secretParts.push(exp)
        this.secret = this.secret.add(exp)
      }
      this.secret = this.secret.mod(this.modulo)
    } else {
      for (let i = 0; i < this.nGuards; i++) {
        let pol = this.generateRandomPolynomial()
        this.secretParts.push(pol)
        this.secret = utils.addPolynomials(this.secret, utils.clonePolynomial(pol))
      }
    }
  }

  /**
   * It generates a random Big Integer to be used as exponent.
   * @return {bigInt.BigInteger | *}
   */
  generateRandomExponent () {
    return bigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
  }

  /**
   * It generates a random polynomial to be used as secret.
   * The polynomial is structured as a list of {degree, coefficient} items.
   * Not the best implementation. But lists can be stringified to send over the network (as opposed to maps).
   * @return {[]}
   */
  generateRandomPolynomial () {
    const poly = []
    for (let i = 0; i < this.termsPolynomial; i++) {
      const degree = bigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4))).mod(this.modulo)
      const coefficient = bigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4))).mod(this.modulo)
      poly.push({
        degree: degree,
        coefficient: coefficient
      })
    }
    return utils.removePolynomialDuplicates(utils.sortPolynomial(poly))
  }

}

module.exports = Dealer;

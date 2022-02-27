// Required Packages
//require('dotenv').config()
const zmq = require('zeromq');
const crypto = require("crypto");

// Required Classes
const utils = require("./Utils");
const util = require("util");

BigInt.prototype.toJSON = function() { return this.toString() }
BigInt.prototype.fromJSON = function() { return BigInt(this) }

class Dealer {

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
    this.termsPolynomial = crypto.randomInt(3, 5)
    this.maxBits = params.maxBits
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.proxyAddress = params.proxyAddress
    this.proxyPortPubDealers = params.proxyPortPubDealers
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? BigInt(0) : []
  }

  async init () {
    await this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    await this.pubSocket.bind('tcp://' + this.address + ':' + this.portPub)
    await this.subSocket.connect('tcp://' + this.proxyAddress + ':' + this.proxyPortPubDealers)
    this.subSocket.subscribe("")
    this.subSocket.on("message", (msg) => this.handleProxy(msg))
    //this.pubSocket.on("message", (msg) => this.handleGuard(msg))
    this.generateRandomSecrets()
    const parent = this;
    setTimeout( () => parent.distributePartialSecretsToGuards(), 2000)
  }

  async handleProxy (msg) {
    const message = JSON.parse(msg)
    console.log("Dealer: MENSAJE DE LA PROXY", message)
    message.value = BigInt(message.value)
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
        value = (message.value ** this.secret) % this.modulo
      } else {
        value = utils.evaluatePolynomial(this.secret, message.value)
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

  async distributePartialSecretsToGuards () {
    for (let i = 0; i < this.nGuards; i++) {
      const msg = {
        sender: this.name,
        receiver: "Guard: " + i,
        partialSecret: this.mode === 'ARA2' ?
            this.secretParts[i].toString() :
            JSON.stringify(this.secretParts[i])
      }
      //console.log("ENVIANDO paquete" +JSON.stringify(msg)+ ". DEl dealer" +this.id+ "para el guardia" + i)
      this.pubSocket.send([i + 1, JSON.stringify(msg)])
    }
  }

  generateRandomSecrets () {
    if (this.mode === 'ARA2') {
      for (let i = 0; i < this.nGuards; i++) {
        const exp = this.generateRandomExponent()
        this.secretParts.push(exp)
        this.secret = this.secret + exp % this.modulo
      }
    } else {
      for (let i = 0; i < this.nGuards; i++) {
        let pol = this.generateRandomPolynomial()
        this.secretParts.push(pol)
        this.secret = utils.addPolynomials(this.secret, utils.clonePolynomial(pol))
      }
    }
  }

  generateRandomExponent () {
    return BigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
  }

  generateRandomPolynomial () {
    const poly = []
    for (let i = 0; i < this.termsPolynomial; i++) {
      const degree = BigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
      const coefficient = BigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
      poly.push({
        degree: degree,
        coefficient: coefficient
      })
    }
    return utils.removePolynomialDuplicates(utils.sortPolynomial(poly))
  }



}

module.exports = Dealer;

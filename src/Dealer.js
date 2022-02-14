// Required Packages
//require('dotenv').config()
const zmq = require('zeromq');
const crypto = require("crypto");

// Required Classes
const utils = require("./Utils");



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
    this.usedCredentials = new Map()
    this.maxDegree = params.maxDegree
    this.termsPolynomial = crypto.randomInt(3, 5)
    this.maxBits = params.maxBits
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? BigInt(0) : new Map()
  }

  async init () {
    await this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    console.log('DEALER= tcp://' + this.address + ':' + this.portPub)
    await this.pubSocket.bind('tcp://' + this.address + ':' + this.portPub)
    this.pushSocket.on("message", (msg) => this.handleProxy(msg))
    this.pubSocket.on("message", (msg) => this.handleGuard(msg))
    this.generateRandomSecrets()
    const parent = this;
    setTimeout( () => parent.distributePartialSecretsToGuards(), 5000)
    //setInterval(()=> console.log("ALIVE"), 5000)
  }

  async handleProxy (msg) {
    console.log("!TODO")
  }

  async handleGuard (msg) {
    console.log("GUARD CONNECTED")
  }

  async distributePartialSecretsToGuards () {
    for (let i = 0; i < this.nGuards; i++) {
      const msg = {
        sender: this.name,
        receiver: "Guard: " + i,
        partialSecret: this.mode === 'ARA2' ?
            this.secretParts[i].toString() :
            JSON.stringify(this.secretParts[i], utils.replacer)
      }
      console.log("ENVIANDO paquete" +JSON.stringify(msg)+ ". DEl dealer" +this.id+ "para el guardia" + i)
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
        const pol = this.generateRandomPolynomial()
        this.secretParts.push(pol)
        this.secret = utils.addPolynomials(this.secret, pol)
      }
    }
  }

  generateRandomExponent () {
    return BigInt(this.randomDecimalString(Math.ceil(this.maxBits / 4)))
  }

  generateRandomPolynomial () {
    // The polynomial is encoded as a Map of values (degree, coefficient)
    const poly = new Map()
    for (let i = 0; i < this.termsPolynomial; i++) {
      const degree = BigInt(this.randomDecimalString(Math.ceil(this.maxBits / 4)))
      const coefficient = BigInt(this.randomDecimalString(Math.ceil(this.maxBits / 4)))
      if (poly.has(degree)) {
        poly.set(degree, poly.get(degree) + coefficient)
      } else {
        poly.set(degree, coefficient)
      }
    }
    return poly
  }

  // Sketchy
  // TODO: Add hash
  randomDecimalString (len) {
    let str = ''
    for (let i = 0; i  < len; i++) {
      str += crypto.randomInt(0, 4)
    }
    return str

  }

}

module.exports = Dealer;
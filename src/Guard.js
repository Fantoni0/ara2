// Required Packages
const zmq = require("zeromq");
require('dotenv').config()

// Required Classes
const utils = require("./Utils")

class Guard {
  constructor(id, address, portPush, portSub, nDealers, params) {
    this.id = id;
    this.name = "Guard: " + this.id
    this.address = address;
    this.portPush = portPush;
    this.portSub = portSub;
    this.nDealers = nDealers;
    this.dealersIps = params.dealersIps
    this.dealersPorts = params.dealersPorts
    this.pushSocket = zmq.socket('push')
    this.subSocket = zmq.socket('sub')
    this.usedCredentials = new Map()
    this.maxDegree = params.maxDegree
    this.maxBits = params.maxBits
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? BigInt(0) : new Map()

  }

  async init() {
    // Connect socket to all dealers
    for (let i = 0;  i < this.nDealers; i++){
      await this.subSocket.connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPorts[i]);
    }
    this.subSocket.on("message", (topic, msg) => this.handleDealer(topic, msg))
    // Subscribe to own messages
    this.subSocket.subscribe("")
    //setInterval(()=> console.log("OLIVE"), 5000)
    setTimeout(() => console.log("GUARD SECRET= ", this.secret), 15000)

  }

  handleDealer (topic, msg) {
    const message = JSON.parse(msg)
    const rectopic = JSON.parse(topic)
    if (rectopic !== this.id) return;
    if (this.mode !== 'ARA2') {
      message.partialSecret = JSON.parse(message.partialSecret, utils.reviver)
    }

    console.log("Received message from " + message.sender + ". Addressed to " + message.receiver)
    console.log("Partial secret: " + message.partialSecret)
    this.secretParts.push(message.partialSecret)
    if (this.mode === 'ARA2') {
      this.secret += BigInt(message.partialSecret)
    } else {
      this.secret = utils.addPolynomials(this.secret, message.partialSecret)
    }
  }
}

module.exports = Guard;

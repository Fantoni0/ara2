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
    this.maxBytes = params.maxBytes
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? new Map() : BigInt(0)

  }

  async init() {
    // Connect socket to all dealers
    for (let i = 0;  i < this.nDealers; i++){
      this.subSocket.connect('tcp://' + this.dealersIps[i] + ':' + this.dealersPorts[i]);
    }
    this.subSocket.on("message", (msg) => this.handleDealer(msg))
    // Subscribe to own messages
    this.subSocket.subscribe(this.name)
  }

  async handleDealer (msg) {
    const message = JSON.parse(msg)
    console.log("Received message from " + message.sender + ". Addressed to " + message.receiver)
    console.log("Partial secret: " + message.partialSecret)
    this.secretParts.push(message.partialSecret)
    if (this.mode === 'ARA2') {
      this.secret = utils.addPolynomials(this.secret, message.partialSecret)
    } else {
      this.secret += message.partialSecret
    }
  }
}

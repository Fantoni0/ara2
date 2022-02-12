// Required Packages
require('dotenv').config()
require('crypto')
const zmq = require('zeromq')
const crypto = require("crypto")

// Required Classes
const utils = require("./Utils")



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
    this.termsPolynomial = Math.log2(Math.log2(this.maxDegree))
    this.maxBytes = params.maxBytes
    this.modulo = BigInt(params.modulo)
    this.mode = params.mode
    this.secretParts = []
    this.secret = this.mode === 'ARA2' ? new Map() : BigInt(0)
  }

  async init () {
    this.pushSocket.bind('tcp://' + this.address + ':' + this.portPush)
    this.pubSocket.bind('tcp://' + this.address + ':' + this.portPub)
    this.pushSocket.on("message", (msg) => this.handleProxy())
    this.generateRandomSecrets()
    await this.distributePartialSecretsToGuards()
  }

  async handleProxy () {

  }

  async distributePartialSecretsToGuards () {
    for (let i = 0; i < this.nGuards; i++) {
      const msg = {
        sender: this.name,
        receiver: "Guard: " + i,
        partialSecret: this.secretParts[i],
      }
      this.pubSocket.send(JSON.stringify(msg))
    }
  }

  generateRandomSecrets () {
    if (this.mode === 'ARA2') {
      for (let i = 0; i < this.nGuards; i++) {
        const exp = this.generateRandomExponent()
        this.secretParts.push(exp)
        this.secret += exp % this.modulo
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
    const randomBytes = crypto.randomBytes(this.maxBytes)
    return BigInt(randomBytes)
  }

  generateRandomPolynomial () {
    // The polynomial is encoded as a Map of values (degree, coefficient)
    const poly = new Map()
    for (let i = 0; i < this.termsPolynomial; i++) {
      const degree = crypto.randomBytes(this.maxBytes)
      const coefficient = crypto.randomBytes(this.maxBytes)
      if (poly.has(degree)) {
        poly.set(degree, poly.get(degree) + coefficient)
      } else {
        poly.set(degree, coefficient)
      }
    }
    return poly
  }

}


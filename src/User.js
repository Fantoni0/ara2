// Required Packages
const zmq = require("zeromq");
const bigInt = require("big-integer")
const fs = require("fs")
require('dotenv').config()

// Required Classes
const utils = require("./Utils")
const crypto = require("crypto");

// Global variables to measure times
let startTimes = {}
let receivedTokens = {}
let sendTokens = {}
let receivedAccess = {}
let finalTimes = {}
let anonynomousIdToIds = {}

class User {
  constructor(address,
              proxyAddress,
              proxyPort,
              requests,
              nDealers,
              nGuards,
              privateKey,
              publicKey,
              params) {
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
    this.privateKey = privateKey
    this.publicKey = publicKey
    this.requestsSent = 0
  }

  async init() {
    // Bind sockets
    await this.pushProxy.connect('tcp://' + this.proxyAddress + ':' + this.proxyPort)
    await this.pullProxy.bind('tcp://' + this.address + ':' + this.userPullPort)
    this.pullProxy.on("message", (msg) => this.handleProxy(msg))
    this.interval = setInterval(() => {this.sendMsgProxy()}, 100)
  }

  handleProxy(msg) {
    const message = JSON.parse(msg)
    if (message.kind === "dealers") {
      receivedTokens[message.id] = process.hrtime(startTimes[message.id])
      if (message.responses.length !== this.nDealers) {
        console.log("Not all dealers responded my request")
        return
      }
      let request = this.requests[message.id]
      request.responses = message.responses
      if (this.nDealers === 1) {
        if (this.mode !== "ARA2") {
          request["token"] = [bigInt(request.value), bigInt(message.responses[0].value)]
        } else {
          request["token"] = [this.unMaskValue(request.value), this.unMaskValue(message.responses[0].value)]
        }
      }else if (this.mode === "ARA2") {
        request["token"] = [this.unMaskValue(request.value),
          this.unMaskValue(message.responses.reduce((x,y) => {return bigInt(x.value).multiply(bigInt(y.value))}))]
      } else {
        request["token"] = [request.value,
          message.responses.reduce((x,y) => {return bigInt(x.value).add(bigInt(y.value))})]
      }
      request["token"][1] = request["token"][1].mod(this.modulo)
      // Once the token has been obtained, we can ask for access.
      // Anonymous Id is added to facilitate the handling of access requests by the
      // guards in the case of network latencies. Please note it is NOT related in
      // any way and cannot be used to trace the user.
      let accessMsg = {
        anonymousId: this.generateId(6),
        kind: "getAccess",
        token:  request.token
      }
      anonynomousIdToIds[accessMsg.anonymousId] = message.id
      sendTokens[message.id] = process.hrtime()
      this.pushProxy.send(JSON.stringify(accessMsg))
    } else if (message.kind === "guards") {
      let publicId = anonynomousIdToIds[message.id]

      receivedAccess[publicId] = process.hrtime(sendTokens[publicId])
      if (message.responses.length !== this.nGuards) {
        console.log("Not all dealers responded my request")
        return
      } else if (this.checkResponses(message.responses)) {
        console.log("Token was accepted and access granted!")
      } else {
        console.log("Token rejected, access denied")
      }
      finalTimes[publicId] = process.hrtime(startTimes[publicId])
      if (this.numberOfSimulations === Object.keys(finalTimes).length) {
        this.computeAverageTime()
      }
    }
  }

  sendMsgProxy () {
    this.requestsSent++
    let message = {
      id: "User " + this.generateId(6),
      kind: "getToken",
      value: this.mode === "ARA2" ? this.maskValue(this.generateRandomValue().mod(this.modulo)) : this.generateRandomValue().mod(this.modulo)
    }
    this.requests[message.id] = {id: message.id, value: message.value, responses: []}
    startTimes[message.id] = process.hrtime()
    this.pushProxy.send(JSON.stringify(message))
    if(this.requestsSent >= this.numberOfSimulations) clearInterval(this.interval)
  }

  generateId (size) {
    return crypto.randomBytes(size)
      .toString('hex')
      .slice(0, size)
  }

  generateRandomValue () {
    const value =  bigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
    return value
  }

  checkResponses (responses) {
    let ok = true;
    for (let i=0; i<responses.length; i++) {
      ok *= responses[i].success
    }
    return ok
  }

  maskValue (value) {
    value = bigInt(value)
    return value.modPow(this.publicKey, this.modulo)
  }

  unMaskValue (value) {
    value = bigInt(value)
    return value.modPow(this.privateKey, this.modulo)
  }

  computeAverageTime () {
    // Get values
    let valuesToken = Object.values(receivedTokens).map(this.toMiliSeconds)
    let valuesAccess = Object.values(receivedTokens).map(this.toMiliSeconds)
    let valuesTotal = Object.values(finalTimes).map(this.toMiliSeconds)

    // Compute mean
    let averageRequestTokenTime = (valuesToken.reduce((x,y) => {return x + y}) / this.numberOfSimulations).toFixed(2)
    let averageRequestAccess = (valuesAccess.reduce((x,y) => {return x + y}) / this.numberOfSimulations).toFixed(2)
    let averageTotalTime = (valuesTotal.reduce((x,y) => {return x + y}) / this.numberOfSimulations).toFixed(2)

    // Compute standard Deviation
    let stdRequestTokenTime = utils.standardDeviation(valuesToken, averageRequestTokenTime).toFixed(2)
    let stdRequestAccess = utils.standardDeviation(valuesAccess, averageRequestAccess).toFixed(2)
    let stdTotalTime = utils.standardDeviation(valuesTotal, averageTotalTime).toFixed(2)

    console.log("Average Request Token Time: %fms +- %fms", averageRequestTokenTime, stdRequestTokenTime)
    console.log("Average Request Access Time: %fms +- %fms", averageRequestAccess, stdRequestAccess)
    console.log("Average Total Time: %fms +- %fms", averageTotalTime, stdTotalTime)
    this.exportToCSV(averageRequestTokenTime, stdRequestTokenTime, averageRequestAccess, stdRequestAccess, averageTotalTime,stdTotalTime)
  }

  exportToCSV (request, stdRequest, access, stdAccess, total, stdTotal) {
    const name = './data/times_dealers_' + this.nDealers + '_guards_' + this.nGuards + '_bitsize_' + this.maxBits + '_mode_' + this.mode + '.csv'
    const header = "tokenTime,stdToken,accessTime,stdAccess,totalTime,stdTotal\n"
    const log = fs.createWriteStream(name)
    log.write(header)
    log.write([request, stdRequest, access, stdAccess, total, stdTotal].join())
    log.end()
  }

  toMiliSeconds (time) {
    return time[0] * 1000 + time[1] /1000000
  }
}

module.exports = User;

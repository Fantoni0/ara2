// Required Packages
const zmq = require('zeromq')
const bigInt = require('big-integer')
const fs = require('fs')
require('dotenv').config()

// Required Classes
const utils = require('./Utils')
const crypto = require('crypto')

// Global variables to measure times
const startTimes = {}
const receivedTokens = {}
const sendTokens = {}
const receivedAccess = {}
const finalTimes = {}
const anonynomousIdToIds = {}

class User {
  /**
   * Creates an instance of the class User ready to interact with the system through the Proxy.
   * @param {string} address Address to bind the User instance.
   * @param {string} proxyAddress Address of the Proxy to connect.
   * @param {number} proxyPort Port of the Proxy to connect.
   * @param {number} nRequests Number of request to simulate by the User.
   * @param {number} nDealers Number of Dealers in the setup.
   * @param {number} nGuards Number of Guards in the setup.
   * @param {Object} privateKey Private key used in homomorphic hiding for ARA2 mode.
   * @param {Object} publicKey Associated public key.
   * @param {Object} params Object containing different parameters associated to ZMQ sockets.
   * @param {boolean} saveCsv Boolean to decide to save or not the data in CSV format.
   */
  constructor (address,
    proxyAddress,
    proxyPort,
    nRequests,
    nDealers,
    nGuards,
    privateKey,
    publicKey,
    params,
    saveCsv) {
    this.address = address
    this.proxyAddress = proxyAddress
    this.proxyPort = proxyPort
    this.numberOfSimulations = nRequests
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
    this.saveCsv = saveCsv
  }

  /**
   * Initiates the User Object by setting up the ZMQ sockets.
   * Also sets up the interval for sending messages to the Proxy.
   * @return {Promise}
   */
  async init () {
    // Bind sockets
    await this.pushProxy.connect('tcp://' + this.proxyAddress + ':' + this.proxyPort)
    await this.pullProxy.bind('tcp://' + this.address + ':' + this.userPullPort)
    this.pullProxy.on('message', (msg) => this.handleProxy(msg))
    this.interval = setInterval(() => { this.sendMsgProxy() }, 100)
  }

  /**
   * Handles the responses from the Proxy.
   * They can be either the dealers sending their partial tokens or the guards answering the access request.
   * @param {Object} msg
   */
  handleProxy (msg) {
    const message = JSON.parse(msg)
    if (message.kind === 'dealers') {
      receivedTokens[message.id] = process.hrtime(startTimes[message.id])
      if (message.responses.length !== this.nDealers) {
        console.log('Not all dealers responded my request')
        return
      }
      const request = this.requests[message.id]
      request.responses = message.responses
      if (this.nDealers === 1) {
        if (this.mode !== 'ARA2') {
          request.token = [bigInt(request.value), bigInt(message.responses[0].value)]
        } else {
          request.token = [this.maskValue(this.privateKey, request.value), this.maskValue(this.privateKey, message.responses[0].value)]
        }
      } else if (this.mode === 'ARA2') {
        request.token = [this.maskValue(this.privateKey, request.value),
          this.maskValue(this.privateKey, message.responses.reduce((x, y) => { return bigInt(x.value).multiply(bigInt(y.value)) }))]
      } else {
        request.token = [request.value,
          message.responses.reduce((x, y) => { return bigInt(x.value).add(bigInt(y.value)) })]
      }
      request.token[1] = request.token[1].mod(this.modulo)
      // Once the token has been obtained, we can ask for access.
      // Anonymous Id is added to facilitate the handling of access requests by the
      // guards in the case of network latencies. Please note it is NOT related in
      // any way and cannot be used to trace the user.
      const accessMsg = {
        anonymousId: this.generateId(6),
        kind: 'getAccess',
        token: request.token
      }
      anonynomousIdToIds[accessMsg.anonymousId] = message.id
      sendTokens[message.id] = process.hrtime()
      this.pushProxy.send(JSON.stringify(accessMsg))
    } else if (message.kind === 'guards') {
      const publicId = anonynomousIdToIds[message.id]

      receivedAccess[publicId] = process.hrtime(sendTokens[publicId])
      if (message.responses.length !== this.nGuards) {
        console.log('Not all dealers responded my request')
        return
      } else if (this.checkResponses(message.responses)) {
        console.log('Token was accepted and access granted!')
      } else {
        console.log('Token rejected, access denied')
      }
      finalTimes[publicId] = process.hrtime(startTimes[publicId])
      if (this.numberOfSimulations === Object.keys(finalTimes).length) {
        this.computeAverageTime()
      }
    }
  }

  /**
   * Generates random values to obtain a valid token from the system and sends the getToken msg to the Proxy.
   */
  sendMsgProxy () {
    this.requestsSent++
    const randomValue = this.generateRandomValue()
    const message = {
      id: 'User ' + this.generateId(6),
      kind: 'getToken',
      value: this.mode === 'ARA2' ? this.maskValue(this.publicKey, randomValue) : randomValue
    }
    this.requests[message.id] = { id: message.id, value: message.value, responses: [] }
    startTimes[message.id] = process.hrtime()
    this.pushProxy.send(JSON.stringify(message))
    if (this.requestsSent >= this.numberOfSimulations) clearInterval(this.interval)
  }

  /**
   * Returns and hex random readable Id to assign to messages.
   * @param {Number} size Number of random bytes to generate.
   * @return {string} Id
   */
  generateId (size) {
    return crypto.randomBytes(size)
      .toString('hex')
      .slice(0, size)
  }

  /**
   * Generates a random big value within the range.
   * @return {BigInteger}
   */
  generateRandomValue () {
    const value = bigInt(utils.randomDecimalString(Math.ceil(this.maxBits / 4)))
    return value.mod(this.modulo)
  }

  /**
   * Checks all the responses were valid. Returns false otherwise.
   * @param {array} responses Array of Object responses.
   * @return {boolean}
   */
  checkResponses (responses) {
    let ok = true
    for (let i = 0; i < responses.length; i++) {
      ok *= responses[i].success
    }
    return ok
  }

  /**
   * Applies a simple exponentiation to hide/reveal the homomorphic value.
   * @param key Key to use as exponent. Public to hide, private to reveal.
   * @param value Value to mask.
   * @return {BigInteger}
   */
  maskValue (key, value) {
    value = bigInt(value)
    return value.modPow(key, this.modulo)
  }

  /**
   * Computes average time per request and its standard deviation.
   * Get token comprehends between sending the message and getting a response from the dealers.
   * Get access comprehends between sending the token and receiving the response from the guards.
   * Total time includes the rest. In ARA2 mode this includes hiding/revealing the secret values.
   */
  computeAverageTime () {
    // Get values
    const valuesToken = Object.values(receivedTokens).map(this.toMiliSeconds)
    const valuesAccess = Object.values(receivedAccess).map(this.toMiliSeconds)
    const valuesTotal = Object.values(finalTimes).map(this.toMiliSeconds)

    // Compute mean
    const averageRequestTokenTime = (valuesToken.reduce((x, y) => { return x + y }) / this.numberOfSimulations).toFixed(2)
    const averageRequestAccess = (valuesAccess.reduce((x, y) => { return x + y }) / this.numberOfSimulations).toFixed(2)
    const averageTotalTime = (valuesTotal.reduce((x, y) => { return x + y }) / this.numberOfSimulations).toFixed(2)

    // Compute standard Deviation
    const stdRequestTokenTime = utils.standardDeviation(valuesToken, averageRequestTokenTime).toFixed(2)
    const stdRequestAccess = utils.standardDeviation(valuesAccess, averageRequestAccess).toFixed(2)
    const stdTotalTime = utils.standardDeviation(valuesTotal, averageTotalTime).toFixed(2)

    console.log('Average Request Token Time: %fms +- %fms', averageRequestTokenTime, stdRequestTokenTime)
    console.log('Average Request Access Time: %fms +- %fms', averageRequestAccess, stdRequestAccess)
    console.log('Average Total Time: %fms +- %fms', averageTotalTime, stdTotalTime)
    if (this.saveCsv) {
      console.log('Saving runtimes to CSV')
      this.exportToCSV(averageRequestTokenTime, stdRequestTokenTime, averageRequestAccess, stdRequestAccess, averageTotalTime, stdTotalTime)
    }
    process.exit(0)
  }

  /**
   * Saves the values to a CSV file.
   * @param request Time in ms to get the token.
   * @param stdRequest Standard deviation of request time, in ms.
   * @param access Time in ms to get the access to the resource.
   * @param stdAccess Standard deviation of access time, in ms.
   * @param total Total time in ms.
   * @param stdTotal Standard deviation of total time, in ms.
   */
  exportToCSV (request, stdRequest, access, stdAccess, total, stdTotal) {
    const name = './data/times_dealers_' + this.nDealers + '_guards_' + this.nGuards + '_bitsize_' + this.maxBits + '_mode_' + this.mode + '.csv'
    const header = 'tokenTime,stdToken,accessTime,stdAccess,totalTime,stdTotal\n'
    const log = fs.createWriteStream(name)
    log.write(header)
    log.write([request, stdRequest, access, stdAccess, total, stdTotal].join())
    log.end()
  }

  /**
   * Computes the time in ms given the process.hrtime format.
   * @param {array} time Time array.
   * @return {number} Time in ms.
   */
  toMiliSeconds (time) {
    return time[0] * 1000 + time[1] / 1000000
  }
}

module.exports = User

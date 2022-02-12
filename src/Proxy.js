// Required Packages
require('dotenv').config()
const zmq = require('zeromq')

// Required Classes

class Proxy {
  constructor (address) {
    this.address = process.env.PROXY_ADDRESS || address
    this.portPull = process.env.PROXY_PORT_PULL
    this.portPubDealers = process.env.PROXY_PORT_PUB_DEALERS
    this.portPubGuards = process.env.PROXY_PORT_PUB_GUARDS
    this.nDealers = process.env.N_DEALERS
    this.nGuards = process.env.N_GUARDS
    this.pullUsers = zmq.socket('pull')
    this.pubDealers = zmq.socket('pub')
    this.pubGuards = zmq.socket('pub')
    this.pullDealers = []
    this.pullGuards = []
    for (let i = 0; i < this.nDealers; i++) {
      this.pullDealers.push(zmq.socket('pull'))
    }
    for (let i = 0; i < this.nGuards; i++) {
      this.pullGuards.push(zmq.socket('pull'))
    }
  }

  async init () {
    // Bind sockets
    await this.pullUsers.connect('tcp://' + this.address + ':' + this.portPull)
    await this.pubDealers.bind('tcp://' + this.address + ':' + this.portPubDealers)
    await this.pubGuards.bind('tcp://' + this.address + ':' + this.portPubGuards)
    this.pullUsers.on('message', (msg) => this.handleUser(msg))
    this.pubDealers.on('message', (msg) => this.handleDealer(msg))
    this.pubGuards.on('message', (msg) => this.handleGuard(msg))
  }

  handleUser (msg) {

  }

  handleDealer (msg) {

  }

  handleGuard (msg) {

  }

}

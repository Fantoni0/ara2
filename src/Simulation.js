#!/usr/bin/node
// Required Classes
const Dealer = require('./Dealer')
const Guard = require('./Guard')
const Proxy = require('./Proxy')
const User = require('./User')

// Required packages
const minimist = require('minimist')
//const { exec } = require('child_process');
require('dotenv').config()

// Get arguments
const args = minimist(process.argv.slice(2), {})
// Read Args
const dealers = args.hasOwnProperty('d') ? args['d'] : 3
const guards = args.hasOwnProperty('g') ? args['g'] : 4
const bitsize = args.hasOwnProperty('b') ? args['b'] : 128
const modulo = args.hasOwnProperty('p') ? BigInt(args['p']) : BigInt(373587923)
const mode = args.hasOwnProperty('m') ? args['m'] : 'ARA2'
const requests = args.hasOwnProperty('r') ? args['r'] : 10

// Prepare params
const maxDegree = BigInt(2**bitsize - 1)
const dealersIps = process.env["DEALER_ADDRESSES"].split(',')
const dealersPush = process.env["DEALER_PORTS_PUSH"].split(',')
const dealersPub = process.env["DEALERS_PORTS_PUB"].split(',')
const guardsIps = process.env["GUARD_ADDRESSES"].split(',')
const guardsPush = process.env["GUARD_PORTS_PUSH"].split(',')
const guardsPub = process.env["GUARD_PORTS_PUB"].split(',')
const proxyAddress = process.env["PROXY_ADDRESS"]
const proxyPortPull = process.env["PROXY_PORT_PULL"]
const proxyPortPubDealers = process.env["PROXY_PORT_PUB_DEALERS"]
const proxyPortPubGuards = process.env["PROXY_PORT_PUB_GUARDS"]
const userAddress = process.env["USER_ADDRESS"]
const userPortPull = process.env["USER_PORT_PULL"]

const params = {
  maxBits: bitsize,
  maxDegree: maxDegree,
  modulo: modulo,
  mode: mode,
  dealersIps: dealersIps,
  guardsIps: guardsIps,
  dealersPushPorts: dealersPush,
  guardsPushPorts: guardsPush,
  guardsPubPorts: guardsPub,
  dealersPorts: dealersPub,
  proxyAddress: proxyAddress,
  proxyPortPubDealers: proxyPortPubDealers,
  proxyPortPubGuards: proxyPortPubGuards,
  userAddress: userAddress,
  userPortPull: userPortPull
}

// Launch services

for (let i = 0; i < dealers; i++) {
  let dealer = new Dealer (i+1,
      dealersIps[i],
      dealersPush[i],
      dealersPub[i],
      guards,
      params);
  dealer.init().then(() => {
    console.log("Dealer: " + i + " launched!")
    console.log("DEALER SECRET = ", dealer.secret)
  })
}

setTimeout(() => {
  for (let i = 0; i < guards; i++) {
    let guard = new Guard (i + 1,
        guardsIps[i],
        guardsPush[i],
        guardsPub[i],
        dealers,
        guards,
        params)
    guard.init().then(() => {
      console.log("Guard: " + i + " launched!")
    })
  }
}, 500)

setTimeout(() => {
  const proxy = new Proxy (
    proxyAddress,
    proxyPortPull,
    dealers,
    guards,
    proxyPortPubDealers,
    proxyPortPubGuards,
    params
  )
  proxy.init().then(() => {
    console.log("Proxy Launched")
  })
}, 2000)

setTimeout(() => {
  let user = new User (
    process.env["USER_ADDRESS"],
    proxyAddress,
    proxyPortPull,
    requests,
    dealers,
    guards,
    params
  )
  user.init().then(() => {
    console.log("User launched!")
  })
}, 1000)




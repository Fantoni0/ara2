#!/usr/bin/node
// Required Classes
const Dealer = require('./Dealer')
const Guard = require('./Guard')
const Proxy = require('./Proxy')
const User = require('./User')

// Required packages
const minimist = require('minimist')
const bigInt = require("big-integer")
const pki = require("node-forge").pki
require('dotenv').config()

async function main () {
  // Get arguments
  const args = minimist(process.argv.slice(2), {})
  // Read Args
  let dealers = args.hasOwnProperty('d') ? args['d'] : 3
  const guards = args.hasOwnProperty('g') ? args['g'] : 4
  const bitsize = args.hasOwnProperty('b') ? args['b'] : 128
  let modulo = args.hasOwnProperty('p') ? bigInt(args['p']) : bigInt(462207533141321858521034268872949100003501064283969424571203199625200790904528665312085432749689919844709064669020283483491108239844664705876706683342363657469352285872422737372794710712357356344712767934360280763680081306380601090679312617239879311621468637831759236216378242315469885828242702423237)
  const mode = args.hasOwnProperty('m') ? args['m'].toUpperCase() : 'ARA2'
  const requests = args.hasOwnProperty('r') ? args['r'] : 10
  const saveCsv = args.hasOwnProperty('s') ? 1 : 0

  // Check the mode is a valid one
  if (["TRA2", "TDRA2", "ARA2"].indexOf(mode) < 0) {
    console.log("Invalid mode of operation. Valid modes are: \"TRA2\", \"TDRA2\" and \"ARA2\"")
    process.exit()
  }
  // Check mode to enforce a single centralized entity.
  if (mode === "TRA2") {
    dealers = 1
  }

  // Prepare params
  const maxDegree = bigInt(2).pow(bigInt(bitsize)).minus(1)
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

  // Generate public/private key
  let privateKey
  let publicKey
  if (mode === "ARA2") {
    console.log("WARNING! Using ARA2 will over-write the user selected modulus")
    console.log("Generating RSA keys. This may take a while...")
    const pair = await pki.rsa.generateKeyPair(this.maxBits)
    modulo = bigInt(pair.publicKey.n.toString())
    privateKey = bigInt(pair.privateKey.d.toString())
    publicKey = bigInt(pair.publicKey.e.toString())
  }

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
      console.log("Dealer: " + (i+1) + " launched!")
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
        console.log("Guard: " + (i+1) + " launched!")
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
  }, 500)

  console.log("Waiting 5 seconds to let Dealers and Guard Sync before launching requests...")

  setTimeout(() => {
    let user = new User (
      process.env["USER_ADDRESS"],
      proxyAddress,
      proxyPortPull,
      requests,
      dealers,
      guards,
      privateKey,
      publicKey,
      params,
      saveCsv
    )
    user.init().then(() => {
      console.log("User launched!")
    })
  }, 5000)

  return "All the processes launched correctly"
}


// Call main
main()
  .then((text) =>{
  console.log(text)
  })
  .catch(err => {
    console.log(err)
  })

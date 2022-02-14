#!/usr/bin/node
// Required Classes
const Dealer = require('./Dealer')
const Guard = require('./Guard')
const Proxy = require('./Proxy')

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

// Prepare params
const maxDegree = BigInt(2**bitsize - 1)
const dealersIps = process.env["DEALER_ADDRESSES"].split(',')
const dealersPush = process.env["DEALER_PORTS_PUSH"].split(',')
const dealersPub = process.env["DEALERS_PORTS_PUB"].split(',')
const guardsIps = process.env["GUARD_ADDRESSES"].split(',')
const guardsPush = process.env["GUARD_PORTS_PUSH"].split(',')

const params = {
  maxBits: bitsize,
  maxDegree: maxDegree,
  modulo: modulo,
  mode: mode,
  dealersIps: dealersIps,
  dealersPorts: dealersPub
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
    if (mode === 'ARA'){
      console.log("DEALER SECRET = ", dealer.secret)
    } else {
      console.log("DEALER SECRET= ")
      dealer.secret.forEach((v,k) => {console.log("[" + k.toString() + "]", v.toString())})
    }
  })
}
setTimeout(() => {
  for (let i = 0; i < guards; i++) {
    let guard = new Guard (i + 1,
        guardsIps[i],
        guardsPush[i],
        dealersPub[i],
        dealers,
        params)
    guard.init().then(() => {
      console.log("Guard: " + i + " launched!")
      if (mode === 'ARA'){
        console.log("GUARD SECRET = ", guard.secret)
      } else {
        console.log("GUARD SECRET= ")
        guard.secret.forEach((v,k) => {console.log("[" + k.toString() + "]", v.toString())})
      }
    })
  }
}, 4000)


function launchCommand (command) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout:\n${stdout}`);
  });
}



// Required packages
const minimist = require('minimist');
const { exec } = require('child_process');
require('dotenv').config()

// Required Classes
const Dealer = require('./Dealer')
const Guard = require('./Guard')
const Proxy = require('./Proxy')

// Get arguments
const args = minimist(process.argv.slice(2), {})
// Read Args
const dealers = args.hasOwnProperty('d') ? args['d'] : 3
const guards = args.hasOwnProperty('g') ? args['g'] : 4
const bytesize = args.hasOwnProperty('b') ? args['b'] : 128
const modulo = args.hasOwnProperty('p') ? BigInt(args['p']) : BigInt(373587923)
const mode = args.hasOwnProperty('m') ? args['m'] : 'ARA2'

// Prepare params
const maxDegree = BigInt(2**bytesize - 1)
const dealersIps = process.env["DEALER_ADDRESSES"].split(',')
const dealersPush = process.env["DEALER_PORTS_PUSH"].split(',')
const dealersPub = process.env["DEALERS_PORTS_PUB"].split(',')
const guardsIps = process.env["GUARD_ADDRESSES"].split(',')
const guardsPush = process.env["GUARD_PORTS_PUSH"].split(',')

const params = {
  maxBytes: bytesize,
  maxDegree: maxDegree,
  modulo: modulo,
  mode: mode,
  dealersIps: 2,
  dealersPorts: 1
}
// Launch services
for (let i = 0; i < dealers; i++) {
  new Dealer(i, dealersIps[i], dealersPush[i], dealersPub[i], )
  //launchCommand('node Dealer.js ')
}

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



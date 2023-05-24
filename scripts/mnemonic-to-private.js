const readline = require('node:readline/promises');
const ethers = require('ethers');

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.error('Please set the MNEMONIC environment variable.');
    process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(mnemonic);

console.log(wallet.privateKey);

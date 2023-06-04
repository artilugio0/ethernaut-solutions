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

echo "[INFO] Deploying exploit..." >&2
EXPLOIT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit \
    --constructor-args "$CONTRACT_ADDRESS" \
    | grep "Deployed to:" \
    | awk '{print $3}')

echo "[INFO] Checking switch..." >&2
SWITCH=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "switchOn()(bool)")

if [ "$SWITCH" != "true" ]
then
    echo "[ERROR] Could not set entrant" >&2
    exit 1
fi

echo "solved!"

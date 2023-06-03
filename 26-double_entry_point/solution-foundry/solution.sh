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

echo "[INFO] Getting contracts addressess.." >&2
CRYPTOVAULT_ADDRESS=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "cryptoVault()(address)")
echo "[INFO] CryptoVault: $CRYPTOVAULT_ADDRESS" >&2

FORTA_ADDRESS=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "forta()(address)")
echo "[INFO] Forta: $FORTA_ADDRESS" >&2

echo "[INFO] Deploying bot contract..." >&2
BOT_ADDRESS=$(forge create \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    src/Bot.sol:Bot \
    --constructor-args "$CRYPTOVAULT_ADDRESS" "$FORTA_ADDRESS" \
    | grep "Deployed to:" \
    | awk '{print $3}')

if [ $? -ne 0 ] || [ -z "$BOT_ADDRESS" ]
then
    echo "[ERROR] Bot contract deployment failed" >&2
    exit 1
fi
echo "[INFO] Contract deployed to $BOT_ADDRESS" >&2

echo "[INFO] Setting detection bot..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    "$FORTA_ADDRESS" \
    "setDetectionBot(address)" \
    "$BOT_ADDRESS"

if [ $? -ne 0 ]
then
    echo "[ERROR] Could not set detection bot" >&2
    exit 1
fi

echo "solved!"

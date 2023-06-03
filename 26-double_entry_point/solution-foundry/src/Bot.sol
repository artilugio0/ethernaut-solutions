pragma solidity 0.8.19;

import "forge-std/console.sol";

interface IForta {
    function setDetectionBot(address detectionBotAddress) external;
    function raiseAlert(address user) external;
}

contract Bot {
    address public cryptoVault;
    IForta public forta;

    constructor(
        address _cryptoVault,
        address _forta
    ) {
        cryptoVault = _cryptoVault;
        forta = IForta(_forta);
        forta.setDetectionBot(address(this));
    }

    function handleTransaction(address _user, bytes calldata _msgData) external {
        if (_msgData.length < 4 + 32 + 32 + 32) {
            return;
        }

        address originalSender = address(bytes20(_msgData[4+32+32+12:4+32+32+32]));

        bool shouldAlert = originalSender == cryptoVault;

        if (shouldAlert) {
            forta.raiseAlert(_user);
        }
    }
}

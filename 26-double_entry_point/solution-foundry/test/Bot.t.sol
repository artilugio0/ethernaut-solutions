pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "src/Bot.sol";

contract BotTest is Test {
    address constant CRYPTO_VAULT = 0x2222222222222222222222222222222222222222;
    address constant RECIPIENT = 0x3333333333333333333333333333333333333333;

    Bot bot;
    MockForta mockForta;

    function setUp() public {
        mockForta = new MockForta();
        bot = new Bot(CRYPTO_VAULT, address(mockForta));
    }

    function test_setDetectionBot() public {
        assertEq(mockForta.detectionBotAddress(), address(bot));
    }

    function test_handleTransactionOriginalSenderCryptoVault_Alerts() public {
        bytes memory data = abi.encodeWithSignature(
            "delegateTransfer(address,uint256,address)",
            RECIPIENT,
            10000,
            CRYPTO_VAULT
        );

        bot.handleTransaction(address(this), data);
        assert(mockForta.alertWasRaised());
    }
}

contract MockForta is IForta {
    bool public alertWasRaised;
    address public detectionBotAddress;

    function setDetectionBot(address _detectionBotAddress) public {
        detectionBotAddress = _detectionBotAddress;
    }

    function raiseAlert(address) public {
        alertWasRaised = true;
    }
}

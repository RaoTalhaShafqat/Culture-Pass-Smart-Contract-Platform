// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {MockSafe} from "../test/mocks/MockSafe.sol";

abstract contract CodeConstants {
    uint256 public constant ANVIL_CHAIN_ID = 31337;
    uint256 public constant ETH_SEPOLIA_CHAIN_ID = 11155111;
}

contract HelperConfig is CodeConstants {
    struct NetworkConfig {
        address safe;
    }
    NetworkConfig public activeConfig;

    constructor(address mockSafe) {
        if (block.chainid == ANVIL_CHAIN_ID) {
            activeConfig = _getAnvilConfig(mockSafe);
        } else if (block.chainid == ETH_SEPOLIA_CHAIN_ID) {
            activeConfig = _getSepoliaConfig();
        } else {
            revert("Unsupported chain");
        }
    }

    function _getAnvilConfig(address mockSafe) internal pure returns (NetworkConfig memory) {
        return NetworkConfig({safe: mockSafe});
    }

    function _getSepoliaConfig() internal pure returns (NetworkConfig memory) {
        return NetworkConfig({
            safe: 0x0000000000000000000000000000000000000000 // replace with real Safe
        });
    }
}

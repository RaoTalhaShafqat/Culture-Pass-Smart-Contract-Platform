// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TicketToken} from "../src/TicketToken.sol";
import {Script} from "forge-std/Script.sol";
import {TicketToken} from "../src/TicketToken.sol";

/**
 * @title DeployTicketToken script for deploying the TicketToken contract.
 * @author Rao Talha Shafqat
 * @notice This script deploys the TicketToken contract.
 * @dev This script uses Foundry's Script functionality to deploy the TicketToken contract.
 */
contract DeployTicketToken is Script {
    function run() external returns (TicketToken) {
        vm.startBroadcast();
        TicketToken ticketToken = new TicketToken();
        vm.stopBroadcast();
        return ticketToken;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";

import {CulturePass} from "../src/CulturePass.sol";
import {TicketToken} from "../src/TicketToken.sol";
import {HelperConfig} from "./HelperConfig.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployCulturePass script for deploying the CulturePass contract.
 * @author Rao Talha Shafqat
 * @notice This script deploys the CulturePass contract using an ERC1967Proxy for upgradeability.
 * @dev This script uses Foundry's Script functionality to deploy the CulturePass contract. It retrieves the necessary configuration from the HelperConfig contract and deploys the CulturePass implementation and proxy contracts.
 */
contract DeployCulturePass is Script {
    CulturePass public s_cPass; //This will become proxy
    TicketToken public s_ticketToken;
    address public s_safeAddress;

    function run() external {
        address safe = vm.envAddress("SAFE_ADDRESS");

        deploy(safe);
    }

    function deploy(
        address _safeAddress
    ) public returns (CulturePass, TicketToken) {
        s_safeAddress = _safeAddress;
        vm.startBroadcast();
        s_ticketToken = new TicketToken();
        CulturePass impl = new CulturePass();

        bytes memory data = abi.encodeCall(
            CulturePass.initialize,
            (address(s_ticketToken), s_safeAddress)
        );
        s_cPass = CulturePass(
            payable(address(new ERC1967Proxy(address(impl), data)))
        );
        s_ticketToken.setCulturePassAddress(address(s_cPass));
        s_ticketToken.transferOwnership(s_safeAddress);
        vm.stopBroadcast();

        return (s_cPass, s_ticketToken);
    }
}

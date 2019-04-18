pragma solidity ^0.5.0;

import "./Hub.sol";

contract HubFactory {

    event Spawn(address indexed newHub, address newHubOwner);

    function spawn(
        uint256 issuance, uint256 demurrage, uint8 decimals, string memory symbol, uint256 limitEpoch, uint256 initialPayout
    ) public returns (bool) {
        Hub newHub = new Hub(msg.sender, issuance, demurrage, decimals, symbol, limitEpoch, initialPayout);
        emit Spawn(address(newHub), msg.sender);
        return true;
    }
}

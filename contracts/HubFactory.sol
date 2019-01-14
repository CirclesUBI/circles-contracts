pragma solidity ^0.5.0;

import "./Hub.sol";

contract HubFactory {

    event Fork(address indexed newHub, address newHubOwner);

    function fork(
        uint256 issuance, uint256 demurrage, uint8 decimals, string memory symbol, uint256 limitEpoch
    ) public returns (bool) {
        Hub newHub = new Hub(msg.sender, issuance, demurrage, decimals, symbol, limitEpoch);
	    emit Fork(address(newHub), msg.sender);
	    return true;
    }
}

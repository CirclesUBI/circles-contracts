pragma solidity ^0.4.24;

import "./Hub.sol";

contract HubFactory {
    event Fork(address indexed newHub, address newHubOwner);

    function fork(uint256 issuance, uint256 demurrage, uint8 decimals, string symbol,	uint256 limitEpoch) public returns (bool) {
        Hub newHub = new Hub(msg.sender, issuance, demurrage, decimals, symbol, limitEpoch);
	    emit Fork(address(newHub), msg.sender);
	    return true;
    }
}

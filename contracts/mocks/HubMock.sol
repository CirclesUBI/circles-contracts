pragma solidity ^0.5.0;

import "../Hub.sol";

contract ERC20DetailedMock is Hub {

  constructor(address _owner, uint256 _issuance, uint256 _demurrage, uint8 _decimals, string memory _symbol, uint256 _limitEpoch)
    Hub(_owner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch) public {

  }
}

pragma solidity ^0.4.24;

import "../TimeIssuedToken.sol";

contract ERC20DetailedMock is TimeIssuedToken {
  constructor(string _name, string _symbol, uint8 _decimals)
    TimeIssuedToken(address(0), 0, _name, _symbol, _decimals) public {
  }
}

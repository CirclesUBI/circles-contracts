pragma solidity ^0.4.24;

import "../CirclesToken.sol";

contract ERC20DetailedMock is CirclesToken {
  constructor(string _name, string _symbol, uint8 _decimals) CirclesToken(address(0), _name, _symbol, _decimals) public {
  }
}

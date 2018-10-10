pragma solidity ^0.4.24;

import "../TimeIssuedToken.sol";

contract ERC20Mock is TimeIssuedToken {
  uint256 _initialBalance;

  constructor( address initialAccount, uint256 initialBalance )
    TimeIssuedToken(initialAccount, 0, "_", "_", 0) public {
    _initialBalance = initialBalance;
  }

  function totalSupply() public view returns (uint256) {
    return super.totalSupply() + _initialBalance;
  }
}

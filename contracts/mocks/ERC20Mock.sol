pragma solidity ^0.4.24;

import "../TimeIssuedToken.sol";

contract ERC20Mock is TimeIssuedToken(address(0), 0, "_", "_", 0) {
  uint256 _initialBalance;

  constructor( address initialAccount, uint256 initialBalance ) public {
    balances[initialAccount] = initialBalance;
    _initialBalance = initialBalance;
  }

  function totalSupply() public view returns (uint256) {
    return _initialBalance;
  }
}

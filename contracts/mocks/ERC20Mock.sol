pragma solidity ^0.4.24;

import "../CirclesToken.sol";

contract ERC20Mock is CirclesToken(address(0), "_", "_", 0) {
  uint256 _initialBalance;

  constructor(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    _initialBalance = initialBalance;
  }

  function totalSupply() public view returns (uint256) {
    return _initialBalance;
  }

}

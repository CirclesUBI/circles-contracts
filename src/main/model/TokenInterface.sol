pragma solidity ^0.4.24;

interface TokenInterface {
  function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);
}

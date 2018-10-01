pragma solidity ^0.4.24;

interface PersonInterface {
  function __circles_approveExchange(address _offeredToken, uint256) external view returns (bool approved);
}

pragma solidity ^0.4.24;

contract CirclesPerson {

  // TODO: Allow a person to spend ERC20s / send arbitrary transactions.
  //  This is essentially a proxy contract like uPort uses.

  // TODO: Add limits
  mapping (address => bool) isTokenTrusted;

  function updateRelationship(address _token, bool _isTrusted) public returns (bool success) {
    require( msg.sender == address(this), "Not authorized" );
    isTokenTrusted[_token] = _isTrusted;
    return true;
  }

  function __circles_approveExchange(address _offeredToken, uint256) public view returns (bool approved) {
    return isTokenTrusted[_offeredToken];
  }

}

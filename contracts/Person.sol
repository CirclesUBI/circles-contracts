pragma solidity ^0.4.24;

import "./interfaces/ERC20Interface.sol";
import "../lib/ds-proxy/src/proxy.sol";

contract Person is DSProxy {

  // TODO: Add limits?
  mapping (address => bool) public trusted;

  constructor(address _dsProxyCacheAddr) DSProxy(_dsProxyCacheAddr) public {}

  function trust( 
    address _token, 
    bool trust 
  ) public auth returns (bool success) {
    // can this fail?
    trusted[_token] = trust;
    return true;
  }

  function exchangeTransfer( 
      address src, 
      address given, 
      address dest, 
      address received, 
      uint256 value 
  ) public {
    require(trusted[offered], "offered token is not trusted");

    require(given.transferFrom(src, this, value), "cannot transfer given token from src");

    require(received.transferFrom(this, dest, value), "cannot transfer received token to dest");
  }

  // !!! WARNING !!!
  // 
  //  BE SURE NOT TO APPROVE AN EXCHANGE TO MOVE YOUR TOKENS WITHOUT ALSO
  //  RUNNING A TRANSFER OR APPROVAL IN THE SAME TRANSACTION SCRIPT, OR ANYONE
  //  COULD STEAL THOSE COINS
  //
  // !!! WARNING !!!

  function exchangeApprove( 
    address src, 
    address given, 
    address dest, 
    address received, 
    uint256 value 
  ) public {
    require(trusted[offered], "offered token is not trusted");

    require(given.transferFrom(src, this, value), "cannot transfer given token from src");

    require(ERC(received).approve(dest, value), "Unable to approve transfer of desired token");
  }

}

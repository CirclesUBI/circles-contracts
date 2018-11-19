pragma solidity ^0.4.24;

import "./interfaces/ERC20Interface.sol";
import "../lib/ds-proxy/src/proxy.sol";

contract Person is DSProxy {
  // TODO: Add limits?
  mapping (address => bool) public isEligableExchangeInput;
  // TODO: Add exchange rates?
  mapping (address => bool) public isEligableExchangeOutput;

  constructor(address _dsProxyCacheAddr) DSProxy(_dsProxyCacheAddr) public {
  }

  function updateExchangeInput( address _token
                              , bool _isTrusted ) public
			                            auth
                                                      returns (bool success) {

    isEligableExchangeInput[_token] = _isTrusted;
    return true;
  }

  function updateExchangeOutput( address _token
                               , bool _isTrusted ) public
			                             auth
                                                       returns (bool success) {

    isEligableExchangeOutput[_token] = _isTrusted;
    return true;
  }

  function isExchangeApproved( address _offeredToken
                             , address _desiredToken ) public view
			                                 returns (bool) {

    return
      isEligableExchangeInput[_offeredToken]
      && isEligableExchangeOutput[_desiredToken];
  }

  modifier _exchangePrerequisites( address _offeredToken
                                 , address _desiredToken
                                 , address _source
                                 , uint256 _value ) {

    require( isExchangeApproved(_offeredToken, _desiredToken)
           , "Offered token not accepted at this time"
    );

    require( ERC20Interface(_offeredToken).transferFrom(_source, address(this), _value)
           , "Unable to transfer offered token"
    );

    _;
  }

  // !!! WARNING !!!
  // 
  //  BE SURE NOT TO APPROVE AN EXCHANGE TO MOVE YOUR TOKENS WITHOUT ALSO
  //  RUNNING A TRANSFER OR APPROVAL IN THE SAME TRANSACTION SCRIPT, OR ANYONE
  //  COULD STEAL THOSE COINS
  //
  // !!! WARNING !!!

  function exchangeTransfer( address _offeredToken
                           , address _desiredToken
                           , address _source
                           , address _destination 
                           , uint256 _value )
      public 
      _exchangePrerequisites(_offeredToken, _desiredToken, _source, _value)
      returns (bool success) {

    require( ERC20Interface(_desiredToken).transfer(_destination, _value)
           , "Unable to transfer desired token"
    );

    return true;
  }

  function exchangeApprove( address _offeredToken
                          , address _desiredToken
                          , address _source
                          , address _destination
                          , uint256 _value )
      public
      _exchangePrerequisites(_offeredToken, _desiredToken, _source, _value) 
      returns (bool success) {

    require( ERC20Interface(_desiredToken).approve(_destination, _value)
           , "Unable to approve transfer of desired token"
    );

    return true;
  }

}

pragma solidity ^0.4.24;

import "./interfaces/TokenInterface.sol";

contract CirclesPerson {

  // TODO: Add limits?
  mapping (address => bool) public isEligableExchangeInput;
  // TODO: Add exchange rates?
  mapping (address => bool) public isEligableExchangeOutput;
  // TODO: use auth lib
  address owner;

  constructor() public {
    owner = msg.sender;
  }

  //TODO: Update owner mechanism
  function updateExchangeInput( address _token
                              , bool _isTrusted ) public
                                                    returns (bool success) {

    require( msg.sender == owner, "Not authorized" );
    isEligableExchangeInput[_token] = _isTrusted;
    return true;
  }

  function updateExchangeOutput( address _token
                               , bool _isTrusted ) public
                                                     returns (bool success) {

    require( msg.sender == owner, "Not authorized" );
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

  // TODO: modifier instead of internal function? and spellcheck, lol
  function _exchangePrerequisates( address _offeredToken
                                 , address _desiredToken
		                 , uint256 _value         ) internal {

    require( isExchangeApproved(_offeredToken, _desiredToken)
           , "Offered token not accepted at this time"
    );

    require( TokenInterface(_offeredToken)
               .transferFrom(msg.sender, this, _value)
           , "Unable to transfer offered token"
    );
  }

  function exchangeTransfer( address _offeredToken
                           , address _desiredToken
                           , address _destination, uint256 _value ) public {

    _exchangePrerequisates(_offeredToken, _desiredToken, _value);

    require( TokenInterface(_desiredToken).transfer(_destination, _value)
           , "Unable to transfer desired token"
    );
  }

  function exchangeApprove( address _offeredToken
                          , address _desiredToken
                          , address _destination, uint256 _value ) public {

    _exchangePrerequisates(_offeredToken, _desiredToken, _value);

    require( TokenInterface(_desiredToken).approve(_destination, _value)
           , "Unable to approve transfer of desired token"
    );
  }

}

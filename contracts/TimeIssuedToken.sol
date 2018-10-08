pragma solidity ^0.4.24;

// TODO: Ability to update issuance rate
// TODO: Overflow protection
import "./interfaces/ERC20Interface.sol";

contract TimeIssuedToken is ERC20Interface {

  string public name;
  string public symbol;
  uint8 public decimals;
  address person;               // Reciever of time-generated tokens
  uint256 issuanceRate;         // Tokens generated per TODO milisecond?
  uint256 rateUpdatedTimestamp; // Last time issuanceRate was updated

  constructor( address _person, uint256 _issuanceRate
             , string _name, string _symbol, uint8 _decimals ) public {

    rateUpdatedTimestamp = now;

    person       = _person;
    issuanceRate = _issuanceRate;
    name         = _name;
    symbol       = _symbol;
    decimals     = _decimals;

  }

  ///////
  // Optional ERC20 Functions
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
  ///////

  function name() public view
                    returns (string) {
    return name;
  }

  function symbol() public view
                      returns (string) {
    return symbol;
  }

  function decimals() public view
                        returns (uint8) {
    return decimals;
  }

  ///////
  // Required ERC20 functions
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
  ///////

  function totalSupply() public view
                           returns (uint256) {

    return (now - rateUpdatedTimestamp) * issuanceRate;
  }

  uint256 heldElsewhere;
  mapping (address => uint256) balances;

  function balanceOf( address _owner ) public view
                                         returns (uint256 balance) {

    if ( _owner == person ) {
      return totalSupply() - heldElsewhere;
    } else {
      return balances[_owner];
    }
  }

  // TODO: Change to modifier?
  function _transfer( address _from
                    , address _to
                    , uint256 _value ) internal
		                         returns (bool success) {

    require( balanceOf(_from) >= _value, "Insufficient balance" );

    // decrement _from balance
    if ( _from == person ) {
      heldElsewhere = heldElsewhere + _value;
    } else {
      balances[_from] = balances[_from] - _value;
    }

    // increment _to balance
    if ( _to == person ) {
      heldElsewhere = heldElsewhere - _value;
    } else {
      balances[_to] = balances[_to] + _value;
    }

    emit Transfer(_from, _to, _value);
    return true;
  }

  function transfer( address _to, uint256 _value ) public
		                                     returns (bool success) {
    return _transfer(msg.sender, _to, _value);
  }

  mapping (address => mapping (address => uint256)) public allowances;

  function transferFrom( address _from
                       , address _to
		       , uint256 _value ) public
		                            returns (bool success) {

    require( allowances[_from][msg.sender] >= _value, "transferFrom: not authorized" );
    allowances[_from][msg.sender] = allowances[_from][msg.sender] - _value;
    return _transfer(_from, _to, _value);
  }

  function approve( address _spender
                  , uint256 _value   ) public
                                         returns (bool success) {

    allowances[msg.sender][_spender] = _value;

    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance( address _owner
                    , address _spender ) public view
		                           returns (uint256 remaining) {

    return allowances[_owner][_spender];
  }

}

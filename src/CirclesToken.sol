pragma solidity ^0.4.24;

// TODO: Fix external function calls
// TODO: Ability to update issuance rate
// TODO: Overflow protection
import "./CirclesPerson.sol";

contract CirclesToken {

  address person; // Identifier of the token owner
  uint256 rateUpdatedTimestamp; // Last time the generation rate was updated

  constructor(address _person) public {
    person = _person;
    rateUpdatedTimestamp = now;
  }

  ///////
  // Optional ERC20 Functions
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
  ///////

  // TODO: Optional - Figure out address to string conversion
  //function name() view returns (string name) {
  //  return "Circles" + person.toString();
  //}

  // TODO: Optional - Implement?
  // IDK if there is something short enough that would make sense here
  //function symbol view() returns (string symbol) {
  //  return "CIR"
  //}

  // TODO: Optional - Choose, with issuanceRate
  function decimals() public pure returns (uint8 _decimals) {
    return 18;
  }

  ///////
  // Required ERC20 functions
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
  ///////

  //TODO: Choose, with decimals()
  uint256 constant issuanceRate = 1;

  //TODO: non-continuous payout?
  function totalSupply() public view returns (uint256 _totalSupply) {
    return (now - rateUpdatedTimestamp) * issuanceRate;
  }

  uint256 heldElsewhere;
  mapping (address => uint256) balances;

  function balanceOf(address _owner) public view returns (uint256 balance) {
    if (_owner == person) {
      return totalSupply() - heldElsewhere;
    } else {
      return balances[_owner];
    }
  }

  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  function _transfer(address _from, address _to, uint256 _value) internal returns (bool success) {
    require( balanceOf(_from) >= _value, "Insufficient balance" );

    // decrement _from balance
    if (_from == person) {
      heldElsewhere = heldElsewhere + _value;
    } else {
      balances[_from] = balances[_from] - _value;
    }

    // increment _to balance
    if (_to == person) {
      heldElsewhere = heldElsewhere - _value;
    } else {
      balances[_to] = balances[_to] + _value;
    }

    emit Transfer(_from, _to, _value);
    return true;
  }

  function transfer(address _to, uint256 _value) public returns (bool success) {
    return _transfer(msg.sender, _to, _value);
  }

  mapping (address => mapping (address => uint256)) public allowances;

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
    require( allowances[_from][msg.sender] >= _value, "Not authorized" );
    allowances[_from][msg.sender] = allowances[_from][msg.sender] - _value;
    return _transfer(msg.sender, _to, _value);
  }

  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  function approve(address _spender, uint256 _value) public returns (bool success) {
    allowances[msg.sender][_spender] = _value;

    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
    return allowances[_owner][_spender];
  }

  ///////
  // Support trusted currency exchanges for transitive payments
  ///////

  // TODO: Worry about accounts that may have a __circles_approveExchange function?
  // Note: Theoretically a user could trust a non-circles ERC20 and offer 1-to-1 exchanges between other non-circles crypto.
  //  I actually think this is some pretty neat functionality!
  function exchange(address _offeredToken, address _offeredBy, address _offeredTo, uint256 _value) public returns (bool success) {
    require( _offeredToken.call("transferFrom", _offeredBy, _offeredTo, _value), "Unable to transfer offered token" );
    require( _offeredTo.call("__circles_approveExchange", _offeredToken, _value), "Offered token not accepted at this time" );
    require( _transfer(_offeredTo, _offeredBy, _value), "Unable to transfer desired token" );
    return true;
  }

}

pragma solidity ^0.4.24;

contract CirclesToken {

  address person;
  uint256 rateUpdatedTimestamp;

  constructor(address _person) public {
    person = _person;
    rateUpdatedTimestamp = now;
  }

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
  function decimals() view returns (uint8 decimals) {
    return 18;
  }

  //TODO: Choose, with decimals()
  uint256 constant issuanceRate = 1;

  function totalSupply() view returns (uint256 totalSupply) {
    (now - rateUpdatedTimestamp) * issuanceRate
  }

  uint256 heldElsewhere;
  mapping (address => uint256) balances;

  function balanceOf(address _owner) view returns (uint256 balance) {
    if (address == person) {
      totalSupply() - heldElsewhere;
    } else {
      balances[tokenOwner];
    }
  }

  event Transfer(address indexed _from, address indexed _to, uint256 _value)

  function transfer(address _to, uint256 _value) returns (bool success) {
    require( balanceOf(msg.sender) >= _value, "Insufficient Balance" );

    // decrement _from balance
    if (msg.sender == person) {
      heldElsewhere = heldElsewhere + _value;
    } else {
      balances[msg.sender] = balances[msg.sender] - _value;
    }

    // increment _to balance
    if (_to == person) {
      heldElsewhere = heldElsewhere - _value;
    } else {
      balances[_to] = balances[_to] + _value;
    }

    Transfer(msg.sender, _to, _value);
    return true;
  }

  mapping (address => mapping (address = uint256)) public allowances;

  function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
    require( allowances[_from][msg.sender] >= _value, "Not authorized" );
    require( balanceOf(_from) >= _value, "Insufficient Balance" );

    // decrement _from balance
    allowances[_from][msg.sender] = allowances[_from][msg.sender] - _value;
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

    Transfer(_from, _to, _value);
    return true;
  }

  event Approval(address indexed _owner, address indexed _spender, uint256 _value)

  function approve(address _spender, uint256 _value) returns (bool success) {
    allowances[msg.sender][_spender] = _value;

    Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance(address _owner, address _spender) view returns (uint256 remaining) {
    return allowances[_owner][_spender];
  }
}

pragma solidity ^0.4.24;

import "./CirclesPerson.sol";

contract CirclesPersonFactory {
  DSProxyCache public cache = new DSProxyCache();

  function build() public returns (CirclesPerson person) {
    return build(msg.sender);
  }

  function build(address _owner) public returns (CirclesPerson person) {
    person = new CirclesPerson(cache);
    person.setOwner(_owner);
    return person;
  }
}

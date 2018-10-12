pragma solidity ^0.4.24;

import "./Person.sol";

contract PersonFactory {
  DSProxyCache public cache = new DSProxyCache();

  function build() public returns (Person person) {
    return build(msg.sender);
  }

  function build(address _owner) public returns (Person person) {
    person = new Person(cache);
    person.setOwner(_owner);
    return person;
  }
}

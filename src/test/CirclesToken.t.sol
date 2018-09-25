pragma solidity ^0.4.24;

import "ds-test/test.sol";

import "src/main/CirclesToken.sol";
import "src/main/model/PersonInterface.sol";

// Alice trusts everyone
contract Alice is PersonInterface {
  function __circles_approveExchange(address, uint256) external view returns (bool approved) {
    return true;
  }
}

contract CirclesTokenTest is DSTest {
  PersonInterface alice;
  CirclesToken aliceToken;

  function setUp() public {
    alice = new Alice();
    aliceToken = new CirclesToken(alice, "aliceToken", "no-scope420");
  }

  function testFail_basic_sanity() public {
    assertTrue(false);
  }

  function test_basic_sanity() public {
    assertTrue(true);
  }

}

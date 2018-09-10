pragma solidity ^0.4.10;

import "./CirclesHub.sol";
import "./CirclesToken.sol";
import "ds-test/test.sol";

contract TestableCirclesHub is CirclesHub {

    function mintFor(CirclesToken token, address guy, uint wad) {
        token.mint(cast(wad));
        token.transfer(guy, cast(wad));
    }
}

contract CirclesUser {

    TestableCirclesHub circles;
    CirclesToken public token;

    function CirclesUser(TestableCirclesHub circles_) {
        circles = circles_;
    }

    function doJoin() {
        circles.join();
        token = circles.userToToken(this);
    }

    function doTransfer(address dst, uint wad) {
        token.transfer(dst, wad);
    }

    function doTransferThrough(address[] nodes, address[] tokens, uint wad) {
        circles.transferThrough(nodes, tokens, wad);
    }

    function doTrust(address token, bool yes, uint limit) {
        circles.trust(token, yes, limit);
    }
}

contract CirclesHubTest is DSTest {

    TestableCirclesHub circles;

    CirclesUser user1;
    CirclesUser user2;
    CirclesUser user3;
    CirclesUser user4;

    function setUp() {
        circles = new TestableCirclesHub();
        user1 = new CirclesUser(circles);
        user2 = new CirclesUser(circles);
        user3 = new CirclesUser(circles);
        user4 = new CirclesUser(circles);
    }

    function doubleEdge(CirclesUser user1, CirclesUser user2) {
        user1.doTrust(user2.token(), true, 1000 ether);
        user2.doTrust(user1.token(), true, 1000 ether);
    }

    // Standard happy case
    // A <---> B <---> C <---> D
    // A swaps A tokens with B for B tokens, B tokens with C for C tokens, and pays D in C tokens 

    function testTransferThrough() {
        user1.doJoin();
        user2.doJoin();
        user3.doJoin();
        user4.doJoin();

        circles.mintFor(user1.token(), user1, 100 ether);
        circles.mintFor(user2.token(), user2, 100 ether);
        circles.mintFor(user3.token(), user3, 100 ether);
        circles.mintFor(user4.token(), user4, 100 ether);

        doubleEdge(user1, user2);
        doubleEdge(user2, user3);
        doubleEdge(user3, user4);

        address[] memory nodes = new address[](3);
        address[] memory tokens = new address[](3);

        nodes[0] = user2;
        nodes[1] = user3;
        nodes[2] = user4;

        tokens[0] = user1.token();
        tokens[1] = user2.token();
        tokens[2] = user3.token();

        user1.doTransferThrough(nodes, tokens, 100 ether);

        assertEq(user1.token().balanceOf(user2), 100 ether);
        assertEq(user1.token().balanceOf(user1), 0);
        
        assertEq(user2.token().balanceOf(user2), 0);
        assertEq(user2.token().balanceOf(user3), 100 ether);
        
        assertEq(user3.token().balanceOf(user3), 0);
        assertEq(user3.token().balanceOf(user4), 100 ether);
        
        assertEq(user4.token().balanceOf(user4), 100 ether);   
    }

    // Transitive case
    // A <---> B <---> C <---> D
    // A swaps B tokens with C for C tokens, and pays D in C tokens

    function testTransferThroughOthersTokens() {
        user1.doJoin();
        user2.doJoin();
        user3.doJoin();
        user4.doJoin();

        circles.mintFor(user2.token(), user1, 100 ether);
        circles.mintFor(user3.token(), user3, 100 ether);

        doubleEdge(user2, user3);
        doubleEdge(user3, user4);

        address[] memory nodes = new address[](2);
        address[] memory tokens = new address[](2);

        nodes[0] = user3;
        nodes[1] = user4;

        tokens[0] = user2.token();
        tokens[1] = user3.token();

        user1.doTransferThrough(nodes, tokens, 100 ether);

        assertEq(user2.token().balanceOf(user3), 100 ether);
        assertEq(user2.token().balanceOf(user1), 0);

        assertEq(user3.token().balanceOf(user3), 0);
        assertEq(user3.token().balanceOf(user4), 100 ether);
    }
}
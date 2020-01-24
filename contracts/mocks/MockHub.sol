pragma solidity ^0.5.0;
import "../Hub.sol";
import "./MockToken.sol";

contract MockHub is Hub {

//     function signup(string memory _name) public returns (bool) {
//         require(address(userToToken[msg.sender]) == address(0));

//         Token token = new MockToken(msg.sender, _name);
//         userToToken[msg.sender] = token;
//         tokenToUser[address(token)] = msg.sender;
//         _trust(msg.sender, 100);

//         emit Signup(msg.sender, address(token));
//         return true;
//     }
}
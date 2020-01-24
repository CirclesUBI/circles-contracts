pragma solidity ^0.5.0;
import "../Token.sol";

contract MockToken is Token {
    // constructor (address _owner, string memory _name) public Token(_owner, _name) {
    //     require(_owner != address(0));
    //     name = _name;
    //     owner = _owner;
    //     hub = msg.sender;
    //     lastTouched = block.timestamp;
    //     inflationOffset = findInflationOffset();
    //     currentRate = HubI(hub).issuance();
    //     _mint(_owner, currentRate);
    // }

    // constructor (address _owner, string memory _name) public Token(_owner, _name) {
    // 	super()
    // }

    // function time() public view returns (uint256) {
    //     return lastTouched;
    // }
}
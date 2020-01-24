pragma solidity ^0.5.0;
import "../Token.sol";

contract MockToken is Token {
    uint256 mocktime;

    // constructor (address _owner, string memory _name) Token(_owner, _name) public {
    //     mocktime = block.timestamp;
    // }


    function time() public view returns (uint256) {
        return mocktime;
    }

    function setMockTIme(uint256 _mocktime) public {
        mocktime = _mocktime;
    }
}
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./interfaces/ERC20Interface.sol";
import "./interfaces/HubI.sol";

contract Organization {
    using SafeMath for uint256;

    address public owner;
    string public name;
    address public hub;

    modifier onlyHub() {
        require(msg.sender == hub);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address _owner, string memory _name) public {
        require(_owner != address(0));
        name = _name;
        owner = _owner;
        hub = msg.sender;
    }

    function changeOwner(address _newOwner) public onlyOwner returns (bool) {
        require(_newOwner != address(0));
        owner = _newOwner;
        return true;
    }

    function updateHub(address _hub) public onlyOwner returns (bool) {
        require(_hub != address(0));
        hub = _hub;
        return true;
    }
}

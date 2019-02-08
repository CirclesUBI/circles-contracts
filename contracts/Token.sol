pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./interfaces/HubI.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    string public name;
    uint public lastTouched;
    address public hub;
    HubI public controller;
    address public owner;

    event TokenIssuance(uint256 amount);

    modifier onlyHub() {
	    require(msg.sender == hub);
        _;
    }     

    modifier onlyOwner() {
	    require(msg.sender == owner);
	    _;
    }

    constructor(address _owner, string memory _name, uint256 initialPayout) public {
	    require(_owner != address(0));
	    name = _name;
	    owner = _owner;
	    hub = msg.sender;
        lastTouched = time();
        _mint(_owner, initialPayout);
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

    function time() internal view returns (uint) {
        return block.timestamp;
    }

    function symbol() public view returns (string memory) {
        return HubI(hub).symbol();
    }

    function decimals() public view returns (uint8) {
        return HubI(hub).decimals();
    }

    function look() public view returns (uint256) {
        uint256 period = time().sub(lastTouched);
        uint256 issuance = HubI(hub).issuanceRate();
        return issuance.mul(period);
    }

    // the universal basic income part
    function update() public {
        uint256 gift = look();
        //this.mint(cast(gift));
        //this.push(owner, cast(gift));
        lastTouched = time();
        emit TokenIssuance(gift);
    }

    function hubTransfer(
        address from, address to, uint256 amount
    ) public onlyHub returns (bool) {
        _transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        if (msg.sender != address(this)) {
            update();
        }
        return super.transfer(dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        //update();
        return super.approve(guy, wad);
    }

    function totalSupply() public view returns (uint256) {
        return super.totalSupply();//.add(look());
    }

    function balanceOf(address src) public view returns (uint256) {
        uint256 balance = super.balanceOf(src);

        //if (src == owner) {
        //    balance = balance.add(look());
        //}

        return balance;
    }
}

pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./HubI.sol";

contract Token is StandardToken {
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

    constructor(address _owner, string _name) public {
	    require(_owner != 0);
	    name = _name;
	    owner = _owner;
	    hub = msg.sender;
        lastTouched = time();
    }

    function changeOwner(address _newOwner) public onlyOwner returns (bool) {
	    require(_newOwner != 0);
	    owner = _newOwner;
	    return true;
    }

    function updateHub(address _hub) public onlyOwner returns (bool) {
        require(_hub != 0);
	    hub = _hub;
	    return true;
    }

    function time() internal returns (uint) {
        return block.timestamp;
    }

    function symbol() public view returns (string) {
        return HubI(hub).symbol();
    }

    function decimals() public view returns (uint8) {
        return HubI(hub).decimals();
    }

    function look() public view returns (uint256) {
        uint256 period = time() - lastTouched;
        uint256 issuance = HubI(hub).issuanceRate();
        return issuance * period;
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
        require(balances[from] >= amount);
        // maybe update() here?

        balances[from] = balances[from] - amount;
        balances[to] = balances[to] + amount;
        emit Transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        if (msg.sender != address(this)) {
            update();
        }
        return super.transfer(dst, wad);
    }

    function approve(address guy, uint wad) public returns (bool) {
        update();
        return super.approve(guy, wad);
    }

    function totalSupply() view returns (uint256) {
        return super.totalSupply() + look();
    }

    function balanceOf(address src) view returns (uint256) {
        var balance = super.balanceOf(src);

        if (src == owner) {
            balance = balance + look();
        }

        return balance;
    }
}

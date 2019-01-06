pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./HubI.sol";

contract Token is Ownable, StandardToken {
    using SafeMath for uint256;

    string public constant name;
    uint public lastTouched;
    address public hub;
    HubI public controller;

    constructor(address _hub, string _name) {
        // no need to super(), StandardToken has no constructors
        name = _name;
	hub = _hub;
        lastTouched = time();
    }

    modifier onlyHub() {
        require(msg.sender == hub);
        _;
    }

    function time() returns (uint) {
        return block.timestamp;
    }

    function symbol() public constant returns (string) {
        return HubI(hub).symbol();
    }

    function decimals() public constant returns (uint8) {
        return HubI(hub).decimals();
    }

    function look() returns (uint256) {
        uint256 period = time() - lastTouched;
        uint256 issuance = HubI(hub).issuanceRate();
        return issuance * period;
    }

    // the universal basic income part
    function update() {
        uint256 gift = look();
        //this.mint(cast(gift));
        //this.push(owner, cast(gift));
        lastTouched = time();
    }

    function hubTransfer(
        address from, address to, uint256 amount
    ) onlyHub returns (bool) {
        require(balances[from] >= amount);
        // maybe update() here?

        balances[from] = balances[from] - amount;
        balances[to] = balances[to] + amount;
        emit Transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) returns (bool) {
        if (msg.sender != address(this)) {
            update();
        }
        return super.transfer(dst, wad);
    }


    function approve(address guy, uint wad) returns (bool) {
        update();
        return super.approve(guy, wad);
    }

    function totalSupply() constant returns (uint256) {
        return super.totalSupply() + look();
    }

    function balanceOf(address src) constant returns (uint256) {
        var balance = super.balanceOf(src);

        if (src == owner) {
            balance = balance + look();
        }

        return balance;
    }
}

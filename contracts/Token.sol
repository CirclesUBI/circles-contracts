pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./interfaces/HubI.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    uint8 public decimals = 18;

    string public name;
    uint256 public lastTouched;
    address public hub;
    address public owner;
    uint256 public inflationOffset;
    uint256 public currentIssuance;

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
        inflationOffset = findInflationOffset();
        currentIssuance = HubI(hub).issuance();
        _mint(_owner, initialPayout);
    }

    function time() public view returns (uint) {
        return block.timestamp;
    }

    function symbol() public view returns (string memory) {
        return HubI(hub).symbol();
    }

    function inflation() public view returns (uint256) {
        return HubI(hub).inflation();
    }

    function divisor() public view returns (uint256) {
        return HubI(hub).divisor();
    }

    function period() public view returns (uint256) {
        return HubI(hub).period();
    }

    function periods() public view returns (uint256) {
        return HubI(hub).periods();
    }

    function periodsLastTouched() public view returns (uint256) {
        return (lastTouched.sub(hubDeploy())).div(period());
    }

    function hubDeploy() public view returns (uint256) {
        return HubI(hub).deployedAt();
    }

    /// @return the amount of seconds until the next inflation step
    function findInflationOffset() public view returns (uint256) {
        return ((period().mul(periods().add(1))).add(hubDeploy())).sub(time());
    }

    /// @return how much ubi this token holder should receive
    function look() public view returns (uint256) {
        uint256 payout = 0;
        uint256 clock = lastTouched;
        uint256 offset = inflationOffset;
        uint256 rate = currentIssuance;
        uint256 p = periodsLastTouched();
        while (clock.add(offset) <= time()) {
            payout = payout.add(offset.mul(rate));
            clock = clock.add(offset);
            offset = period();
            p = p.add(1);
            rate = HubI(hub).issuanceStep(p);
        }
        uint256 timePassed = time().sub(clock);
        payout = payout.add(timePassed.mul(rate));
        return payout;
    }

    /// actually updates storage with new token balance
    function update() public {
        uint256 gift = look();
        if (gift > 0) {
            inflationOffset = findInflationOffset();
            lastTouched = time();
            currentIssuance = HubI(hub).issuance();
            _mint(owner, gift);
        }
    }

    function hubTransfer(
        address from, address to, uint256 amount
    ) public onlyHub returns (bool) {
        _transfer(from, to, amount);
    }

    function transfer(address dst, uint wad) public returns (bool) {
        // this totally redundant code is covering what I believe is weird compiler
        // eccentricity, making gnosis's revert message not correctly return the gas
        // when this function only super() calls the inherited contract
        if (msg.sender == owner) {
            owner = msg.sender;
        }
        return super.transfer(dst, wad);
    }
}

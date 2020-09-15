// SPDX-License-Identifier: AGPL
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ERC20.sol";
import "./interfaces/HubI.sol";

contract Token is ERC20 {
    using SafeMath for uint256;

    uint8 public override decimals = 18;

    uint256 public lastTouched;
    address public hub;
    address public owner;
    uint256 public inflationOffset;
    uint256 public currentIssuance;
    bool public stopped;

    modifier onlyHub() {
        require(msg.sender == hub);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(address _owner, uint256 initialPayout) {
        require(_owner != address(0));
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

    function symbol() public view override returns (string memory) {
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

    function timeout() public view returns (uint256) {
        return HubI(hub).timeout();
    }

    function periodsLastTouched() public view returns (uint256) {
        return (lastTouched.sub(hubDeploy())).div(period());
    }

    function hubDeploy() public view returns (uint256) {
        return HubI(hub).deployedAt();
    }

    function stop() public onlyOwner {
        stopped = true;
    }

    /// @return the amount of seconds until the next inflation step
    function findInflationOffset() public view returns (uint256) {
        return ((period().mul(periods().add(1))).add(hubDeploy())).sub(time());
    }

    /// @return how much ubi this token holder should receive
    function look() public view returns (uint256) {
        if (stopped) return 0;
        uint256 secondsSinceLastTouched = time().sub(lastTouched);
        if (secondsSinceLastTouched > timeout()) return 0;
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

    function transfer(address dst, uint wad) public override returns (bool) {
        // this totally redundant code is covering what I believe is weird compiler
        // eccentricity, making gnosis's revert message not correctly return the gas
        // when this function only super() calls the inherited contract
        if (msg.sender == owner) {
            owner = msg.sender;
        }
        return super.transfer(dst, wad);
    }
}

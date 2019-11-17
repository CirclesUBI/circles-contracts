pragma solidity ^0.5.0;

contract HubI {
    function issuance() public view returns (uint256);
    function inflation() public view returns (uint256);
    function divisor() public view returns (uint256);
    function periods() public view returns (uint256);
    function period() public view returns (uint256);
    function pow(uint256, uint256) public view returns (uint256);
    function totalSupply() public view returns (uint256);
    function decimals() public view returns (uint8);
    function symbol() public view returns (string memory);
}

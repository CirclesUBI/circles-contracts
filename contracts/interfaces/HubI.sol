pragma solidity ^0.5.0;

contract HubI {
    function issuanceRate() public view returns (uint256);
    function issuanceDivisor() public view returns (uint256);
    function totalSupply() public view returns (uint256);
    function decimals() public view returns (uint8);
    function symbol() public view returns (string memory);
}

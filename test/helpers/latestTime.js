// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/latestTime.js
const { ethGetBlock } = require('./web3');

// Returns the time of the last mined block in seconds
async function latestTime () {
  const block = await ethGetBlock('latest');
  return block.timestamp;
}

module.exports = {
  latestTime,
};

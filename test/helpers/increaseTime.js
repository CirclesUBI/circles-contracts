// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/time.js

async function advanceBlock() {
  return web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine',
  }, () => {});
}

// Increases ganache time by the passed duration in seconds
async function increase(duration) {
  if (duration < 0) throw Error(`Cannot increase time by a negative amount (${duration})`);

  await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [duration],
  }, () => {});

  await advanceBlock();
}

module.exports = {
  increase,
  advanceBlock,
};

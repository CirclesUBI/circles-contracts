const getTimestampFromTx = async (tx, web3) => {
  const { blockNumber } = await web3.eth.getTransaction(tx);
  const block = await web3.eth.getBlock(blockNumber);
  return block.timestamp;
};

const getTimestampFromBlock = async (web3) => {
  const block = await web3.eth.getBlock('latest');
  return block.timestamp;
};

const getBlockHeight = async (web3) => {
  const block = web3.eth.getBlock('latest');
  return block.number;
};

module.exports = {
  getTimestampFromTx,
  getTimestampFromBlock,
  getBlockHeight,
};

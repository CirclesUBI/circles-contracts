// const getTimestamp = async (tx, web3) => {
//   const { blockNumber } = await tx
//   const block = await web3.eth.getBlock(blockNumber);
//   return block.timestamp
// };

const getTimestamp = async (tx, web3) => {
  const { blockNumber } = await web3.eth.getTransaction(tx);
  const block = await web3.eth.getBlock(blockNumber);
  return block.timestamp
};

module.exports = {
  getTimestamp
};

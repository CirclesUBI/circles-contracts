const formatTypedData = (
  to,
  value,
  data,
  operation,
  safeTxGas,
  dataGas,
  gasPrice,
  gasToken,
  refundReceiver,
  nonce,
  verifyingContract) => {
  const typedData = {
    types: {
      EIP712Domain: [
        { type: 'address', name: 'verifyingContract' },
      ],
      SafeTx: [
        { type: 'address', name: 'to' },
        { type: 'uint256', name: 'value' },
        { type: 'bytes', name: 'data' },
        { type: 'uint8', name: 'operation' },
        { type: 'uint256', name: 'safeTxGas' },
        { type: 'uint256', name: 'dataGas' },
        { type: 'uint256', name: 'gasPrice' },
        { type: 'address', name: 'gasToken' },
        { type: 'address', name: 'refundReceiver' },
        { type: 'uint256', name: 'nonce' },
      ],
    },
    domain: {
      verifyingContract,
    },
    primaryType: 'SafeTx',
    message: {
      to,
      value,
      data,
      operation,
      safeTxGas,
      dataGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce,
    },
  };
  return typedData;
};

module.exports = {
  formatTypedData,
};

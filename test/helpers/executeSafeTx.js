const { ZERO_ADDRESS } = require('./constants');
const { signTypedData } = require('./signTypedData');
const { formatTypedData } = require('./formatTypedData');

const executeSafeTx = async (safe, txParams, from, gas, signer, web3) => {
  const to = txParams.to || safe.address;
  const value = txParams.value || 0;
  const data = txParams.data || '';
  const operation = txParams.operation || 0;
  const safeTxGas = txParams.safeTxGas || 0;
  const baseGas = txParams.baseGas || 0;
  const gasPrice = txParams.gasPrice || 0;
  const gasToken = txParams.gasToken || ZERO_ADDRESS;
  const refundReceiver = txParams.refundReceiver || ZERO_ADDRESS;
  const nonce = (await safe.nonce()).toNumber();

  const typedData = formatTypedData(
    to, value, data, operation, safeTxGas, baseGas, gasPrice,
    gasToken, refundReceiver, nonce, safe.address);

  const signatureBytes = await signTypedData(signer, typedData, web3);
  await safe.execTransaction(
    to, value, data, operation, safeTxGas, baseGas, gasPrice,
    gasToken, refundReceiver, signatureBytes,
    { from, gas: gas + 4873864 });
};

module.exports = {
  executeSafeTx,
};

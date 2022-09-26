const { ZERO_ADDRESS } = require('./constants');
const { signTypedData } = require('./signTypedData');
const { formatTypedData } = require('./formatTypedData');
const executeSafeTx = async (safe, txParams, from, baseGas, safeTxGas, signer, web3) => {
  const to = txParams.to || safe.address;
  const value = txParams.value || 0;
  const data = txParams.data || '';
  const operation = txParams.operation || 0;
  // gas parameters that were signed don't have to match those sent with the transaction
  // in cases where not using a token payment
  const signedSafeTxGas = txParams.safeTxGas || 0;
  const signedBaseGas = txParams.baseGas || 0;
  const gasPrice = txParams.gasPrice || 0;
  const gasToken = txParams.gasToken || ZERO_ADDRESS;
  const refundReceiver = txParams.refundReceiver || ZERO_ADDRESS;
  const nonce = (await safe.nonce()).toNumber();
  const chainId =   await web3.eth.getChainId()
  // this is mirroring the safe contracts gas checks inside execTransaction that account for EIP-150
  const max = Math.floor(Math.max((safeTxGas * 64) / 63, safeTxGas + 2500) + 500);
  const gas = baseGas + safeTxGas + max;

  const typedData = formatTypedData(
    to, value, data, operation, signedSafeTxGas, signedBaseGas, gasPrice,
    gasToken, refundReceiver, nonce, chainId, safe.address);
  
  const signatureBytes = await signTypedData(signer, typedData, web3);
 
  await safe.execTransaction(
    to, value, data, operation, signedSafeTxGas, signedBaseGas, gasPrice,
    gasToken, refundReceiver, signatureBytes,
    { from, gas });
};

module.exports = {
  executeSafeTx,
};

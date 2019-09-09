//https://github.com/gnosis/safe-contracts/blob/development/test/utils/execution.js

const GAS_PRICE = web3.toWei(100, 'gwei')
const BigNumber = web3.utils.BN;

const baseGasValue = (hexValue) => {
  switch(hexValue) {
   case "0x": return 0
   case "00": return 4
   default: return 68
 };
}
 
const estimatebaseGasCosts = (dataString) => {
  const reducer = (accumulator, currentValue) => accumulator += baseGasValue(currentValue)

  return dataString.match(/.{2}/g).reduce(reducer, 0)
}

const estimateBaseGas = (safe, to, value, data, operation, txGasEstimate, gasToken, refundReceiver, signatureCount, nonce) => {
  // numbers < 256 are 192 -> 31 * 4 + 68
  // numbers < 65k are 256 -> 30 * 4 + 2 * 68
  // For signature array length and baseGasEstimate we already calculated the 0 bytes so we just add 64 for each non-zero byte
  const signatureCost = signatureCount * (68 + 2176 + 2176 + 6000) // (array count (3 -> r, s, v) + ecrecover costs) * signature count
  const payload = safe.contract.execTransaction.getData(
    to, value, data, operation, txGasEstimate, 0, GAS_PRICE, gasToken, refundReceiver, "0x"
  )
  const baseGasEstimate = estimatebaseGasCosts(payload) + signatureCost + (nonce > 0 ? 5000 : 20000) + 1500 // 1500 -> hash generation costs
  return baseGasEstimate + 32000; // Add aditional gas costs (e.g. base tx costs, transfer costs)
}

const estimateTxGas = async (safe, to, value, data, operation) => {
  let estimateData = safe.contract.requiredTxGas.getData(to, value, data, operation)
  let estimateResponse = await web3.eth.call({to: safe.address, from: safe.address, data: estimateData, gasPrice: 0})
  let txGasEstimate = new BigNumber(estimateResponse.substring(138), 16)
  // Add 10k else we will fail in case of nested calls
  txGasEstimate = txGasEstimate.toNumber() + 10000
  console.log("    Tx Gas estimate: " + txGasEstimate)
  return txGasEstimate;
}

module.exports = {
  estimateBaseGas,
  estimateTxGas
};
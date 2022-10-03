const { ZERO_ADDRESS, extraGas } = require('./constants');

const createSafeWithProxy = async (proxy, safe, GnosisSafe, owner) => {

  const proxyData = safe.contract
    .methods.setup([owner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, ZERO_ADDRESS, 0, ZERO_ADDRESS)
    .encodeABI();

  const tx = await proxy
    .createProxy(safe.address, proxyData, { from: owner, gas: extraGas });
  const { logs } = tx;

  const userSafeAddress = logs[0].args.proxy;

  return GnosisSafe.at(userSafeAddress);
};

module.exports = {
  createSafeWithProxy,
};

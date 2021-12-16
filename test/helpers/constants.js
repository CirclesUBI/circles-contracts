const web3 = require('web3'); // eslint-disable-line import/no-extraneous-dependencies

const BigNumber = web3.utils.BN;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const decimals = new BigNumber(18);
const extraGas = 17721975;
const maxGas = 0xfffffffffffff;
const inflation = new BigNumber(275);
const period = new BigNumber(7885000000);
const symbol = 'CRC';
const name = 'Circles';
const signupBonus = new BigNumber(100);
const initialIssuance = new BigNumber(100);
const timeout = new BigNumber(315400000000);

module.exports = {
  ZERO_ADDRESS,
  decimals,
  BigNumber,
  extraGas,
  maxGas,
  inflation,
  period,
  name,
  symbol,
  signupBonus,
  initialIssuance,
  timeout,
};

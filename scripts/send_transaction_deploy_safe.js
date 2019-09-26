const fetch = require('isomorphic-fetch');
const Web3 = require('web3');

const { ZERO_ADDRESS } = require('../test/helpers/constants');
const { signTypedData } = require('../test/helpers/signTypedData');
const { formatTypedData } = require('../test/helpers/formatTypedData');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const ENDPOINT = 'http://localhost:8000';

async function test() {
  const safeAddress = '0x297eCF7fcf7258E38822833effa202Bb930992B6'

  const to = '0xD833215cBcc3f914bD1C9ece3EE7BF8B14f841bb';
  const value = 0;
  const data =
    '0x519c6377000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000046e616d6500000000000000000000000000000000000000000000000000000000';
  const operation = 0;
  const safeTxGas = 1619421;
  const baseGas = 68992;
  const gasPrice = 2000000000;
  const gasToken = ZERO_ADDRESS;
  const refundReceiver = ZERO_ADDRESS;
  const nonce = 0;
  const owner = '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d';

  const typedData = formatTypedData(
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    safeAddress,
  );

  const signatureBytes = await signTypedData(owner, typedData, web3);

  const sig = signatureBytes.slice(2);

  let r = `0x${sig.slice(0, 64)}`;
  let s = `0x${sig.slice(64, 128)}`;
  const v = web3.utils.toDecimal(sig.slice(128, 130));

  r = web3.utils.toBN(r).toString(10);
  s = web3.utils.toBN(s).toString(10);

  const signature = {
    v,
    r,
    s,
  };

  console.log(signature);

  const requestRelayer = async (options) => {
    const { path, method, data, version } = options;

    const request = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const paramsStr = '';
    request.body = JSON.stringify(data);

    const url = `${ENDPOINT}/api/v${version}/${path.join('/')}/${paramsStr}`;

    return fetch(url, request).then((response) => {
      if (response.status > 299) {
        throw new Error(
          `Relayer responded with error ${response.status} ${JSON.stringify(
            response.body,
          )})`,
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json().then(json => json);
      }
      return response;
    });
  };

  requestRelayer({
    path: ['safes', safeAddress, 'transactions'],
    method: 'POST',
    version: 1,
    data: {
      safe: safeAddress,
      to,
      value,
      data,
      operation,
      gasToken,
      safeTxGas,
      dataGas,
      gasPrice,
      refundReceiver,
      nonce,
      signatures: [signature],
    },
  });
}

test();

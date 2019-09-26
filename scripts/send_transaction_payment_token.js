const fetch = require('isomorphic-fetch');
const Web3 = require('web3');
const truffleContract = require('truffle-contract');

const { ZERO_ADDRESS } = require('../test/helpers/constants');
const { signTypedData } = require('../test/helpers/signTypedData');
const { formatTypedData } = require('../test/helpers/formatTypedData');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const ENDPOINT = 'http://localhost:8000';
const hubAddress = '0xD833215cBcc3f914bD1C9ece3EE7BF8B14f841bb';

const hubArtifacts = require('../build/contracts/Hub.json');
const tokenArtifacts = require('../build/contracts/Token.json');

const Hub = truffleContract(hubArtifacts);
const Token = truffleContract(tokenArtifacts);
Hub.setProvider(web3.currentProvider);
Token.setProvider(web3.currentProvider);

async function test() {
  const hub = await Hub.at(hubAddress);
  const logs = await hub.getPastEvents('Signup', { fromBlock: 0, toBlock: 'latest' });

  const token = await Token.at(logs[0].args.token);

  const safeAddress = '0x297eCF7fcf7258E38822833effa202Bb930992B6';

  const to = token.address;
  const value = 0;
  const data =
    '0xa9059cbb000000000000000000000000e6fb709bcec7948e4de07181316dabceddd2a7800000000000000000000000000000000000000000000000000000000000000032';
  const operation = 0;
  const safeTxGas = 1619421;
  const baseGas = 68992;
  const gasPrice = 1;
  const gasToken = token.address;
  const refundReceiver = ZERO_ADDRESS;
  const nonce = 1;
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

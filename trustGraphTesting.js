const truffleContract = require('truffle-contract');
const hubArtifacts = require('./build/contracts/Hub.json');
const tokenArtifacts = require('./build/contracts/Token.json');
const safeArtifacts = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));

const Hub = truffleContract(hubArtifacts);
const Token = truffleContract(tokenArtifacts);
const Safe = truffleContract(safeArtifacts);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

Hub.setProvider(web3.currentProvider);
Token.setProvider(web3.currentProvider);
Safe.setProvider(web3.currentProvider);

const hubAddress = "0xa70E47D58b35dd03a1Fa5BA569410389Efe06234";

const test = async () => {
  const hub = await Hub.at(hubAddress);

  const ganacheAccounts = await web3.eth.getAccounts();
  const gasPrice = await web3.eth.getGasPrice();

  // signup block

  const accountA = web3.eth.accounts.create();
  const accountB = web3.eth.accounts.create();
  const accountC = web3.eth.accounts.create();

  console.log(`A: ${accountA.address}`);
  console.log(`B: ${accountB.address}`);
  console.log(`C: ${accountC.address}`);

  await web3.eth.sendTransaction({
    to: accountA.address,
    value: (17721975 * 2 * gasPrice),
    from: ganacheAccounts[1],
  });

  await web3.eth.sendTransaction({
    to: accountB.address,
    value: (17721975 * 3 * gasPrice),
    from: ganacheAccounts[1],
  });

  await web3.eth.sendTransaction({
    to: accountC.address,
    value: (17721975 * 3 * gasPrice),
    from: ganacheAccounts[1],
  });

  const signupTx = {
    to: hubAddress,
    data: hub.contract.methods.signup().encodeABI(),
    gas: 17721975,
  };

  const signA = await web3.eth.accounts.signTransaction(
    { ...signupTx, from: accountA.address }, accountA.privateKey);
  const signB = await web3.eth.accounts.signTransaction(
    { ...signupTx, from: accountB.address }, accountB.privateKey);
  const signC = await web3.eth.accounts.signTransaction(
    { ...signupTx, from: accountC.address }, accountC.privateKey);

  console.log('signed');

  await web3.eth.sendSignedTransaction(signA.rawTransaction);
  await web3.eth.sendSignedTransaction(signB.rawTransaction);
  await web3.eth.sendSignedTransaction(signC.rawTransaction);

  console.log('signed up');

  // end signup block

  // trust block

  const trustTxA = {
    to: hubAddress,
    data: hub.contract.methods.trust(accountB.address, 50).encodeABI(),
    gas: 17721975,
    from: accountA.address,
  };

  const trustA = await web3.eth.accounts.signTransaction(trustTxA, accountA.privateKey);
  await web3.eth.sendSignedTransaction(trustA.rawTransaction);

  const trustTxC = {
    to: hubAddress,
    data: hub.contract.methods.trust(accountB.address, 50).encodeABI(),
    gas: 17721975,
    from: accountC.address,
  };

  const trustC = await web3.eth.accounts.signTransaction(trustTxC, accountC.privateKey);
  await web3.eth.sendSignedTransaction(trustC.rawTransaction);

  console.log('trusted');

  // end trust block

  // first transfer block

  setTimeout(async () => {
    const transferTx = {
      to: hubAddress,
      data: hub.contract.methods.transferThrough(
        [accountB.address],
        [accountB.address],
        [accountA.address],
        ['12000000000000000000'],
      ).encodeABI(),
      gas: 17721975,
      from: accountB.address,
    };

    const transferB = await web3.eth.accounts.signTransaction(transferTx, accountB.privateKey);
    await web3.eth.sendSignedTransaction(transferB.rawTransaction);

    console.log('transfered');
  }, 2000);

  // end first transfer block

  // second transfer block

  setTimeout(async () => {
    const transferTx = {
      to: hubAddress,
      data: hub.contract.methods.transferThrough(
        [accountB.address],
        [accountA.address],
        [accountB.address],
        ['12000000000000000000'],
      ).encodeABI(),
      gas: 17721975,
      from: accountA.address,
    };

    const transferA = await web3.eth.accounts.signTransaction(transferTx, accountA.privateKey);
    await web3.eth.sendSignedTransaction(transferA.rawTransaction);

    console.log('transfered 2');
  }, 4000);

  // end second transfer block

  // ubi block

  setTimeout(async () => {
    const tokenAAddress = await hub.contract.methods.userToToken(accountA.address).call();
    const tokenA = await Token.at(tokenAAddress);

    const ubiTx = {
      to: tokenAAddress,
      data: tokenA.contract.methods.update().encodeABI(),
      gas: 10000000,
      from: accountA.address,
    };

    const ubiA = await web3.eth.accounts.signTransaction(ubiTx, accountA.privateKey);
    await web3.eth.sendSignedTransaction(ubiA.rawTransaction);

    console.log('ubi');
  }, 10000);

  // end ubi block

  // burn block

  // const trust = await hub.checkSendLimit(accountB.address, accountB.address, accountA.address);
  // console.log(trust.toString());

  setTimeout(async () => {
    const tokenBAddress = await hub.contract.methods.userToToken(accountB.address).call();
    const tokenB = await Token.at(tokenBAddress);

    const accountD = web3.eth.accounts.create();

    const burnTx = {
      to: tokenBAddress,
      data: tokenB.contract.methods.transfer(accountD.address, '30000000000000000000').encodeABI(),
      gas: 10000000,
      from: accountB.address,
    };

    console.log(accountD.address)

    const burnB = await web3.eth.accounts.signTransaction(burnTx, accountB.privateKey);
    await web3.eth.sendSignedTransaction(burnB.rawTransaction);

    console.log('burned');
  }, 10000);
};

test();

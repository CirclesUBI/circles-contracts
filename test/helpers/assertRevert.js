// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/assertRevert.js

const should = require('chai')
  .should();

const assertRevert = async (promise) => {
  try {
    await promise;
  } catch (error) {
    error.message.should.include('revert', `Expected "revert", got ${error} instead`);
    return;
  }
  should.fail('Expected revert not received');
};

module.exports = {
  assertRevert,
};

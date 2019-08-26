// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/expectEvent.js
const should = require('chai').should();

const inLogs = (logs, eventName, eventArgs = {}) => {
  const event = logs.find((e) => {
    if (e.event === eventName) {
      let matches = true;

      for (const [k, v] of Object.entries(eventArgs)) { // eslint-disable-line no-restricted-syntax
        if (e.args[k] !== v) {
          matches = false;
        }
      }

      if (matches) {
        return matches;
      }
    }
    return e;
  });

  should.exist(event);

  return event;
};

const inTransaction = async (tx, eventName, eventArgs = {}) => {
  const { logs } = await tx;
  return inLogs(logs, eventName, eventArgs);
};

module.exports = {
  inLogs,
  inTransaction,
};

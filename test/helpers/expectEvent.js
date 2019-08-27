// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/expectEvent.js
const should = require('chai').should();

const inLogs = (logs, eventName, eventArgs = {}) => {
  const event = logs.find((e) => {
    let matches = false;
    if (e.event === eventName) {
      matches = true;

      for (const [k, v] of Object.entries(eventArgs)) { // eslint-disable-line no-restricted-syntax
        if (e.args[k] !== v) {
          matches = false;
        }
      }

      if (matches) {
        return matches;
      }
    }
    return matches;
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

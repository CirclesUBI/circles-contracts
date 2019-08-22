const signTypedData = async (account, data, web3) => {
  return new Promise(function (resolve, reject) {
    web3.currentProvider.send({
      jsonrpc: "2.0", 
      method: "eth_signTypedData",
      params: [account, data],
      id: new Date().getTime()
    }, function(err, response) {
      if (err) { 
          return reject(err);
      }
      resolve(response.result);
    });
  });
}

module.exports = {
  signTypedData,
};
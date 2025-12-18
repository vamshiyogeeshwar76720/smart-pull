module.exports = {
  networks: {
    shasta: {
      privateKey: "YOUR_PRIVATE_KEY",
      consume_user_resource_percent: 30,
      fee_limit: 1_000_000_000,
      fullNode: "https://api.shasta.trongrid.io",
      solidityNode: "https://api.shasta.trongrid.io",
      eventServer: "https://api.shasta.trongrid.io",
    },
  },
  compilers: {
    solc: {
      version: "0.5.10",
    },
  },
};

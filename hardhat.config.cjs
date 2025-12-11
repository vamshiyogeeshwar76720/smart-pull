require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your wallet private key
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const ETH_RPC_URL = process.env.ETH_RPC_URL;
const BSC_RPC_URL = process.env.BSC_RPC_URL;
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
if (!PRIVATE_KEY) throw new Error("Please set PRIVATE_KEY in .env");
if (!ETH_RPC_URL) throw new Error("Please set ETH_RPC_URL in .env");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },

    ethereum: {
      url: ETH_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    bsc: {
      url: BSC_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    polygon: {
      url: POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

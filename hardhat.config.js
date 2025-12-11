import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  solidity: "0.8.20", // or your contract version
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};

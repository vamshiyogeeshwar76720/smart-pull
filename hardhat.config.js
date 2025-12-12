import "@nomiclabs/hardhat-ethers";
import "dotenv/config";

const { SEPOLIA_RPC, ETH_MAINNET_RPC, BSC_TESTNET_RPC, BSC_MAINNET_RPC, MUMBAI_RPC, POLYGON_MAINNET_RPC, PRIVATE_KEY, ENV } = process.env;

export default {
  solidity: "0.8.20",
  defaultNetwork: ENV === "mainnet" ? "ethereumMainnet" : "ethereumSepolia",
  networks: {
    ethereumSepolia: {
      url: SEPOLIA_RPC,
      accounts: [PRIVATE_KEY],
    },
    ethereumMainnet: {
      url: ETH_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      accounts: [PRIVATE_KEY],
    },
    bscMainnet: {
      url: BSC_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
    },
    polygonMumbai: {
      url: MUMBAI_RPC,
      accounts: [PRIVATE_KEY],
    },
    polygonMainnet: {
      url: POLYGON_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
    },
  },
};

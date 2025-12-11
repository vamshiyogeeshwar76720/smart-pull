// config.js

// Change ENV to "testnet" or "mainnet" to switch easily
const ENV = "testnet"; // or "mainnet"

// Multi-chain and token configuration
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    testnet: {
      name: "sepolia",
      rpc: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      emiContract: "0xYourSepoliaEmiContractAddress",
    },
    mainnet: {
      name: "mainnet",
      rpc: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      emiContract: "0xYourMainnetEmiContractAddress",
    },
    tokens: {
      USDT: {
        testnet: "0xYourSepoliaUSDTAddress",
        mainnet: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      DAI: {
        testnet: "0xYourSepoliaDAIAddress",
        mainnet: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
      WETH: {
        testnet: "0xYourSepoliaWETHAddress",
        mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      },
    },
  },
  bsc: {
    name: "Binance Smart Chain",
    chainId: 56,
    testnet: {
      name: "bscTestnet",
      rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      emiContract: "0xYourBscTestEmiContractAddress",
    },
    mainnet: {
      name: "bscMainnet",
      rpc: "https://bsc-dataseed.binance.org/",
      emiContract: "0xYourBscMainEmiContractAddress",
    },
    tokens: {
      BUSD: {
        testnet: "0xYourBscTestBUSDAddress",
        mainnet: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      },
      USDT: {
        testnet: "0xYourBscTestUSDTAddress",
        mainnet: "0x55d398326f99059ff775485246999027b3197955",
      },
    },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    testnet: {
      name: "mumbai",
      rpc: "https://rpc-mumbai.maticvigil.com/",
      emiContract: "0xYourMumbaiEmiContractAddress",
    },
    mainnet: {
      name: "polygonMainnet",
      rpc: "https://polygon-rpc.com/",
      emiContract: "0xYourPolygonMainEmiContractAddress",
    },
    tokens: {
      USDT: {
        testnet: "0xYourMumbaiUSDTAddress",
        mainnet: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
      },
      DAI: {
        testnet: "0xYourMumbaiDAIAddress",
        mainnet: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      },
    },
  },
};

// Get tokens for the current ENV
function getTokens(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return {};
  const tokens = {};
  for (const [tokenName, addresses] of Object.entries(chain.tokens)) {
    tokens[tokenName] = addresses[ENV];
  }
  return tokens;
}

// Get RPC URL for a chain
function getRpc(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;
  return chain[ENV].rpc;
}

// Get EMI contract address for a chain
function getEmiContract(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;
  return chain[ENV].emiContract;
}

// Export configuration for frontend
export const AppConfig = {
  ENV,
  CHAINS,
  getTokens,
  getRpc,
  getEmiContract,
};

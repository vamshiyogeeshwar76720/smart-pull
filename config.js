// config.js

const ENV = "testnet"; // or "mainnet"

// Multi-chain and token configuration
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    testnet: {
      name: "sepolia",
      rpc: process.env.SEPOLIA_RPC,
      emiContract: "0x2069B742B289e375d84462146D1f4507150706a5", // update after deployment
    },
    mainnet: {
      name: "mainnet",
      rpc: process.env.ETH_MAINNET_RPC,
      emiContract: "0xYourMainnetEmiContractAddress",
    },
    tokens: {
      USDT: {
        testnet: "0x3fcf3143fb3bBDbD35C38B39747cE19BB446EC11",
        mainnet: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      DAI: {
        testnet: "0x150A11Fc1cdB8a37603C7EA9A5D27Ba92A160e64",
        mainnet: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
      WETH: {
        testnet: "0xe94c30e5da9E4DF6f2c2fC835aF700BE670C7e52",
        mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      },
    },
  },
  bsc: {
    name: "Binance Smart Chain",
    chainId: 56,
    testnet: {
      name: "bscTestnet",
      rpc: process.env.BSC_TESTNET_RPC,
      emiContract: "0xYourBscTestEmiContractAddress",
    },
    mainnet: {
      name: "bscMainnet",
      rpc: process.env.BSC_MAINNET_RPC,
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
      rpc: process.env.MUMBAI_RPC,
      emiContract: "0xYourMumbaiEmiContractAddress",
    },
    mainnet: {
      name: "polygonMainnet",
      rpc: process.env.POLYGON_MAINNET_RPC,
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

// Helper functions
function getTokens(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return {};
  const tokens = {};
  for (const [tokenName, addresses] of Object.entries(chain.tokens)) {
    tokens[tokenName] = addresses[ENV];
  }
  return tokens;
}

function getRpc(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;
  return chain[ENV].rpc;
}

function getEmiContract(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;
  return chain[ENV].emiContract;
}

// New: Generate link for sender
function generateEmiLink({
  blockchain,
  token,
  receiver,
  emiAmount,
  totalAmount,
  interval,
}) {
  const baseUrl = "https://yourapp.com/pay";
  const params = new URLSearchParams({
    chain: blockchain,
    token,
    receiver,
    emiAmount: emiAmount.toString(),
    totalAmount: totalAmount.toString(),
    interval: interval.toString(),
  });
  return `${baseUrl}?${params.toString()}`;
}

// Token decimals
const TOKEN_DECIMALS = {
  USDT: 6,
  DAI: 18,
  WETH: 18,
  BUSD: 18,
};

// Export
export const AppConfig = {
  ENV,
  CHAINS,
  getTokens,
  getRpc,
  getEmiContract,
  TOKEN_DECIMALS,
  generateEmiLink,
};

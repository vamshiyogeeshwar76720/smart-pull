// config.js

const ENV = "testnet"; // or "mainnet"

// Multi-chain and token configuration
const CHAINS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    testnet: {
      name: "sepolia",
      rpc: "https://sepolia.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
      emiContract: "0x02b212B53b8E74BB821F2EFBB8109507b2173ad3", // update after deployment
    },
    mainnet: {
      name: "mainnet",
      rpc: "https://mainnet.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
      emiContract: "0xYourMainnetEmiContractAddress",
    },
    tokens: {
      USDT: {
        testnet: "0x4a5D386D06449032E0cc7Eb5607953335d820509",
        mainnet: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      DAI: {
        testnet: "0x2EAaE29528Aa83f7B16EbBeF8d3188e8E3473060",
        mainnet: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
      WETH: {
        testnet: "0x64Df30B9c200752BDC81749d2292299944BE645d",
        mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      },
    },
  },
  bsc: {
    name: "Binance Smart Chain",
    chainId: 56,
    testnet: {
      name: "bscTestnet",
      rpc: "https://bsc-testnet.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
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

// config.js
// =====================================================
// Global Environment
// =====================================================
const ENV = "testnet"; // "testnet" | "mainnet"

// =====================================================
// Chain Configuration
// =====================================================
const CHAINS = {
  // -------------------- EVM CHAINS --------------------
  ethereum: {
    type: "evm",
    name: "Ethereum",

    testnet: {
      name: "Sepolia",
      chainId: 11155111,
      rpc: "https://rpc.ankr.com/eth_sepolia",
      emiContract: "0xCE40B648CfC9200b29F6A2909C2F7427579Eb2d2",
    },

    mainnet: {
      name: "Mainnet",
      chainId: 1,
      rpc: "https://rpc.ankr.com/eth",
      emiContract: "0xYourEthereumMainnetEmiContract",
    },

    tokens: {
      USDT: {
        decimals: 6,
        permit: false,
        addresses: {
          testnet: "0x66dCF5F5F4d8Fb32e008Ae9dF23B72dB2CB8F805",
          mainnet: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        },
      },
    },
  },
};
//       DAI: {
//         decimals: 18,
//         permit: true,
//         addresses: {
//           testnet: "0x420bD646eDD415EC6F942E48D3c8A68AF0DFF713",
//           mainnet: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
//         },
//       },
//       WETH: {
//         decimals: 18,
//         permit: false,
//         addresses: {
//           testnet: "0x2bF4bc15457e6Fd85bF95Fb54BbB6eD3417DB14B",
//           mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//         },
//       },
//     },
//   },

//   bsc: {
//     type: "evm",
//     name: "Binance Smart Chain",
//     chainId: 56,

//     testnet: {
//       name: "BSC Testnet",
//       chainId: 97,
//       rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
//       emiContract: "0xYourBscTestnetEmiContract",
//     },

//     mainnet: {
//       name: "BSC Mainnet",
//       chainId: 56,
//       rpc: "https://bsc-dataseed.binance.org/",
//       emiContract: "0xYourBscMainnetEmiContract",
//     },

//     tokens: {
//       USDT: {
//         decimals: 18,
//         permit: false,
//         addresses: {
//           testnet: "0xYourBscTestUSDT",
//           mainnet: "0x55d398326f99059fF775485246999027B3197955",
//         },
//       },
//       BUSD: {
//         decimals: 18,
//         permit: false,
//         addresses: {
//           testnet: "0xYourBscTestBUSD",
//           mainnet: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
//         },
//       },
//     },
//   },

//   polygon: {
//     type: "evm",
//     name: "Polygon",
//     chainId: 137,

//     testnet: {
//       name: "Mumbai",
//       chainId: 80001,
//       rpc: "https://rpc-mumbai.maticvigil.com/",
//       emiContract: "0xYourMumbaiEmiContract",
//     },

//     mainnet: {
//       name: "Polygon Mainnet",
//       chainId: 137,
//       rpc: "https://polygon-rpc.com/",
//       emiContract: "0xYourPolygonMainnetEmiContract",
//     },

//     tokens: {
//       USDT: {
//         decimals: 6,
//         permit: false,
//         addresses: {
//           testnet: "0xYourMumbaiUSDT",
//           mainnet: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
//         },
//       },
//       DAI: {
//         decimals: 18,
//         permit: true,
//         addresses: {
//           testnet: "0xYourMumbaiDAI",
//           mainnet: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
//         },
//       },
//     },
//   },

//   // -------------------- TRON --------------------
//   tron: {
//     type: "tron",
//     name: "TRON",
//     network: "mainnet",
//     explorer: "https://tronscan.org",
//     rpc: "https://api.trongrid.io",
//     emiContract: "TXXXXXXXXXXXXXXXXXXXXXXXX",

//     tokens: {
//       USDT: {
//         decimals: 6,
//         permit: false,
//         address: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
//       },
//       USDC: {
//         decimals: 6,
//         permit: false,
//         address: "TYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
//       },
//     },
//   },
// };

// =====================================================
// Helper Functions
// =====================================================
function getChain(chainKey) {
  return CHAINS[chainKey] || null;
}

function isEvmChain(chainKey) {
  return CHAINS[chainKey]?.type === "evm";
}

function getRpc(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;

  if (chain.type === "tron") return chain.rpc;
  return chain[ENV].rpc;
}

function getEmiContract(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;

  if (chain.type === "tron") return chain.emiContract;
  return chain[ENV].emiContract;
}

function getTokens(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) return {};

  const tokens = {};

  for (const [symbol, t] of Object.entries(chain.tokens)) {
    tokens[symbol] = chain.type === "tron" ? t.address : t.addresses[ENV];
  }
  return tokens;
}

const TOKEN_DECIMALS = {
  USDT: 6,
  DAI: 18,
  WETH: 18,
  BUSD: 18,
};

function getTokenMeta(chainKey, symbol) {
  const chain = CHAINS[chainKey];
  if (!chain) return null;

  return chain.tokens[symbol] || null;
}

// =====================================================
// EMI Share Link
// =====================================================
function generateEmiLink({ chain, planId, token, receiver }) {
  const base = "https://yourapp.com/activate";
  const params = new URLSearchParams({
    chain,
    planId,
    token,
    receiver,
  });

  return `${base}?${params.toString()}`;
}

// =====================================================
// Export
// =====================================================
export const AppConfig = {
  ENV,
  CHAINS,
  TOKEN_DECIMALS,
  // helpers
  getChain,
  isEvmChain,
  getRpc,
  getEmiContract,
  getTokens,
  getTokenMeta,
  generateEmiLink,
};

//not permit based

// const ENV = "testnet"; // or "mainnet"

// // Multi-chain and token configuration
// const CHAINS = {
//   ethereum: {
//     name: "Ethereum",
//     chainId: 1,
//     testnet: {
//       name: "sepolia",
//       rpc: "https://sepolia.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
//       emiContract: "0x2aF1cd2a657b45d55B6BD6FDF1D03986F100601c", // update after deployment
//     },
//     mainnet: {
//       name: "mainnet",
//       rpc: "https://mainnet.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
//       emiContract: "0xYourMainnetEmiContractAddress",
//     },
//     tokens: {
//       USDT: {
//         testnet: "0x382A93645B0976b5816003B96b827Ba19789971b",
//         mainnet: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
//       },
//       DAI: {
//         testnet: "0xfF90d4Ae810D55D3cBE5eE40Fd9045BBdCe73E06",
//         mainnet: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
//       },
//       WETH: {
//         testnet: "0x2bF4bc15457e6Fd85bF95Fb54BbB6eD3417DB14B",
//         mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//       },
//     },
//   },
//   bsc: {
//     name: "Binance Smart Chain",
//     chainId: 56,
//     testnet: {
//       name: "bscTestnet",
//       rpc: "https://bsc-testnet.infura.io/v3/3b801e8b02084ba68f55b81b9209c916",
//       emiContract: "0xYourBscTestEmiContractAddress",
//     },
//     mainnet: {
//       name: "bscMainnet",
//       rpc: "https://bsc-dataseed.binance.org/",
//       emiContract: "0xYourBscMainEmiContractAddress",
//     },
//     tokens: {
//       BUSD: {
//         testnet: "0xYourBscTestBUSDAddress",
//         mainnet: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
//       },
//       USDT: {
//         testnet: "0xYourBscTestUSDTAddress",
//         mainnet: "0x55d398326f99059ff775485246999027b3197955",
//       },
//     },
//   },
//   polygon: {
//     name: "Polygon",
//     chainId: 137,
//     testnet: {
//       name: "mumbai",
//       rpc: "https://rpc-mumbai.maticvigil.com/",
//       emiContract: "0xYourMumbaiEmiContractAddress",
//     },
//     mainnet: {
//       name: "polygonMainnet",
//       rpc: "https://polygon-rpc.com/",
//       emiContract: "0xYourPolygonMainEmiContractAddress",
//     },
//     tokens: {
//       USDT: {
//         testnet: "0xYourMumbaiUSDTAddress",
//         mainnet: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
//       },
//       DAI: {
//         testnet: "0xYourMumbaiDAIAddress",
//         mainnet: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
//       },
//     },
//   },

//   tron: {
//     name: "TRON",
//     chainId: "tron", // logical id (not numeric)
//     network: "mainnet",
//     explorer: "https://tronscan.org",
//     emiContract: "TXXXXXXXXXXXXXXXXXXXXXXXX", // TRON EMI CONTRACT (future)
//     tokens: {
//       USDT: {
//         mainnet: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj", // TRC20 USDT
//       },
//       USDC: {
//         mainnet: "TYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
//       },
//     },
//   },
// };

// // Helper functions
// function getTokens(chainKey) {
//   const chain = CHAINS[chainKey];
//   if (!chain) return {};
//   const tokens = {};
//   for (const [tokenName, addresses] of Object.entries(chain.tokens)) {
//     tokens[tokenName] = addresses[ENV];
//   }
//   return tokens;
// }

// function getRpc(chainKey) {
//   const chain = CHAINS[chainKey];
//   if (!chain) return null;
//   return chain[ENV].rpc;
// }

// function getEmiContract(chainKey) {
//   const chain = CHAINS[chainKey];
//   if (!chain) return null;
//   return chain[ENV].emiContract;
// }

// // New: Generate link for sender
// function generateEmiLink({
//   blockchain,
//   token,
//   receiver,
//   emiAmount,
//   totalAmount,
//   interval,
// }) {
//   const baseUrl = "https://yourapp.com/pay";
//   const params = new URLSearchParams({
//     chain: blockchain,
//     token,
//     receiver,
//     emiAmount: emiAmount.toString(),
//     totalAmount: totalAmount.toString(),
//     interval: interval.toString(),
//   });
//   return `${baseUrl}?${params.toString()}`;
// }

// // Token decimals

// const TOKEN_DECIMALS = {
//   USDT: 6,
//   DAI: 18,
//   WETH: 18,
//   BUSD: 18,
// };

// // const TOKEN_DECIMALS = {
// //   USDT: 6,
// //   USDC: 6,
// //   DAI: 18,
// //   WETH: 18,
// //   BUSD: 18,
// // };

// // Export
// export const AppConfig = {
//   ENV,
//   CHAINS,
//   getTokens,
//   getRpc,
//   getEmiContract,
//   TOKEN_DECIMALS,
//   generateEmiLink,
// };

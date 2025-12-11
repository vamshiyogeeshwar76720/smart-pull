// // import hre from "hardhat";
// // import "dotenv/config";

// // const PRIVATE_KEY = process.env.PRIVATE_KEY;
// // if (!PRIVATE_KEY) throw new Error("Please set PRIVATE_KEY in .env");

// // async function main() {
// //   console.log("Starting deployment...");

// //   const networks = [
// //     { name: "ethereum", url: process.env.ETH_RPC_URL },
// //     { name: "bsc", url: process.env.BSC_RPC_URL },
// //     { name: "polygon", url: process.env.POLYGON_RPC_URL },
// //   ];

// //   for (const net of networks) {
// //     console.log(`\nDeploying EmiAutoPay contract on ${net.name}...`);

// //     const provider = new hre.ethers.providers.JsonRpcProvider(net.url);
// //     const wallet = new hre.ethers.Wallet(PRIVATE_KEY, provider);

// //     const EmiContract = await hre.ethers.getContractFactory(
// //       "EmiAutoPay",
// //       wallet
// //     );
// //     const emi = await EmiContract.deploy();
// //     await emi.deployed();

// //     console.log(`EmiAutoPay deployed on ${net.name}: ${emi.address}`);
// //   }

// //   main().catch((error) => {
// //     console.error(error);
// //     process.exit(1);
// //   });

// //   // main()
// //   //   .then(() => process.exit(0))
// //   //   .catch((error) => {
// //   //     console.error(error);
// //   //     process.exit(1);
// //   //   });
// // }

// import hre from "hardhat";
// import { JsonRpcProvider, Wallet } from "ethers";
// import "dotenv/config";

// const PRIVATE_KEY = process.env.PRIVATE_KEY;
// if (!PRIVATE_KEY) throw new Error("Please set PRIVATE_KEY in .env");

// async function main() {
//   console.log("🚀 Starting deployment...");

//   // Pick only ONE network based on Hardhat's --network flag
//   const networkName = hre.network.name;

//   let rpcUrl;
//   if (networkName === "sepolia") rpcUrl = process.env.SEPOLIA_RPC_URL;
//   else if (networkName === "ethereum") rpcUrl = process.env.ETH_RPC_URL;
//   else if (networkName === "bsc") rpcUrl = process.env.BSC_RPC_URL;
//   else if (networkName === "polygon") rpcUrl = process.env.POLYGON_RPC_URL;
//   else throw new Error(`Unknown network: ${networkName}`);

//   console.log(`Deploying to: ${networkName}`);
//   console.log(`RPC URL: ${rpcUrl}`);
//   const provider = new JsonRpcProvider(rpcUrl);
//   const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

//   // const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
//   // const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

//   const EmiFactory = await hre.ethers.getContractFactory("EmiAutoPay", wallet);
//   const emi = await EmiFactory.deploy();
//   await emi.waitForDeployment();

//   const deployedAddress = await emi.getAddress();

//   console.log(`\n🎉 Contract successfully deployed!`);
//   console.log(`📍 EmiAutoPay Address: ${deployedAddress}\n`);
//   // await emi.deployed();

//   // console.log(`\n✅ EmiAutoPay deployed at: ${emi.address}\n`);
// }

// main().catch((error) => {
//   console.error(error);
//   process.exit(1);
// });

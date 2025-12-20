import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  /* -----------------------------
     1. Deploy Mock USDT
  ------------------------------ */
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.deployed();

  console.log("Mock USDT deployed to:", usdt.address);

  /* -----------------------------
     2. Deploy EMI Contract
  ------------------------------ */
  const Emi = await ethers.getContractFactory("EmiAutoPayEVM");
  const emi = await Emi.deploy(usdt.address);
  await emi.deployed();

  console.log("EmiAutoPay deployed to:", emi.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

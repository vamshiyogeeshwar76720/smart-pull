// const hre = require("hardhat");
import hre from "hardhat";
const { ethers } = hre;
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Emi = await ethers.getContractFactory("EmiAutoPay");
  const emi = await Emi.deploy();

  await emi.deployed();
  console.log("EmiToken deployed to:", emi.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

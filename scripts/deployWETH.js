import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy TestWETH
  const WETH = await ethers.getContractFactory("TestWETH");
  const weth = await WETH.deploy();
  await weth.deployed();

  console.log("TestWETH deployed at:", weth.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

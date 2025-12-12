import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const initialSupply = ethers.utils.parseUnits("1000000", 18); // 1,000,000 tokens

  const Token = await ethers.getContractFactory("TestToken");

  const usdt = await Token.deploy("Test USDT", "tUSDT", initialSupply);
  await usdt.deployed();
  console.log("Test USDT deployed at:", usdt.address);

  const dai = await Token.deploy("Test DAI", "tDAI", initialSupply);
  await dai.deployed();
  console.log("Test DAI deployed at:", dai.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

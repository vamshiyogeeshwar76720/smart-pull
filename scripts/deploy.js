import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  console.log("Deploying EmiAutoPay contract...");

  const EmiAutoPay = await ethers.getContractFactory("EmiAutoPay");
  const emiAutoPay = await EmiAutoPay.deploy();

  await emiAutoPay.deployed();
  console.log(`EmiAutoPay deployed at: ${emiAutoPay.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import TronWeb from "tronweb";
import dotenv from "dotenv";
dotenv.config();

export const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: process.env.TRON_PRIVATE_KEY,
});

export const CONTRACT_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // deployed contract

export const CONTRACT_ABI = require("../abi/EmiAutoPayTRON.json");

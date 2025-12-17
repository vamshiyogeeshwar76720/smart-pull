import { AppConfig } from "./config.js";
import { contractABI } from "./abi.js";

let provider, signer;

// ---------------- DOM ELEMENTS ----------------
const connectBtn = document.getElementById("connectWalletBtn");
const disconnectBtn = document.getElementById("disconnectWalletBtn");
const accountDisplay = document.getElementById("account");
const networkDisplay = document.getElementById("network");

const blockchainSelect = document.getElementById("blockchainSelect");
const planIdInput = document.getElementById("planId");
const tokenAddressInput = document.getElementById("tokenAddress");
const amountInput = document.getElementById("amount");

const activateBtn = document.getElementById("activatePlanBtn");

// ---------------- WALLET CONNECTION ----------------
async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask");

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  accountDisplay.innerText = `Wallet: ${address}`;
  networkDisplay.innerText = `Network: ${network.name}`;

  connectBtn.style.display = "none";
  disconnectBtn.style.display = "inline-block";
}

async function disconnectWallet() {
  signer = null;
  provider = null;
  accountDisplay.innerText = "";
  networkDisplay.innerText = "";
  connectBtn.style.display = "inline-block";
  disconnectBtn.style.display = "none";
}

connectBtn.onclick = connectWallet;
disconnectBtn.onclick = disconnectWallet;

// ---------------- ACTIVATE EMI PLAN ----------------
activateBtn.onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  try {
    const planId = planIdInput.value.trim();
    const tokenAddress = tokenAddressInput.value.trim();
    const amountInputVal = amountInput.value.trim();
    const blockchain = blockchainSelect.value;

    if (!planId || isNaN(planId)) return alert("Invalid plan ID");
    if (!ethers.utils.isAddress(tokenAddress))
      return alert("Invalid token address");
    if (!amountInputVal || isNaN(amountInputVal))
      return alert("Invalid amount");

    const decimals = await getTokenDecimals(tokenAddress);
    const amount = ethers.utils.parseUnits(amountInputVal, decimals);

    const contractAddress = AppConfig.getEmiContract(blockchain);

    const token = new ethers.Contract(
      tokenAddress,
      [
        "function approve(address,uint256) external returns (bool)",
        "function allowance(address,address) external view returns (uint256)",
      ],
      signer
    );

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // ---------------- APPROVE ----------------
    const allowance = await token.allowance(
      await signer.getAddress(),
      contractAddress
    );

    if (allowance.lt(amount)) {
      const approveTx = await token.approve(contractAddress, amount);
      await approveTx.wait();
    }

    // ---------------- ACTIVATE PLAN ----------------
    const tx = await contract.receivePayment(planId, amount);
    await tx.wait();

    alert("✅ EMI plan activated successfully.\nAuto-pay has started.");
  } catch (err) {
    console.error(err);
    alert(err?.reason || err?.message || "Activation failed");
  }
};

// ---------------- HELPERS ----------------
async function getTokenDecimals(tokenAddress) {
  const erc20 = new ethers.Contract(
    tokenAddress,
    ["function decimals() view returns (uint8)"],
    provider
  );
  return await erc20.decimals();
}

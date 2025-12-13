import { AppConfig } from "./config.js";
import { contractABI } from "./abi.js";

let provider, signer;

// Elements
const connectBtn = document.getElementById("connectWalletBtn");
const disconnectBtn = document.getElementById("disconnectWalletBtn");
const accountDisplay = document.getElementById("account");
const networkDisplay = document.getElementById("network");

const blockchainSelect = document.getElementById("blockchainSelect");
const tokenSelect = document.getElementById("tokenSelect");
const intervalSelect = document.getElementById("intervalSelect");
const customIntervalInput = document.getElementById("customInterval");

// --- WALLET CONNECTION LOGIC ---
async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask");
  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  accountDisplay.innerText = "Wallet: " + address;
  networkDisplay.innerText =
    "Network: " + network.name + " (chainId: " + network.chainId + ")";

  connectBtn.style.display = "none";
  disconnectBtn.style.display = "inline-block";

  sessionStorage.setItem("walletAddress", address);
  sessionStorage.setItem("walletNetwork", network.name);
}

async function disconnectWallet() {
  signer = null;
  provider = null;
  accountDisplay.innerText = "";
  networkDisplay.innerText = "";
  connectBtn.style.display = "inline-block";
  disconnectBtn.style.display = "none";

  sessionStorage.removeItem("walletAddress");
  sessionStorage.removeItem("walletNetwork");
}

async function restoreWallet() {
  const storedAddress = sessionStorage.getItem("walletAddress");
  const storedNetwork = sessionStorage.getItem("walletNetwork");
  if (storedAddress && window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    accountDisplay.innerText = "Wallet: " + storedAddress;
    networkDisplay.innerText = "Network: " + storedNetwork;
    connectBtn.style.display = "none";
    disconnectBtn.style.display = "inline-block";
  }
}

connectBtn.onclick = connectWallet;
disconnectBtn.onclick = disconnectWallet;
restoreWallet();

// --- DROPDOWN LOGIC ---
Object.keys(AppConfig.CHAINS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.text = AppConfig.CHAINS[key].name;
  blockchainSelect.appendChild(opt);
});

function populateTokens() {
  const chainKey = blockchainSelect.value;
  tokenSelect.innerHTML = "";
  const tokens = AppConfig.getTokens(chainKey);
  for (const tokenName in tokens) {
    const opt = document.createElement("option");
    opt.value = tokens[tokenName];
    opt.text = tokenName;
    tokenSelect.appendChild(opt);
  }
}

const tokenAddressDisplay = document.getElementById("tokenAddressDisplay");
function updateTokenAddressDisplay() {
  const address = tokenSelect.value;
  tokenAddressDisplay.value = address || "";
}

populateTokens();
updateTokenAddressDisplay();
blockchainSelect.addEventListener("change", () => {
  populateTokens();
  updateTokenAddressDisplay();
});
tokenSelect.addEventListener("change", updateTokenAddressDisplay);

intervalSelect.addEventListener("change", () => {
  customIntervalInput.style.display =
    intervalSelect.value === "custom" ? "inline-block" : "none";
});

// --- CREATE EMI PLAN (Link only, no sender involved) ---
document.getElementById("createPlanBtn").onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  try {
    const receiver = document.getElementById("receiverAddress").value.trim();
    const emiAmountInput = document.getElementById("emiAmount").value.trim();
    const totalAmountInput = document
      .getElementById("totalAmount")
      .value.trim();
    const blockchain = blockchainSelect.value;
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

    if (!receiver || !ethers.utils.isAddress(receiver))
      return alert("Enter valid receiver");
    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress))
      return alert("Select valid token");

    if (!emiAmountInput || isNaN(emiAmountInput) || Number(emiAmountInput) <= 0)
      return alert("Invalid EMI amount");
    if (
      !totalAmountInput ||
      isNaN(totalAmountInput) ||
      Number(totalAmountInput) < Number(emiAmountInput)
    )
      return alert("Total < EMI");

    let interval = intervalSelect.value;
    if (interval === "custom") {
      const customVal = customIntervalInput.value.trim();
      if (!customVal || isNaN(customVal) || Number(customVal) <= 0)
        return alert("Invalid custom interval");
      interval = Number(customVal) * 60;
    } else {
      interval = Number(interval);
    }
    if (interval < 60) return alert("Interval must be >= 1 min");

    const receiverNetwork = networkDisplay.innerText
      .replace("Network: ", "")
      .split(" ")[0];

    const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
    if (decimals === undefined) return alert("Token decimals not configured");

    const emi = ethers.utils.parseUnits(emiAmountInput, decimals);
    const total = ethers.utils.parseUnits(totalAmountInput, decimals);

    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    const tx = await contract.createEmiPlan(
      receiver,
      receiverNetwork,
      tokenAddress,
      emi,
      interval,
      total,
      { gasLimit: 200000 }
    );
    await tx.wait();

    // --- Generate link (JSON) ---
    const linkData = {
      blockchain,
      token: tokenSymbol,
      receiver,
      emiAmount: emiAmountInput,
      totalAmount: totalAmountInput,
      interval: interval / 60, // minutes
      planId: await contract.planCounter(), // latest planId
    };

    const qrContainer = document.getElementById("qrCode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: JSON.stringify(linkData),
      width: 220,
      height: 220,
    });

    alert("EMI Plan Created! Share this QR/link with the sender.");
  } catch (err) {
    console.error(err);
    const msg =
      err?.reason || err?.data?.message || err?.message || "Unknown error";
    alert("Error creating plan: " + msg);
  }
};

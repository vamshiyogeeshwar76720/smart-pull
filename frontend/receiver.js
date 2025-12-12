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

  // Store in sessionStorage for persistence across pages/refresh
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

  // Clear sessionStorage
  sessionStorage.removeItem("walletAddress");
  sessionStorage.removeItem("walletNetwork");
}

// Restore wallet if previously connected
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

// Event listeners
connectBtn.onclick = connectWallet;
disconnectBtn.onclick = disconnectWallet;

// Restore wallet on page load
restoreWallet();

// --- DROPDOWN LOGIC ---

// Populate blockchain dropdown
Object.keys(AppConfig.CHAINS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.text = AppConfig.CHAINS[key].name;
  blockchainSelect.appendChild(opt);
});

// Populate token dropdown
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

// Update token address next to dropdown
function updateTokenAddressDisplay() {
  const address = tokenSelect.value;
  tokenAddressDisplay.value = address || "";
}

// Initial population
populateTokens();
updateTokenAddressDisplay(); // initial

blockchainSelect.addEventListener("change", () => {
  populateTokens();
  updateTokenAddressDisplay();
});

tokenSelect.addEventListener("change", updateTokenAddressDisplay);

// --- CUSTOM INTERVAL LOGIC ---
intervalSelect.addEventListener("change", () => {
  if (intervalSelect.value === "custom") {
    customIntervalInput.style.display = "inline-block";
  } else {
    customIntervalInput.style.display = "none";
  }
});

// --- CREATE EMI PLAN LOGIC (Fixed with decimals & gas) ---
document.getElementById("createPlanBtn").onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  try {
    // --- Fetch inputs ---
    const receiver = document.getElementById("receiverAddress").value.trim();
    const emiAmountInput = document.getElementById("emiAmount").value.trim();
    const totalAmountInput = document
      .getElementById("totalAmount")
      .value.trim();
    const blockchain = blockchainSelect.value;
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

    // --- Validations ---
    if (!receiver || !ethers.utils.isAddress(receiver)) {
      return alert("Enter a valid receiver address (0x...)");
    }

    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
      return alert("Select a valid token");
    }

    if (
      !emiAmountInput ||
      isNaN(emiAmountInput) ||
      Number(emiAmountInput) <= 0
    ) {
      return alert("Enter a valid EMI amount greater than 0");
    }

    if (
      !totalAmountInput ||
      isNaN(totalAmountInput) ||
      Number(totalAmountInput) < Number(emiAmountInput)
    ) {
      return alert("Total amount must be greater than or equal to EMI amount");
    }

    // --- Interval handling ---
    let interval = intervalSelect.value;
    if (interval === "custom") {
      const customVal = customIntervalInput.value.trim();
      if (!customVal || isNaN(customVal) || Number(customVal) <= 0) {
        return alert("Enter a valid custom interval in minutes (>=1)");
      }
      interval = Number(customVal) * 60; // convert minutes to seconds
    } else {
      interval = Number(interval);
    }

    if (interval < 60)
      return alert("Interval must be at least 1 minute (60 seconds)");

    // --- Receiver network ---
    const receiverNetwork = networkDisplay.innerText
      .replace("Network: ", "")
      .split(" ")[0];

    // --- Token decimals ---
    const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
    if (decimals === undefined)
      return alert("Token decimals not configured for " + tokenSymbol);

    const emi = ethers.utils.parseUnits(emiAmountInput, decimals);
    const total = ethers.utils.parseUnits(totalAmountInput, decimals);

    if (emi.lte(0)) return alert("EMI amount too small for token decimals");
    if (total.lt(emi))
      return alert(
        "Total amount must be >= EMI amount after decimals conversion"
      );

    // --- Contract interaction ---
    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // --- Manual gas limit (to bypass gas estimation issues) ---
    const tx = await contract.createEmiPlan(
      receiver,
      receiverNetwork,
      tokenAddress,
      emi,
      interval,
      total,
      { gasLimit: 200000 } // set safe gas limit
    );

    await tx.wait();

    // --- Generate QR code for sender ---
    const qrData = JSON.stringify({
      blockchain,
      token: tokenSymbol,
      receiver,
      emiAmount: emiAmountInput,
      totalAmount: totalAmountInput,
      interval: interval / 60, // show in minutes
    });

    const qrContainer = document.getElementById("qrCode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: qrData,
      width: 220,
      height: 220,
    });

    alert("EMI Plan Created! QR is ready to share with sender.");
  } catch (err) {
    console.error("Transaction failed:", err);
    const msg =
      err?.reason || err?.data?.message || err?.message || "Unknown error";
    alert("Error creating plan: " + msg);
  }
};

// // --- CREATE EMI PLAN LOGIC ---
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const receiver = document.getElementById("receiverAddress").value;
//     const emiAmount = document.getElementById("emiAmount").value;
//     const totalAmount = document.getElementById("totalAmount").value;

//     let interval = intervalSelect.value;
//     if (interval === "custom") {
//       interval = Number(customIntervalInput.value) * 60;
//     }
//     interval = Number(interval);

//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     const receiverNetwork = networkDisplay.innerText
//       .replace("Network: ", "")
//       .split(" ")[0]; // extract network name

//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const emi = ethers.utils.parseUnits(emiAmount, 18);
//     const total = ethers.utils.parseUnits(totalAmount, 18);

//     // CALL THE UPDATED CONTRACT FUNCTION WITH 6 ARGUMENTS
//     const tx = await contract.createEmiPlan(
//       receiver,
//       receiverNetwork,
//       tokenAddress,
//       emi,
//       interval,
//       total
//     );

//     await tx.wait();

//     // QR Code
//     const qrData = JSON.stringify({ blockchain, token: tokenSymbol, receiver });
//     document.getElementById("qrCode").innerHTML = "";
//     new QRCode(document.getElementById("qrCode"), {
//       text: qrData,
//       width: 220,
//       height: 220,
//     });

//     alert("Plan Created! QR Ready.");
//   } catch (err) {
//     console.error(err);
//     alert("Error creating plan");
//   }
// };

// // --- CREATE EMI PLAN LOGIC ---
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const receiver = document.getElementById("receiverAddress").value;
//     const emiAmount = document.getElementById("emiAmount").value;
//     const totalAmount = document.getElementById("totalAmount").value;

//     let interval = intervalSelect.value;
//     if (interval === "custom") {
//       interval = Number(customIntervalInput.value) * 60;
//     }
//     interval = Number(interval);

//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const emi = ethers.utils.parseUnits(emiAmount, 18);
//     const total = ethers.utils.parseUnits(totalAmount, 18);

//     const tx = await contract.createEmiPlan(receiver, emi, interval, total);
//     await tx.wait();

//     // QR Code
//     const qrData = JSON.stringify({ blockchain, token: tokenSymbol, receiver });
//     document.getElementById("qrCode").innerHTML = "";
//     new QRCode(document.getElementById("qrCode"), {
//       text: qrData,
//       width: 220,
//       height: 220,
//     });

//     alert("Plan Created! QR Ready.");
//   } catch (err) {
//     console.error(err);
//     alert("Error creating plan");
//   }
// };

// import { AppConfig } from "./config.js";
// import { contractABI } from "./abi.js";

// let provider, signer;

// // Connect wallet
// document.getElementById("connectWalletBtn").onclick = async () => {
//   if (!window.ethereum) return alert("Install MetaMask");

//   provider = new ethers.providers.Web3Provider(window.ethereum);
//   await provider.send("eth_requestAccounts", []);
//   signer = provider.getSigner();

//   document.getElementById("account").innerText =
//     "Wallet: " + (await signer.getAddress());

//   alert("Wallet Connected!");
// };

// // Populate dropdowns
// const blockchainSelect = document.getElementById("blockchainSelect");
// const tokenSelect = document.getElementById("tokenSelect");

// Object.keys(AppConfig.CHAINS).forEach((key) => {
//   const opt = document.createElement("option");
//   opt.value = key;
//   opt.text = AppConfig.CHAINS[key].name;
//   blockchainSelect.appendChild(opt);
// });

// function populateTokens() {
//   tokenSelect.innerHTML = "";
//   const tokens = AppConfig.getTokens(blockchainSelect.value);

//   for (const t in tokens) {
//     const opt = document.createElement("option");
//     opt.value = tokens[t];
//     opt.text = t;
//     tokenSelect.appendChild(opt);
//   }
// }
// populateTokens();
// blockchainSelect.addEventListener("change", populateTokens);

// // Create plan + QR
// document.getElementById("createPlanBtn").onclick = async () => {
//   try {
//     if (!signer) return alert("Connect wallet first");

//     const receiver = document.getElementById("receiverAddress").value;
//     const emiAmount = document.getElementById("emiAmount").value;
//     const totalAmount = document.getElementById("totalAmount").value;

//     let interval = document.getElementById("intervalSelect").value;
//     if (interval === "custom") {
//       interval = Number(document.getElementById("customInterval").value) * 60;
//     }
//     interval = Number(interval);

//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const emi = ethers.utils.parseUnits(emiAmount, 18);
//     const total = ethers.utils.parseUnits(totalAmount, 18);

//     const tx = await contract.createEmiPlan(
//       receiver,
//       tokenAddress,
//       emi,
//       interval,
//       total
//     );
//     const receipt = await tx.wait();
//     const planId = receipt.events[0].args.planId.toNumber();

//     // QR CONTAINS ONLY 3 FIELDS (VERY IMPORTANT)
//     const qrData = JSON.stringify({
//       blockchain,
//       token: tokenSymbol,
//       receiver,
//     });

//     document.getElementById("qrCode").innerHTML = "";
//     new QRCode(document.getElementById("qrCode"), {
//       text: qrData,
//       width: 220,
//       height: 220,
//     });

//     alert(`Plan Created! QR Ready.`);
//   } catch (e) {
//     console.error(e);
//     alert("Error creating plan");
//   }
// };

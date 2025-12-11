import { AppConfig } from "./config.js";

// Wallet Connect
let provider, signer;

document.getElementById("connectWalletBtn").onclick = async () => {
  try {
    if (!window.ethereum) return alert("Install MetaMask");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();

    const account = await signer.getAddress();
    document.getElementById("account").innerText = "Wallet: " + account;

    const network = await provider.getNetwork();
    document.getElementById("network").innerText = "Network: " + network.name;

    alert("Wallet Connected!");
    saveWalletHistory(account);
  } catch (e) {
    console.error(e);
    alert("Failed to connect wallet");
  }
};

// Populate blockchain dropdown
const blockchainSelect = document.createElement("select");
blockchainSelect.id = "blockchainSelect";
document.getElementById("createPlan").prepend(blockchainSelect);

Object.keys(AppConfig.CHAINS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.text = AppConfig.CHAINS[key].name;
  blockchainSelect.appendChild(opt);
});

// Populate token dropdown dynamically
const tokenSelect = document.createElement("select");
tokenSelect.id = "tokenSelect";
document.getElementById("createPlan").prepend(tokenSelect);

blockchainSelect.addEventListener("change", populateTokens);

function populateTokens() {
  tokenSelect.innerHTML = "";
  const tokens = AppConfig.getTokens(blockchainSelect.value);
  for (const tokenName in tokens) {
    const opt = document.createElement("option");
    opt.value = tokens[tokenName]; // contract address
    opt.text = tokenName;
    tokenSelect.appendChild(opt);
  }
  // Automatically select the first token
  if (tokenSelect.options.length > 0) tokenSelect.selectedIndex = 0;
}

// Initialize tokens for default blockchain
populateTokens();

// Show/Hide custom interval
document.getElementById("intervalSelect").addEventListener("change", () => {
  document.getElementById("customInterval").style.display =
    document.getElementById("intervalSelect").value === "custom"
      ? "block"
      : "none";
});

// Generate QR
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    const receiverAddress = document.getElementById("receiverAddress").value;
    if (!ethers.utils.isAddress(receiverAddress))
      return alert("Invalid receiver address");

    const emiAmount = document.getElementById("emiAmount").value;
    if (!emiAmount || isNaN(emiAmount) || Number(emiAmount) <= 0)
      return alert("Invalid EMI amount");

    let interval = document.getElementById("intervalSelect").value;
    if (interval === "custom")
      interval = Number(document.getElementById("customInterval").value) * 60;
    else interval = Number(interval);

    const totalAmount = document.getElementById("totalAmount").value;
    if (!totalAmount || isNaN(totalAmount) || Number(totalAmount) <= 0)
      return alert("Invalid total amount");

    const blockchain = blockchainSelect.value;
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;
    const emiContract = AppConfig.getEmiContract(blockchain); // NEW: get contract dynamically

    const qrData = JSON.stringify({
      blockchain,
      token: tokenSymbol,
      tokenAddress,
      emiAmount,
      totalAmount,
      interval,
      receiver: receiverAddress,
      emiContract,
    });

    document.getElementById("qrCode").innerHTML = "";
    new QRCode(document.getElementById("qrCode"), {
      text: qrData,
      width: 220,
      height: 220,
    });

    alert("QR Generated Successfully!");
  } catch (err) {
    console.error(err);
    alert("Error generating QR");
  }
};

// Save wallet history
function saveWalletHistory(address) {
  const list = JSON.parse(localStorage.getItem("walletHistory") || "[]");
  if (!list.find((w) => w.address.toLowerCase() === address.toLowerCase())) {
    list.push({
      address,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    });
    localStorage.setItem("walletHistory", JSON.stringify(list));
  }
}

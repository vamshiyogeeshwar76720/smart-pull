import { AppConfig } from "./config.js";
import { contractABI } from "./abi.js";

let provider, signer;

// Connect wallet
document.getElementById("connectWalletBtn").onclick = async () => {
  if (!window.ethereum) return alert("Install MetaMask");

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  document.getElementById("account").innerText =
    "Wallet: " + (await signer.getAddress());

  alert("Wallet Connected!");
};

// Populate dropdowns
const blockchainSelect = document.getElementById("blockchainSelect");
const tokenSelect = document.getElementById("tokenSelect");

Object.keys(AppConfig.CHAINS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.text = AppConfig.CHAINS[key].name;
  blockchainSelect.appendChild(opt);
});

function populateTokens() {
  tokenSelect.innerHTML = "";
  const tokens = AppConfig.getTokens(blockchainSelect.value);

  for (const t in tokens) {
    const opt = document.createElement("option");
    opt.value = tokens[t];
    opt.text = t;
    tokenSelect.appendChild(opt);
  }
}
populateTokens();
blockchainSelect.addEventListener("change", populateTokens);

// Create plan + QR
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    if (!signer) return alert("Connect wallet first");

    const receiver = document.getElementById("receiverAddress").value;
    const emiAmount = document.getElementById("emiAmount").value;
    const totalAmount = document.getElementById("totalAmount").value;

    let interval = document.getElementById("intervalSelect").value;
    if (interval === "custom") {
      interval = Number(document.getElementById("customInterval").value) * 60;
    }
    interval = Number(interval);

    const blockchain = blockchainSelect.value;
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    const emi = ethers.utils.parseUnits(emiAmount, 18);
    const total = ethers.utils.parseUnits(totalAmount, 18);

    const tx = await contract.createEmiPlan(
      receiver,
      tokenAddress,
      emi,
      interval,
      total
    );
    const receipt = await tx.wait();
    const planId = receipt.events[0].args.planId.toNumber();

    // QR CONTAINS ONLY 3 FIELDS (VERY IMPORTANT)
    const qrData = JSON.stringify({
      blockchain,
      token: tokenSymbol,
      receiver,
    });

    document.getElementById("qrCode").innerHTML = "";
    new QRCode(document.getElementById("qrCode"), {
      text: qrData,
      width: 220,
      height: 220,
    });

    alert(`Plan Created! QR Ready.`);
  } catch (e) {
    console.error(e);
    alert("Error creating plan");
  }
};

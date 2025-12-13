import { AppConfig } from "./config.js";
import { contractABI } from "./abi.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.0/dist/ethers.esm.min.js";

let scannedData = null;
let provider, signer;

const connectBtn = document.getElementById("connectBtn");
const activationStatus = document.getElementById("activationStatus");

async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask");
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  connectBtn.style.display = "none";
  alert("Wallet connected!");
}

connectBtn.onclick = connectWallet;

const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  async (decoded) => {
    try {
      scannedData = JSON.parse(decoded);

      document.getElementById("qrBlockchain").innerText =
        scannedData.blockchain;
      document.getElementById("qrToken").innerText = scannedData.token;
      document.getElementById("qrReceiver").innerText = scannedData.receiver;
      document.getElementById("qrPlanId").innerText = scannedData.planId;
      document.getElementById("infoBox").style.display = "block";

      html5QrCode.stop();

      // --- ACTIVATE PLAN ---
      if (!signer) {
        alert("Connect wallet first to activate plan!");
        return;
      }

      const contractAddress = AppConfig.getEmiContract(scannedData.blockchain);
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );

      activationStatus.innerText = "Activating plan...";

      const tx = await contract.activatePlan(scannedData.planId, {
        gasLimit: 150000,
      });
      await tx.wait();

      activationStatus.innerText =
        "✅ Plan activated! Auto-pay will start as per schedule.";
    } catch (e) {
      console.error(e);
      alert("Invalid QR or activation failed: " + e.message);
    }
  }
);

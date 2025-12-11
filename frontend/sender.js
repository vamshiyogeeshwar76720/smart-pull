import { AppConfig } from "./config.js";

let provider, signer, contract;
let scannedData = null;
const html5QrCode = new Html5Qrcode("reader");

// Initialize wallet & contract
async function initWallet(chainKey) {
  if (!window.ethereum) return alert("Install MetaMask");

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const rpcUrl = AppConfig.getRpc(chainKey);
  const contractAddress = AppConfig.getEmiContract(chainKey);

  if (!contractAddress)
    return alert("EMI Contract not configured for this chain");

  contract = new ethers.Contract(contractAddress, contractABI, signer);

  console.log(`Wallet ready on ${chainKey}, contract: ${contractAddress}`);
}

// QR scanner
html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  (decodedText) => {
    try {
      scannedData = JSON.parse(decodedText);

      document.getElementById("qrReceiver").innerText = scannedData.receiver;
      document.getElementById("qrEmi").innerText = scannedData.emiAmount;
      document.getElementById("qrInterval").innerText =
        scannedData.interval + " sec";
      document.getElementById("qrTotal").innerText = scannedData.totalAmount;
      document.getElementById("qrBlockchain").innerText =
        scannedData.blockchain;
      document.getElementById("qrToken").innerText = scannedData.token;

      document.getElementById("infoBox").style.display = "block";

      html5QrCode.stop();
    } catch (err) {
      alert("Invalid QR Code");
      console.error(err);
    }
  },
  (err) => {}
);

// Create EMI Plan
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    if (!scannedData) return alert("No QR data");

    await initWallet(scannedData.blockchain);

    const emi = ethers.utils.parseUnits(scannedData.emiAmount, 18);
    const total = ethers.utils.parseUnits(scannedData.totalAmount, 18);

    const tx = await contract.createEmiPlan(
      scannedData.receiver,
      scannedData.tokenAddress,
      emi,
      scannedData.interval,
      total
    );

    await tx.wait();
    alert("EMI Plan Created Successfully!");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

let provider, signer, contract;
let scannedData = null;

const contractAddress = "YOUR_NEW_DEPLOYED_ADDRESS_HERE";

const contracts = {
  sepolia: {
    address: contractAddress,
    abi: contractABI,
  },
};

// ---------------------------
// INITIALIZE WALLET
// ---------------------------
async function initWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const network = await provider.getNetwork();
  if (!contracts[network.name.toLowerCase()]) {
    alert("Unsupported network");
    return;
  }

  contract = new ethers.Contract(contractAddress, contractABI, signer);

  console.log("Wallet OK");
}

initWallet();

// ---------------------------
// QR SCANNER SETUP
// ---------------------------
const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" },
  {
    fps: 10,
    qrbox: 250,
  },
  (decodedText) => {
    console.log("QR Data:", decodedText);
    try {
      scannedData = JSON.parse(decodedText);

      document.getElementById("qrReceiver").innerText = scannedData.receiver;
      document.getElementById("qrEmi").innerText = scannedData.emiAmount;
      document.getElementById("qrInterval").innerText =
        scannedData.interval + " sec";
      document.getElementById("qrTotal").innerText = scannedData.totalAmount;

      document.getElementById("infoBox").style.display = "block";

      html5QrCode.stop();
    } catch (err) {
      alert("Invalid QR Code");
    }
  },
  (err) => {}
);

// ---------------------------
// CREATE PLAN FROM QR
// ---------------------------
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    const emi = ethers.utils.parseEther(scannedData.emiAmount);
    const total = ethers.utils.parseEther(scannedData.totalAmount);

    const tx = await contract.createEmiPlan(
      scannedData.receiver,
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

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

    // Save to history (for wallets.html table)
    saveWalletHistory(account);
  } catch (e) {
    console.error(e);
    alert("Failed to connect wallet");
  }
};

async function autoReconnectWallet() {
  const storedWallet = JSON.parse(localStorage.getItem("connectedWallet"));
  if (!storedWallet) return;

  if (!window.ethereum) return;

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    const account = await signer.getAddress();
    if (account.toLowerCase() !== storedWallet.address.toLowerCase()) {
      // If the current MetaMask account is different, clear localStorage
      localStorage.removeItem("connectedWallet");
      return;
    }

    const network = await provider.getNetwork();
    const netName = network.name.toLowerCase();

    document.getElementById("account").innerText = "Wallet: " + account;
    document.getElementById("networkName").value = netName;

    if (!contracts[netName]) return;

    contract = new ethers.Contract(
      contracts[netName].address,
      contracts[netName].abi,
      signer
    );

    updateButtonStates(true);
    console.log("Wallet reconnected automatically!");
  } catch (err) {
    console.error(err);
    localStorage.removeItem("connectedWallet");
  }
}

// Call it on page load
window.addEventListener("load", autoReconnectWallet);

// --------------------------------------
// SAVE CONNECTED WALLET IN HISTORY
// --------------------------------------
function saveWalletHistory(address) {
  const list = JSON.parse(localStorage.getItem("walletHistory") || "[]");

  const now = new Date();
  const entry = {
    address,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
  };

  // Avoid duplicates
  const exists = list.find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (!exists) {
    list.push(entry);
    localStorage.setItem("walletHistory", JSON.stringify(list));
  }
}

// Show/Hide custom interval
document.getElementById("intervalSelect").addEventListener("change", () => {
  document.getElementById("customInterval").style.display =
    document.getElementById("intervalSelect").value === "custom"
      ? "block"
      : "none";
});

// Generate QR
// document.getElementById("createPlanBtn").onclick = async () => {
//   try {
//     const receiver = await signer.getAddress();
//     const emi = document.getElementById("emiAmount").value;
//     const total = document.getElementById("totalAmount").value;

//     let interval = document.getElementById("intervalSelect").value;
//     if (interval === "custom") {
//       interval = Number(document.getElementById("customInterval").value) * 60;
//     }

//     const qrData = JSON.stringify({
//       receiver,
//       emiAmount: emi,
//       interval,
//       totalAmount: total,
//     });

//     new QRCode(document.getElementById("qrCode"), {
//       text: qrData,
//       width: 220,
//       height: 220,
//     });

//     alert("QR Generated Successfully!");
//   } catch (err) {
//     console.error(err);
//     alert("Error generating QR");
//   }
// };

// Generate QR
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    // Get receiver address from input
    const receiverAddress = document.getElementById("receiverAddress").value;
    if (!ethers.utils.isAddress(receiverAddress)) {
      return alert("Please enter a valid Ethereum address");
    }

    // Get EMI amount
    const emiAmount = document.getElementById("emiAmount").value;
    if (!emiAmount || isNaN(emiAmount) || Number(emiAmount) <= 0) {
      return alert("Please enter a valid EMI amount");
    }

    let interval = document.getElementById("intervalSelect").value;
    if (interval === "custom") {
      interval = Number(document.getElementById("customInterval").value) * 60;
      if (!interval || interval <= 0)
        return alert("Enter a valid custom interval");
    } else {
      interval = Number(interval);
    }

    const totalAmount = document.getElementById("totalAmount").value;
    if (!totalAmount || isNaN(totalAmount) || Number(totalAmount) <= 0)
      return alert("Enter a valid total amount");

    // Convert ETH to wei
    const weiAmount = ethers.utils.parseEther(emiAmount);

    // Create Ethereum URI (EIP-681 format)
    const ethereumURI = `ethereum:${receiverAddress}?value=${weiAmount.toString()}`;

    // Generate QR code
    document.getElementById("qrCode").innerHTML = ""; // Clear previous QR
    new QRCode(document.getElementById("qrCode"), {
      text: ethereumURI,
      width: 220,
      height: 220,
    });

    alert("QR Generated Successfully! Scan it in MetaMask to pay.");
  } catch (err) {
    console.error(err);
    alert("Error generating QR");
  }
};

let provider;
let signer;
let contract;

// Contract setup
const contractAddress = "0xd850d788B586386aA90436680A7df84224574a91";

const contracts = {
  sepolia: {
    address: contractAddress,
    abi: contractABI,
  },
};

// --------------------------------------
// CONNECT WALLET
// --------------------------------------
document.getElementById("connectWalletBtn").onclick = async () => {
  try {
    if (!window.ethereum) return alert("MetaMask not installed!");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();

    const account = await signer.getAddress();
    document.getElementById("account").innerText = "Wallet: " + account;

    const network = await provider.getNetwork();
    const netName = network.name.toLowerCase();
    document.getElementById("networkName").value = netName;

    // Save connected wallet to localStorage
    localStorage.setItem(
      "connectedWallet",
      JSON.stringify({
        address: account,
        network: netName,
      })
    );

    if (!contracts[netName]) return alert("Unsupported network!");

    contract = new ethers.Contract(
      contracts[netName].address,
      contracts[netName].abi,
      signer
    );

    updateButtonStates(true);
    alert("Wallet Connected!");
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed!");
  }
};

//--------------------------------------------
function updateButtonStates(isConnected) {
  document.getElementById("createPlanBtn").disabled = !isConnected;
  document.getElementById("depositBtn").disabled = !isConnected;
  document.getElementById("checkBalanceBtn").disabled = !isConnected;
  document.getElementById("loadPlanBtn").disabled = !isConnected;
}

updateButtonStates(false);



// --------------------------------------
// RECEIVER CREATES QR CODE
// --------------------------------------
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    const receiver = await signer.getAddress();

    const emiAmount = document.getElementById("emiAmount").value;
    const total = document.getElementById("totalAmount").value;

    let interval = document.getElementById("intervalSelect").value;
    if (interval === "custom") {
      const min = Number(document.getElementById("customInterval").value);
      interval = min * 60;
    } else {
      interval = Number(interval);
    }

    // Get current network name
    const network = await provider.getNetwork();

    // Include contract address and network for sender
    const qrData = JSON.stringify({
      contract: contractAddress, // Contract address for auto-pay
      network: network.name, // e.g., 'sepolia'
      receiver: receiver, // Receiver wallet address
      emiAmount: emiAmount, // EMI amount in ETH
      totalAmount: total, // Total plan amount in ETH
      interval: interval, // Interval in seconds
    });

    QRCode.toCanvas(
      document.getElementById("qrCode"),
      qrData,
      { width: 220 },
      (err) => {
        if (err) console.error(err);
      }
    );

    alert("QR Generated! Sender scans this.");
  } catch (err) {
    console.error(err);
    alert("Error creating QR");
  }
};

// --------------------------------------
// SENDER DEPOSITS FUNDS
// --------------------------------------
document.getElementById("depositBtn").onclick = async () => {
  try {
    const amount = ethers.utils.parseEther(
      document.getElementById("depositAmount").value
    );
    const tx = await contract.depositFunds({ value: amount });
    await tx.wait();
    alert("Deposit Successful!");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// --------------------------------------
// LOAD PLAN
// --------------------------------------
document.getElementById("loadPlanBtn").onclick = async () => {
  try {
    const p = await contract.plan();
    document.getElementById("planSender").innerText = p.sender;
    document.getElementById("planReceiver").innerText = p.receiver;
    document.getElementById("planEmiAmount").innerText =
      ethers.utils.formatEther(p.emiAmount);
    document.getElementById("planInterval").innerText = p.interval + " sec";
    document.getElementById("planTotalAmount").innerText =
      ethers.utils.formatEther(p.totalAmount);
    document.getElementById("planPaid").innerText = ethers.utils.formatEther(
      p.amountPaid
    );
    document.getElementById("planNextPayment").innerText = new Date(
      p.nextPaymentTime * 1000
    ).toLocaleString();
    document.getElementById("planStatus").innerText = p.isActive
      ? "ACTIVE"
      : "COMPLETED";

    const dep = await contract.getSenderDeposit(p.sender);
    document.getElementById("planSenderNetwork").innerText =
      ethers.utils.formatEther(dep) + " ETH deposited";
  } catch (err) {
    console.error(err);
    alert("Failed to load plan");
  }
};

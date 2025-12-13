import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.9.0/dist/ethers.min.js";

const connectBtn = document.getElementById("connectBtn");

connectBtn.onclick = async () => {
  try {
    if (!window.ethereum) {
      alert("Install MetaMask or another Ethereum wallet.");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    alert("Wallet connected: " + address);

    // Now you can call your backend to fetch EMI details using planId
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get("planId");
    if (!planId) return alert("No planId found in QR link.");

    // Example: call backend API to get EMI transaction info
    const res = await fetch(
      `https://yourdomain.com/api/getPlan?planId=${planId}`
    );
    const planData = await res.json();

    // Send transaction using signer
    const contract = new ethers.Contract(
      planData.contractAddress,
      planData.abi,
      signer
    );

    const tx = await contract.activatePlan(planId, { gasLimit: 200000 });
    await tx.wait();
    alert("EMI payment activated successfully!");
  } catch (err) {
    console.error(err);
    alert("Error connecting wallet or activating plan: " + err.message);
  }
};

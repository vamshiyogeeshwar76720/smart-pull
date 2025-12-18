//old code pull based - sender to receiver  (receive payment not fucntioning . to work this seperate page fo teh sender is needeed)

// import { AppConfig } from "./config.js";
// import { contractABI } from "./abi.js";

// let provider, signer;

// // Elements
// const connectBtn = document.getElementById("connectWalletBtn");
// const disconnectBtn = document.getElementById("disconnectWalletBtn");
// const accountDisplay = document.getElementById("account");
// const networkDisplay = document.getElementById("network");

// const blockchainSelect = document.getElementById("blockchainSelect");
// const tokenSelect = document.getElementById("tokenSelect");
// const intervalSelect = document.getElementById("intervalSelect");
// const customIntervalInput = document.getElementById("customInterval");

// // --- WALLET CONNECTION LOGIC ---
// async function connectWallet() {
//   if (!window.ethereum) return alert("Install MetaMask");
//   provider = new ethers.providers.Web3Provider(window.ethereum);
//   await provider.send("eth_requestAccounts", []);
//   signer = provider.getSigner();

//   const address = await signer.getAddress();
//   const network = await provider.getNetwork();

//   accountDisplay.innerText = "Wallet: " + address;
//   networkDisplay.innerText = `Network: ${network.name} (chainId: ${network.chainId})`;

//   connectBtn.style.display = "none";
//   disconnectBtn.style.display = "inline-block";

//   sessionStorage.setItem("walletAddress", address);
//   sessionStorage.setItem("walletNetwork", network.name);
// }

// async function disconnectWallet() {
//   signer = null;
//   provider = null;
//   accountDisplay.innerText = "";
//   networkDisplay.innerText = "";
//   connectBtn.style.display = "inline-block";
//   disconnectBtn.style.display = "none";

//   sessionStorage.removeItem("walletAddress");
//   sessionStorage.removeItem("walletNetwork");
// }

// async function restoreWallet() {
//   const storedAddress = sessionStorage.getItem("walletAddress");
//   const storedNetwork = sessionStorage.getItem("walletNetwork");
//   if (storedAddress && window.ethereum) {
//     provider = new ethers.providers.Web3Provider(window.ethereum);
//     signer = provider.getSigner();
//     accountDisplay.innerText = "Wallet: " + storedAddress;
//     networkDisplay.innerText = "Network: " + storedNetwork;
//     connectBtn.style.display = "none";
//     disconnectBtn.style.display = "inline-block";
//   }
// }

// connectBtn.onclick = connectWallet;
// disconnectBtn.onclick = disconnectWallet;
// restoreWallet();

// // --- DROPDOWN LOGIC ---
// Object.keys(AppConfig.CHAINS).forEach((key) => {
//   const opt = document.createElement("option");
//   opt.value = key;
//   opt.text = AppConfig.CHAINS[key].name;
//   blockchainSelect.appendChild(opt);
// });

// function populateTokens() {
//   const chainKey = blockchainSelect.value;
//   tokenSelect.innerHTML = "";
//   const tokens = AppConfig.getTokens(chainKey);
//   for (const tokenName in tokens) {
//     const opt = document.createElement("option");
//     opt.value = tokens[tokenName];
//     opt.text = tokenName;
//     tokenSelect.appendChild(opt);
//   }
// }

// const tokenAddressDisplay = document.getElementById("tokenAddressDisplay");
// function updateTokenAddressDisplay() {
//   tokenAddressDisplay.value = tokenSelect.value || "";
// }

// populateTokens();
// updateTokenAddressDisplay();
// blockchainSelect.addEventListener("change", () => {
//   populateTokens();
//   updateTokenAddressDisplay();
// });
// tokenSelect.addEventListener("change", updateTokenAddressDisplay);

// intervalSelect.addEventListener("change", () => {
//   customIntervalInput.style.display =
//     intervalSelect.value === "custom" ? "inline-block" : "none";
// });

// // --- CREATE EMI PLAN (Receiver creates plan, sender must activate it) ---
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const receiverAddress = await signer.getAddress();
//     const emiAmountInput = document.getElementById("emiAmount").value.trim();
//     const totalAmountInput = document
//       .getElementById("totalAmount")
//       .value.trim();
//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     if (!tokenAddress || !ethers.utils.isAddress(tokenAddress))
//       return alert("Select valid token");

//     if (!emiAmountInput || isNaN(emiAmountInput) || Number(emiAmountInput) <= 0)
//       return alert("Invalid EMI amount");
//     if (
//       !totalAmountInput ||
//       isNaN(totalAmountInput) ||
//       Number(totalAmountInput) < Number(emiAmountInput)
//     )
//       return alert("Total amount must be >= EMI amount");

//     let interval =
//       intervalSelect.value === "custom"
//         ? Number(customIntervalInput.value.trim()) * 60
//         : Number(intervalSelect.value);
//     if (interval < 60) return alert("Interval must be >= 1 min (60 seconds)");

//     const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
//     if (decimals === undefined) return alert("Token decimals not configured");

//     const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
//     const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

//     let contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     // Create EMI Plan - receiver creates it for themselves
//     const tx = await contract.createEmiPlan(
//       receiverAddress, // receiver is the connected wallet
//       tokenAddress,
//       emiAmount,
//       interval,
//       totalAmount,
//       { gasLimit: 200000 }
//     );

//     console.log("Transaction sent:", tx.hash);
//     const receipt = await tx.wait();
//     console.log("Transaction confirmed:", receipt);

//     // Get Plan ID from emitted event
//     const event = receipt.events.find((e) => e.event === "EmiPlanCreated");
//     if (!event) {
//       return alert(
//         "EmiPlanCreated event not found. Check ABI or contract deployment."
//       );
//     }
//     const planId = event.args.planId;

//     // Generate shareable link or information for sender
//     const planDetails = `
// EMI Plan Created Successfully!

// Plan ID: ${planId.toString()}
// Contract Address: ${contractAddress}
// Receiver: ${receiverAddress}
// Token: ${tokenSymbol} (${tokenAddress})
// EMI Amount: ${emiAmountInput} ${tokenSymbol}
// Total Amount: ${totalAmountInput} ${tokenSymbol}
// Payment Interval: ${interval / 60} minutes

// IMPORTANT FOR SENDER:
// 1. Optional: Send down payment directly to receiver (normal transfer)
// 2. Approve token to EMI contract
// 3. Call activatePlan(planId)
// Once activated:
// - EMI auto-pay starts
// - No further action needed

// Status: Waiting for sender activation...
//     `.trim();

//     alert(planDetails);

//     // Listen for PlanActivated event
//     setupPlanEventListeners(
//       contract,
//       planId,
//       contractAddress,
//       tokenSymbol,
//       decimals
//     );
//   } catch (err) {
//     console.error("Error creating EMI plan:", err);
//     const msg =
//       err?.reason || err?.data?.message || err?.message || "Unknown error";
//     alert("Error creating plan: " + msg);
//   }
// };

// // --- SETUP EVENT LISTENERS FOR PLAN ---
// function setupPlanEventListeners(
//   contract,
//   planId,
//   contractAddress,
//   tokenSymbol,
//   decimals
// ) {
//   console.log(`Setting up listeners for Plan ID: ${planId.toString()}`);

//   // Listen for PlanActivated event
//   contract.on("PlanActivated", (planId, sender) => {
//     if (planId.eq(planId)) {
//       console.log(`Plan ${planId.toString()} activated by ${sender}`);
//       alert(
//         `✅ Plan Activated!\n\nPlan ID: ${planId.toString()}\nSender: ${sender}\n\nAuto-debit has started. Payments will be made automatically at the scheduled intervals.`
//       );
//     }
//   });

//   // Listen for EmiPaid event
//   contract.on("EmiPaid", (planId, receiver, amount) => {
//     if (pid.eq(planId)) {
//       const formattedAmount = ethers.utils.formatUnits(amount, decimals);
//       console.log(
//         `EMI Payment received for Plan ${planId.toString()}: ${formattedAmount} ${tokenSymbol}`
//       );
//       alert(
//         `💰 EMI Payment Received!\n\nPlan ID: ${planId.toString()}\nAmount: ${formattedAmount} ${tokenSymbol}\nReceiver: ${receiver}`
//       );
//     }
//   });

//   // Listen for EmiCompleted event
//   contract.on("EmiCompleted", (planId) => {
//     if (planId.eq(planId)) {
//       console.log(`Plan ${planId.toString()} completed!`);
//       alert(
//         `🎉 EMI Plan Completed!\n\nPlan ID: ${planId.toString()}\n\nAll payments have been received. The plan is now inactive.`
//       );
//     }
//   });

//   // Listen for ReceiverModified event
//   contract.on("ReceiverModified", (pid, oldR, newR) => {
//     if (!pid.eq(planId)) return;

//     alert(
//       `🔁 Receiver Updated!\n\nOld Receiver:\n${oldR}\n\nNew Receiver:\n${newR}`
//     );
//   });

//   console.log("Event listeners set up successfully");
// }

// // --- CHECK PLAN STATUS (Optional utility function) ---
// async function checkPlanStatus(planId) {
//   if (!provider) return alert("Connect wallet first");

//   try {
//     const blockchain = blockchainSelect.value;
//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(
//       contractAddress,
//       contractABI,
//       provider
//     );

//     const plan = await contract.plans(planId);

//     const status = `
// Plan ID: ${planId}
// Sender: ${plan.sender}
// Receiver: ${plan.receiver}
// Token: ${plan.token}
// EMI Amount: ${plan.emiAmount.toString()}
// Total Amount: ${plan.totalAmount.toString()}
// Amount Paid: ${plan.amountPaid.toString()}
// Interval: ${plan.interval.toString()} seconds
// Next Payment: ${new Date(
//       plan.nextPaymentTime.toNumber() * 1000
//     ).toLocaleString()}
// Active: ${plan.isActive ? "Yes" : "No"}
//     `.trim();

//     alert(status);
//   } catch (err) {
//     console.error("Error checking plan status:", err);
//     alert("Error: " + (err?.message || "Unknown error"));
//   }
// }

// // Make checkPlanStatus available globally for debugging/testing
// window.checkPlanStatus = checkPlanStatus;
// receiver.js --permit based ERC20 AND TRC20
import { AppConfig } from "./config.js";
import { contractABI } from "./abi.js";

/* =========================================================
   GLOBAL STATE
========================================================= */
let provider = null;
let signer = null;
let receiverAddress = null;

/* =========================================================
   UI ELEMENTS
========================================================= */
const connectBtn = document.getElementById("connectWalletBtn");
const disconnectBtn = document.getElementById("disconnectWalletBtn");
const accountDisplay = document.getElementById("account");
const networkDisplay = document.getElementById("network");

const blockchainSelect = document.getElementById("blockchainSelect");
const tokenSelect = document.getElementById("tokenSelect");
const tokenAddressDisplay = document.getElementById("tokenAddressDisplay");

const intervalSelect = document.getElementById("intervalSelect");
const customIntervalInput = document.getElementById("customInterval");

/* =========================================================
   WALLET (RECEIVER ONLY)
========================================================= */
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not detected");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  signer = provider.getSigner();
  receiverAddress = await signer.getAddress();

  const network = await provider.getNetwork();

  accountDisplay.innerText = `Wallet: ${receiverAddress}`;
  networkDisplay.innerText = `Network: ${network.name} (${network.chainId})`;

  connectBtn.style.display = "none";
  disconnectBtn.style.display = "inline-block";

  sessionStorage.setItem("receiverAddress", receiverAddress);
}

function disconnectWallet() {
  provider = null;
  signer = null;
  receiverAddress = null;

  accountDisplay.innerText = "";
  networkDisplay.innerText = "";

  connectBtn.style.display = "inline-block";
  disconnectBtn.style.display = "none";

  sessionStorage.clear();
}

connectBtn.onclick = connectWallet;
disconnectBtn.onclick = disconnectWallet;

/* =========================================================
   DROPDOWNS (CHAIN + TOKEN)
========================================================= */
Object.keys(AppConfig.CHAINS).forEach((chainKey) => {
  const opt = document.createElement("option");
  opt.value = chainKey;
  opt.text = AppConfig.CHAINS[chainKey].name;
  blockchainSelect.appendChild(opt);
});

function populateTokens() {
  tokenSelect.innerHTML = "";
  tokenAddressDisplay.value = "";

  const tokens = AppConfig.getTokens(blockchainSelect.value);
  Object.entries(tokens).forEach(([symbol, address]) => {
    const opt = document.createElement("option");
    opt.value = address;
    opt.text = symbol;
    tokenSelect.appendChild(opt);
  });

  tokenAddressDisplay.value = tokenSelect.value || "";
}

blockchainSelect.addEventListener("change", populateTokens);
tokenSelect.addEventListener("change", () => {
  tokenAddressDisplay.value = tokenSelect.value || "";
});

populateTokens();

/* =========================================================
   INTERVAL HANDLING
========================================================= */
intervalSelect.addEventListener("change", () => {
  customIntervalInput.style.display =
    intervalSelect.value === "custom" ? "block" : "none";
});

/* =========================================================
   CREATE EMI PLAN (RECEIVER)
========================================================= */
document.getElementById("createPlanBtn").onclick = async () => {
  if (!signer) return alert("Connect receiver wallet first");

  const blockchain = blockchainSelect.value;

  /* ---------- TRON BLOCK ---------- */
  if (blockchain === "tron") {
    alert(
      "TRON EMI plans require a separate TronLink-based flow.\nThis panel supports EVM only."
    );
    return;
  }

  try {
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

    const emiAmountInput = document.getElementById("emiAmount").value;
    const totalAmountInput = document.getElementById("totalAmount").value;

    if (!ethers.utils.isAddress(tokenAddress))
      return alert("Invalid token address");

    if (!emiAmountInput || !totalAmountInput)
      return alert("Amount fields required");

    const tokenMeta = AppConfig.getTokenMeta(blockchain, tokenSymbol);
    if (!tokenMeta) return alert("Token metadata not configured");

    const decimals = tokenMeta.decimals;

    const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
    const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

    let intervalSeconds =
      intervalSelect.value === "custom"
        ? Number(customIntervalInput.value) * 60
        : Number(intervalSelect.value);

    if (intervalSeconds < 60)
      return alert("Interval must be at least 60 seconds");

    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    const tx = await contract.createEmiPlan(
      receiverAddress,
      tokenAddress,
      emiAmount,
      intervalSeconds,
      totalAmount
    );

    alert("Transaction sent. Waiting for confirmation...");
    const receipt = await tx.wait();

    const createdEvent = receipt.events.find(
      (e) => e.event === "EmiPlanCreated"
    );
    if (!createdEvent) throw new Error("Plan creation event missing");

    const planId = createdEvent.args.planId.toString();

    alert(
      `
✅ EMI PLAN CREATED

Plan ID: ${planId}
Receiver: ${receiverAddress}
Token: ${tokenSymbol}
EMI Amount: ${emiAmountInput}
Total Amount: ${totalAmountInput}
Interval: ${intervalSeconds / 60} minutes

NEXT STEPS:
• Share Plan ID with sender
• Sender approves contract once
• Sender activates EMI
• Auto-pay starts

⚠ Sender never connects here
      `.trim()
    );

    setupEventListeners(contract, planId, tokenSymbol, decimals);
  } catch (err) {
    console.error(err);
    alert(err?.reason || err?.message || "Failed to create EMI plan");
  }
};

/* =========================================================
   EVENT MONITORING
========================================================= */
function setupEventListeners(contract, planId, symbol, decimals) {
  contract.on("PlanActivated", (pid, sender) => {
    if (pid.toString() !== planId) return;
    alert(`✅ EMI Activated by Sender:\n${sender}`);
  });

  contract.on("EmiPaid", (pid, receiver, amount) => {
    if (pid.toString() !== planId) return;
    alert(
      `💰 EMI RECEIVED\n${ethers.utils.formatUnits(amount, decimals)} ${symbol}`
    );
  });

  contract.on("EmiCompleted", (pid) => {
    if (pid.toString() !== planId) return;
    alert("🎉 EMI PLAN COMPLETED");
  });

  contract.on("ReceiverModified", (pid, oldR, newR) => {
    if (pid.toString() !== planId) return;
    alert(`🔁 Receiver Updated\n\nOld: ${oldR}\nNew: ${newR}`);
  });

  console.log("📡 EMI event listeners active");
}

/* =========================================================
   MODIFY RECEIVER
========================================================= */
document.getElementById("modifyReceiverBtn").onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  try {
    const planId = document.getElementById("modifyPlanId").value.trim();
    const newReceiver = document
      .getElementById("newReceiverAddress")
      .value.trim();

    if (!planId || isNaN(planId)) return alert("Invalid Plan ID");
    if (!ethers.utils.isAddress(newReceiver))
      return alert("Invalid receiver address");

    const blockchain = blockchainSelect.value;
    if (blockchain === "tron")
      return alert("Receiver modification for TRON handled separately");

    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    const tx = await contract.modifyReceiver(planId, newReceiver);
    await tx.wait();

    alert(
      `
✅ RECEIVER UPDATED

Plan ID: ${planId}
New Receiver: ${newReceiver}

All future EMI payments will go to the new address.
      `.trim()
    );
  } catch (err) {
    console.error(err);
    alert(err?.reason || err?.message || "Receiver update failed");
  }
};

// Listen for ReceiverModified event
// contract.on("ReceiverModified", (pid, oldR, newR) => {
//   if (!pid.eq(planId)) return;

//   alert(
//     `🔁 Receiver Updated!\n\nOld Receiver:\n${oldR}\n\nNew Receiver:\n${newR}`
//   );
// });
// document.getElementById("modifyReceiverBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const planId = document.getElementById("modifyPlanId").value.trim();
//     const newReceiver = document
//       .getElementById("newReceiverAddress")
//       .value.trim();

//     if (!planId || isNaN(planId)) return alert("Invalid Plan ID");
//     if (!ethers.utils.isAddress(newReceiver))
//       return alert("Invalid receiver address");

//     const blockchain = blockchainSelect.value;
//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const tx = await contract.modifyReceiver(planId, newReceiver);
//     await tx.wait();

//     alert(
//       `
// ✅ Receiver Updated Successfully

// Plan ID: ${planId}
// New Receiver: ${newReceiver}

// All future EMI payments will be sent to this address.
//     `.trim()
//     );
//   } catch (err) {
//     console.error(err);
//     alert(err?.reason || err?.message || "Modify failed");
//   }
// };

// IMPORTANT: Share the following with the sender:
// - Plan ID: ${planId.toString()}
// - Contract Address: ${contractAddress}

//escrow model -- the moeny needs to be deposited at a time only. (sender to contract to receiver)
// import { AppConfig } from "./config.js";
// import { contractABI } from "./abi.js";

// let provider, signer;

// /* ================= WALLET ELEMENTS ================= */
// const connectBtn = document.getElementById("connectWalletBtn");
// const disconnectBtn = document.getElementById("disconnectWalletBtn");
// const accountDisplay = document.getElementById("account");
// const networkDisplay = document.getElementById("network");

// const blockchainSelect = document.getElementById("blockchainSelect");
// const tokenSelect = document.getElementById("tokenSelect");
// const intervalSelect = document.getElementById("intervalSelect");
// const customIntervalInput = document.getElementById("customInterval");

// /* ================= WALLET CONNECTION ================= */
// async function connectWallet() {
//   if (!window.ethereum) return alert("Install MetaMask");

//   provider = new ethers.providers.Web3Provider(window.ethereum);
//   await provider.send("eth_requestAccounts", []);
//   signer = provider.getSigner();

//   const address = await signer.getAddress();
//   const network = await provider.getNetwork();

//   accountDisplay.innerText = `Wallet: ${address}`;
//   networkDisplay.innerText = `Network: ${network.name} (${network.chainId})`;

//   connectBtn.style.display = "none";
//   disconnectBtn.style.display = "inline-block";
// }

// async function disconnectWallet() {
//   signer = null;
//   provider = null;
//   accountDisplay.innerText = "";
//   networkDisplay.innerText = "";
//   connectBtn.style.display = "inline-block";
//   disconnectBtn.style.display = "none";
// }

// connectBtn.onclick = connectWallet;
// disconnectBtn.onclick = disconnectWallet;

// /* ================= DROPDOWNS ================= */
// Object.keys(AppConfig.CHAINS).forEach((key) => {
//   const opt = document.createElement("option");
//   opt.value = key;
//   opt.text = AppConfig.CHAINS[key].name;
//   blockchainSelect.appendChild(opt);
// });

// function populateTokens() {
//   tokenSelect.innerHTML = "";
//   const tokens = AppConfig.getTokens(blockchainSelect.value);
//   for (const name in tokens) {
//     const opt = document.createElement("option");
//     opt.value = tokens[name];
//     opt.text = name;
//     tokenSelect.appendChild(opt);
//   }
// }

// const tokenAddressDisplay = document.getElementById("tokenAddressDisplay");
// tokenSelect.onchange = () => (tokenAddressDisplay.value = tokenSelect.value);

// blockchainSelect.onchange = () => {
//   populateTokens();
//   tokenAddressDisplay.value = tokenSelect.value;
// };

// populateTokens();
// tokenAddressDisplay.value = tokenSelect.value;

// intervalSelect.onchange = () => {
//   customIntervalInput.style.display =
//     intervalSelect.value === "custom" ? "inline-block" : "none";
// };

// /* ================= CREATE EMI PLAN (ESCROW) ================= */
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     const emiAmountInput = document.getElementById("emiAmount").value;
//     const totalAmountInput = document.getElementById("totalAmount").value;

//     let interval =
//       intervalSelect.value === "custom"
//         ? Number(customIntervalInput.value) * 60
//         : Number(intervalSelect.value);

//     if (interval < 60) return alert("Interval must be ≥ 1 minute");

//     const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
//     const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
//     const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

//     const contractAddress = AppConfig.getEmiContract(blockchainSelect.value);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     /* Receiver ONLY creates plan */
//     const tx = await contract.createEmiPlan(
//       tokenAddress,
//       emiAmount,
//       interval,
//       totalAmount
//     );

//     const receipt = await tx.wait();
//     const event = receipt.events.find((e) => e.event === "EmiPlanCreated");
//     const planId = event.args.planId.toString();

//     /* SHARE WITH SENDER */
//     alert(
//       `
// ✅ EMI PLAN CREATED (ESCROW MODE)

// PLAN ID: ${planId}
// CONTRACT: ${contractAddress}
// TOKEN: ${tokenSymbol}
// TOTAL DEPOSIT: ${totalAmountInput} ${tokenSymbol}

// 📌 SENDER INSTRUCTIONS:
// 1. Approve ${totalAmountInput} ${tokenSymbol} to contract
// 2. Call deposit(${planId}, ${totalAmountInput})
// (from any wallet / script / dApp)
// ⚡ Auto EMI starts automatically
// Receiver does NOTHING further
//     `.trim()
//     );

//     setupEventListeners(contract, planId, tokenSymbol, decimals);
//   } catch (err) {
//     console.error(err);
//     alert(err?.reason || err?.message || "Error creating plan");
//   }
// };

// /* ================= EVENT LISTENERS ================= */
// function setupEventListeners(contract, planId, tokenSymbol, decimals) {
//   contract.on("Deposited", (pid, sender, amount) => {
//     if (pid.toString() !== planId) return;
//     alert(`💰 Deposit received from ${sender}`);
//   });

//   contract.on("EmiReleased", (pid, amount) => {
//     if (pid.toString() !== planId) return;
//     alert(
//       `📤 EMI Released: ${ethers.utils.formatUnits(
//         amount,
//         decimals
//       )} ${tokenSymbol}`
//     );
//   });

//   contract.on("PlanCompleted", (pid) => {
//     if (pid.toString() !== planId) return;
//     alert("🎉 EMI PLAN COMPLETED");
//   });
// }

// /* ================= CHECK PLAN STATUS ================= */
// window.checkPlanStatus = async (planId) => {
//   if (!provider) return alert("Connect wallet");

//   const contract = new ethers.Contract(
//     AppConfig.getEmiContract(blockchainSelect.value),
//     contractABI,
//     provider
//   );

//   const p = await contract.plans(planId);

//   alert(
//     `
// PLAN ${planId}
// Receiver: ${p.receiver}
// Sender: ${p.sender}
// Released: ${ethers.utils.formatUnits(p.amountReleased)}
// Active: ${p.active}
// Next EMI: ${new Date(p.nextPaymentTime * 1000).toLocaleString()}
//   `.trim()
//   );
// };

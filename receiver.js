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
  networkDisplay.innerText = `Network: ${network.name} (chainId: ${network.chainId})`;

  connectBtn.style.display = "none";
  disconnectBtn.style.display = "inline-block";

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

  sessionStorage.removeItem("walletAddress");
  sessionStorage.removeItem("walletNetwork");
}

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

connectBtn.onclick = connectWallet;
disconnectBtn.onclick = disconnectWallet;
restoreWallet();

// --- DROPDOWN LOGIC ---
Object.keys(AppConfig.CHAINS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.text = AppConfig.CHAINS[key].name;
  blockchainSelect.appendChild(opt);
});

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
function updateTokenAddressDisplay() {
  tokenAddressDisplay.value = tokenSelect.value || "";
}

populateTokens();
updateTokenAddressDisplay();
blockchainSelect.addEventListener("change", () => {
  populateTokens();
  updateTokenAddressDisplay();
});
tokenSelect.addEventListener("change", updateTokenAddressDisplay);

intervalSelect.addEventListener("change", () => {
  customIntervalInput.style.display =
    intervalSelect.value === "custom" ? "inline-block" : "none";
});

// --- CREATE EMI PLAN (Receiver creates plan, sender must activate it) ---
document.getElementById("createPlanBtn").onclick = async () => {
  if (!signer) return alert("Connect wallet first");

  try {
    const receiverAddress = await signer.getAddress();
    const emiAmountInput = document.getElementById("emiAmount").value.trim();
    const totalAmountInput = document
      .getElementById("totalAmount")
      .value.trim();
    const blockchain = blockchainSelect.value;
    const tokenAddress = tokenSelect.value;
    const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress))
      return alert("Select valid token");

    if (!emiAmountInput || isNaN(emiAmountInput) || Number(emiAmountInput) <= 0)
      return alert("Invalid EMI amount");
    if (
      !totalAmountInput ||
      isNaN(totalAmountInput) ||
      Number(totalAmountInput) < Number(emiAmountInput)
    )
      return alert("Total amount must be >= EMI amount");

    let interval =
      intervalSelect.value === "custom"
        ? Number(customIntervalInput.value.trim()) * 60
        : Number(intervalSelect.value);
    if (interval < 60) return alert("Interval must be >= 1 min (60 seconds)");

    const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
    if (decimals === undefined) return alert("Token decimals not configured");

    const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
    const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

    let contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Create EMI Plan - receiver creates it for themselves
    const tx = await contract.createEmiPlan(
      receiverAddress, // receiver is the connected wallet
      tokenAddress,
      emiAmount,
      interval,
      totalAmount,
      { gasLimit: 200000 }
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);

    // Get Plan ID from emitted event
    const event = receipt.events.find((e) => e.event === "EmiPlanCreated");
    if (!event) {
      return alert(
        "EmiPlanCreated event not found. Check ABI or contract deployment."
      );
    }
    const planId = event.args.planId;

    // Generate shareable link or information for sender
    const planDetails = `
EMI Plan Created Successfully!

Plan ID: ${planId.toString()}
Contract Address: ${contractAddress}
Receiver: ${receiverAddress}
Token: ${tokenSymbol} (${tokenAddress})
EMI Amount: ${emiAmountInput} ${tokenSymbol}
Total Amount: ${totalAmountInput} ${tokenSymbol}
Payment Interval: ${interval / 60} minutes

IMPORTANT: Share the following with the sender:
- Plan ID: ${planId.toString()}
- Contract Address: ${contractAddress}
- They must call receivePayment(${planId.toString()}, amount) to activate auto-payments
- The sender needs to approve tokens to the contract first

Status: Waiting for sender activation...
    `.trim();

    alert(planDetails);

    // Listen for PlanActivated event
    setupPlanEventListeners(
      contract,
      planId,
      contractAddress,
      tokenSymbol,
      decimals
    );
  } catch (err) {
    console.error("Error creating EMI plan:", err);
    const msg =
      err?.reason || err?.data?.message || err?.message || "Unknown error";
    alert("Error creating plan: " + msg);
  }
};

// --- SETUP EVENT LISTENERS FOR PLAN ---
function setupPlanEventListeners(
  contract,
  planId,
  contractAddress,
  tokenSymbol,
  decimals
) {
  console.log(`Setting up listeners for Plan ID: ${planId.toString()}`);

  // Listen for PlanActivated event
  contract.on("PlanActivated", (planId, sender) => {
    if (planId.eq(planId)) {
      console.log(`Plan ${planId.toString()} activated by ${sender}`);
      alert(
        `✅ Plan Activated!\n\nPlan ID: ${planId.toString()}\nSender: ${sender}\n\nAuto-debit has started. Payments will be made automatically at the scheduled intervals.`
      );
    }
  });

  // Listen for EmiPaid event
  contract.on("EmiPaid", (planId, receiver, amount) => {
    if (pid.eq(planId)) {
      const formattedAmount = ethers.utils.formatUnits(amount, decimals);
      console.log(
        `EMI Payment received for Plan ${planId.toString()}: ${formattedAmount} ${tokenSymbol}`
      );
      alert(
        `💰 EMI Payment Received!\n\nPlan ID: ${planId.toString()}\nAmount: ${formattedAmount} ${tokenSymbol}\nReceiver: ${receiver}`
      );
    }
  });

  // Listen for EmiCompleted event
  contract.on("EmiCompleted", (planId) => {
    if (planId.eq(planId)) {
      console.log(`Plan ${planId.toString()} completed!`);
      alert(
        `🎉 EMI Plan Completed!\n\nPlan ID: ${planId.toString()}\n\nAll payments have been received. The plan is now inactive.`
      );
    }
  });

  console.log("Event listeners set up successfully");
}

// --- CHECK PLAN STATUS (Optional utility function) ---
async function checkPlanStatus(planId) {
  if (!provider) return alert("Connect wallet first");

  try {
    const blockchain = blockchainSelect.value;
    const contractAddress = AppConfig.getEmiContract(blockchain);
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    const plan = await contract.plans(planId);

    const status = `
Plan ID: ${planId}
Sender: ${plan.sender}
Receiver: ${plan.receiver}
Token: ${plan.token}
EMI Amount: ${plan.emiAmount.toString()}
Total Amount: ${plan.totalAmount.toString()}
Amount Paid: ${plan.amountPaid.toString()}
Interval: ${plan.interval.toString()} seconds
Next Payment: ${new Date(
      plan.nextPaymentTime.toNumber() * 1000
    ).toLocaleString()}
Active: ${plan.isActive ? "Yes" : "No"}
    `.trim();

    alert(status);
  } catch (err) {
    console.error("Error checking plan status:", err);
    alert("Error: " + (err?.message || "Unknown error"));
  }
}

// Make checkPlanStatus available globally for debugging/testing
window.checkPlanStatus = checkPlanStatus;

//code that payments will be done but the auto pay is not caing
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

// // --- WALLET CONNECTION ---
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

// connectBtn.onclick = connectWallet;
// disconnectBtn.onclick = disconnectWallet;

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

// // --- CREATE EMI PLAN ---
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const receiver = document.getElementById("receiverAddress").value.trim();
//     const emiAmountInput = document.getElementById("emiAmount").value.trim();
//     const totalAmountInput = document
//       .getElementById("totalAmount")
//       .value.trim();
//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     if (!receiver || !ethers.utils.isAddress(receiver))
//       return alert("Enter valid receiver address");
//     if (!tokenAddress || !ethers.utils.isAddress(tokenAddress))
//       return alert("Select valid token");

//     if (!emiAmountInput || isNaN(emiAmountInput) || Number(emiAmountInput) <= 0)
//       return alert("Invalid EMI amount");
//     if (
//       !totalAmountInput ||
//       isNaN(totalAmountInput) ||
//       Number(totalAmountInput) < Number(emiAmountInput)
//     )
//       return alert("Total < EMI");

//     let interval =
//       intervalSelect.value === "custom"
//         ? Number(customIntervalInput.value.trim()) * 60
//         : Number(intervalSelect.value);
//     if (interval < 60) return alert("Interval must be >= 1 min");

//     const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
//     if (decimals === undefined) return alert("Token decimals not configured");

//     const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
//     const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const tx = await contract.createEmiPlan(
//       receiver,
//       tokenAddress,
//       emiAmount,
//       interval,
//       totalAmount,
//       { gasLimit: 200000 }
//     );

//     const receipt = await tx.wait();

//     const event = receipt.events.find((e) => e.event === "EmiPlanCreated");
//     if (!event) throw new Error("EmiPlanCreated event not found");
//     const planId = event.args.planId;

//     alert(
//       `✅ EMI Plan Created!\n\nPlan ID: ${planId}\nContract Address for Sender: ${contractAddress}\nShare this with the sender.`
//     );

//     // Listen for PlanActivated (auto-debit started)
//     contract.on("PlanActivated", (pid, sender) => {
//       if (pid.eq(planId)) {
//         alert(
//           `✅ Auto-debit started for Plan ID: ${pid} from sender: ${sender}`
//         );
//       }
//     });

//     // Listen for EmiPaid events
//     contract.on("EmiPaid", (pid, receiverAddr, amount) => {
//       if (pid.eq(planId)) {
//         alert(
//           `💰 EMI Paid: ${ethers.utils.formatUnits(
//             amount,
//             decimals
//           )} ${tokenSymbol} to ${receiverAddr}`
//         );
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     const msg =
//       err?.reason || err?.data?.message || err?.message || "Unknown error";
//     alert("Error creating plan: " + msg);
//   }
// };

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

//   // // Add receiver to table
//   // addReceiverToTable(address, false);
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

// // --- RECEIVER TABLE LOGIC ---
// // function addReceiverToTable(address, autoDebitStarted = false) {
// //   const tableBody = document.querySelector("#receiverTable tbody");
// //   const row = document.createElement("tr");
// //   const now = new Date();
// //   const timeStr = now.toLocaleString();
// //   row.innerHTML = `
// //     <td>${address}</td>
// //     <td>${timeStr}</td>
// //     <td>${autoDebitStarted ? "✅" : "❌"}</td>
// //   `;
// //   tableBody.appendChild(row);
// // }

// // function updateAutoDebitStatus(address, status) {
// //   const rows = document.querySelectorAll("#receiverTable tbody tr");
// //   rows.forEach((row) => {
// //     if (row.cells[0].innerText === address) {
// //       row.cells[2].innerText = status ? "✅" : "❌";
// //     }
// //   });
// // }

// // --- CHECK PLAN STATUS ---
// async function checkEmiPlanStatus(planId, contract) {
//   try {
//     const plan = await contract.plan(planId);
//     return plan.isActive;
//   } catch (err) {
//     console.error("Error checking EMI plan:", err);
//     return false;
//   }
// }

// // --- CREATE EMI PLAN (Link only, no sender involved, no QR) ---
// document.getElementById("createPlanBtn").onclick = async () => {
//   if (!signer) return alert("Connect wallet first");

//   try {
//     const receiver = document.getElementById("receiverAddress").value.trim();
//     const emiAmountInput = document.getElementById("emiAmount").value.trim();
//     const totalAmountInput = document
//       .getElementById("totalAmount")
//       .value.trim();
//     const blockchain = blockchainSelect.value;
//     const tokenAddress = tokenSelect.value;
//     const tokenSymbol = tokenSelect.options[tokenSelect.selectedIndex].text;

//     if (!receiver || !ethers.utils.isAddress(receiver))
//       return alert("Enter valid receiver");
//     if (!tokenAddress || !ethers.utils.isAddress(tokenAddress))
//       return alert("Select valid token");

//     if (!emiAmountInput || isNaN(emiAmountInput) || Number(emiAmountInput) <= 0)
//       return alert("Invalid EMI amount");
//     if (
//       !totalAmountInput ||
//       isNaN(totalAmountInput) ||
//       Number(totalAmountInput) < Number(emiAmountInput)
//     )
//       return alert("Total < EMI");

//     // let interval = intervalSelect.value;
//     // if (interval === "custom") {
//     //   const customVal = customIntervalInput.value.trim();
//     //   if (!customVal || isNaN(customVal) || Number(customVal) <= 0)
//     //     return alert("Invalid custom interval");
//     //   interval = Number(customVal) * 60;
//     // } else {
//     //   interval = Number(interval);
//     // }

//     let interval =
//       intervalSelect.value === "custom"
//         ? Number(customIntervalInput.value.trim()) * 60
//         : Number(intervalSelect.value);
//     if (interval < 60) return alert("Interval must be >= 1 min");

//     // const receiverNetwork = networkDisplay.innerText
//     //   .replace("Network: ", "")
//     //   .split(" ")[0];

//     const decimals = AppConfig.TOKEN_DECIMALS[tokenSymbol];
//     if (decimals === undefined) return alert("Token decimals not configured");

//     const emiAmount = ethers.utils.parseUnits(emiAmountInput, decimals);
//     const totalAmount = ethers.utils.parseUnits(totalAmountInput, decimals);

//     const contractAddress = AppConfig.getEmiContract(blockchain);
//     const contract = new ethers.Contract(contractAddress, contractABI, signer);

//     const tx = await contract.createEmiPlan(
//       receiver,
//       tokenAddress,
//       emiAmount,
//       interval,
//       totalAmount,
//       { gasLimit: 200000 }
//     );

//     const receipt = await tx.wait();

//     // Use emitted event instead of contract.planCounter()
//     const event = receipt.events.find((e) => e.event === "EmiPlanCreated");
//     if (!event) {
//       alert(
//         "EmiPlanCreated event not found. Check ABI or contract deployment."
//       );
//     }
//     const PlanId = event.args.planId;

//     // --- DISPLAY CONTRACT ADDRESS AND MESSAGE ---
//     alert(
//       `EMI Plan Created Successfully!\n\nPlan ID: ${PlanId}\nReceiver should receive payments at contract address:\n${contractAddress}\n\nYou can now share this address with the sender to send payments.`
//     );

//     // Listen for PlanActivated event
//     contract.on("PlanActivated", (pid, sender) => {
//       if (pid.eq(PlanId)) {
//         alert(`Auto-debit started for Plan ID: ${pid}`);
//       }
//     });

//     const usdtContract = new ethers.Contract(
//       tokenAddress,
//       [
//         "event Transfer(address indexed from, address indexed to, uint256 value)",
//       ],
//       provider
//     );

//     usdtContract.on("Transfer", (from, to, value) => {
//       if (to.toLowerCase() === contractAddress.toLowerCase()) {
//         console.log(
//           `Received ${tokenSymbol} from ${from}: ${ethers.utils.formatUnits(
//             value,
//             decimals
//           )}`
//         );
//         alert(
//           `Payment detected from ${from}: ${ethers.utils.formatUnits(
//             value,
//             decimals
//           )} ${tokenSymbol}`
//         );
//       }
//     });

//     // --- NEW: Listen for USDT Transfer to this contract ---
//     // const usdtContract = new ethers.Contract(
//     //   tokenAddress,
//     //   [
//     //     "event Transfer(address indexed from, address indexed to, uint256 value)",
//     //   ],
//     //   provider
//     // );

//     // usdtContract.on("Transfer", (from, to, value) => {
//     //   if (to.toLowerCase() === contractAddress.toLowerCase()) {
//     //     console.log(`Received USDT from ${from} of amount ${value.toString()}`);
//     //     alert(
//     //       `Payment detected from ${from}: ${ethers.utils.formatUnits(
//     //         value,
//     //         decimals
//     //       )} ${tokenSymbol}`
//     //     );
//     //   }
//     // });
//   } catch (err) {
//     console.error(err);
//     const msg =
//       err?.reason || err?.data?.message || err?.message || "Unknown error";
//     alert("Error creating plan: " + msg);
//   }
// };

deploy.js

// scripts/deploy.js (CommonJS version)
import hre from "hardhat";


async function main() {
  console.log("Deploying EmiAutoPay contract...");

  // 1. Get contract factory
  const EmiContract = await hre.ethers.getContractFactory("EmiAutoPay");

  // 2. Deploy
  const emi = await EmiContract.deploy();
  

  console.log("EmiAutoPay deployed to:", emi.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


hardhat.config.cjs

// hardhat.config.cjs

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Read environment variables from .env
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/eb035b0a49e541c98c04dcdf95e3bf85";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xdd9f418f2c95b591b023f5169180d6740e663b06c640f68794cfce0901796d04";

// Ensure the variables exist
if (!RPC_URL || !PRIVATE_KEY) {
  throw new Error("Please set RPC_URL and PRIVATE_KEY in your .env file");
}

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

app.js
let provider;
let signer;
let contract;
let account;

const contractAddress = "0x0a4A9F4c2e8f4774984E28288692a55647b85fc5"; // Replace with your deployed address
// const contractABI = await fetch("abi.js")
//   .then((res) => res.json())
//   .then((data) => data.abi);

// --- Wallet Connection ---
document.getElementById("connectWalletBtn").onclick = async () => {
  if (!window.ethereum) {
    alert("Install Metamask!");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  account = await signer.getAddress();
  document.getElementById("account").innerText = "Connected: " + account;

  contract = new ethers.Contract(contractAddress, contractABI, signer);
};

// --- Create EMI Plan ---
document.getElementById("createPlanBtn").onclick = async () => {
  try {
    const sender = document.getElementById("sender").value;
    const emiAmount = ethers.utils.parseEther(
      document.getElementById("emiAmount").value
    );
    const interval = Number(document.getElementById("interval").value);
    const totalAmount = ethers.utils.parseEther(
      document.getElementById("totalAmount").value
    );

    const tx = await contract.createEmiPlan(
      sender,
      emiAmount,
      interval,
      totalAmount
    );
    await tx.wait();
    alert("EMI Plan Created Successfully!");
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
};

// --- Deposit Funds ---
document.getElementById("depositBtn").onclick = async () => {
  try {
    const depositAmount = ethers.utils.parseEther(
      document.getElementById("depositAmount").value
    );
    const tx = await contract.depositFunds({ value: depositAmount });
    await tx.wait();
    alert("Deposit Successful!");
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
};

// --- Check Contract Balance ---
document.getElementById("checkBalanceBtn").onclick = async () => {
  try {
    const balance = await contract.getContractBalance();
    document.getElementById("contractBalance").innerText =
      ethers.utils.formatEther(balance) + " ETH";
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
};

abi.js
// ABI extracted from EmiAutoPay.json
const contractABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DepositMade",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "EmergencyWithdraw",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "EmiCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nextPaymentTime",
        type: "uint256",
      },
    ],
    name: "EmiPaid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "emiAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "interval",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
    ],
    name: "EmiPlanCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "checkUpkeep",
    outputs: [
      {
        internalType: "bool",
        name: "upkeepNeeded",
        type: "bool",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_emiAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_interval",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_totalAmount",
        type: "uint256",
      },
    ],
    name: "createEmiPlan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "depositFunds",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "performUpkeep",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "plan",
    outputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "emiAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "interval",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountPaid",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "nextPaymentTime",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isActive",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];


index.html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EMI AutoPay DApp</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <h1>EMI AutoPay DApp</h1>

    <div id="wallet">
        <button id="connectWalletBtn">Connect Wallet</button>
        <p id="account"></p>
    </div>

    <hr>

    <div id="createPlan">
        <h2>Create EMI Plan</h2>
        <input id="sender" placeholder="Sender Address">
        <input id="emiAmount" placeholder="EMI Amount (ETH)">
        <input id="interval" placeholder="Interval (seconds)">
        <input id="totalAmount" placeholder="Total Amount (ETH)">
        <button id="createPlanBtn">Create EMI Plan</button>
    </div>

    <hr>

    <div id="deposit">
        <h2>Deposit Funds</h2>
        <input id="depositAmount" placeholder="Amount to deposit (ETH)">
        <button id="depositBtn">Deposit</button>
    </div>

    <hr>

    <div id="balance">
        <h2>Contract Balance</h2>
        <button id="checkBalanceBtn">Check Balance</button>
        <p id="contractBalance">0 ETH</p>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
    <script src="abi.js"></script>
    <script src="app.js"></script>


</body>

</html>


EmiAutoPay.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*
-----------------------------------------------------------
 FULL PRODUCTION-GRADE EMI AUTOPAY SMART CONTRACT
-----------------------------------------------------------
 - Sender sends first payment OFF-CHAIN (wallet → receiver)
 - Receiver sets EMI plan: interval, EMI amount, total amount
 - Sender deposits remaining amount into this contract
 - Chainlink Automation triggers scheduled EMI payments
 - Payments stop automatically when total target is reached
-----------------------------------------------------------
*/

contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard, Ownable {
    
    // --------------------------------------
    // EVENTS (Frontend will use these)
    // --------------------------------------

    event EmiPlanCreated(
        address indexed sender,
        address indexed receiver,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    );

    event DepositMade(address indexed sender, uint256 amount);
    event EmiPaid(address indexed receiver, uint256 amount, uint256 nextPaymentTime);
    event EmiCompleted(address indexed receiver);
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    // --------------------------------------
    // STRUCTS & STORAGE
    // --------------------------------------

    struct EmiPlan {
        address sender;
        address receiver;
        uint256 emiAmount;
        uint256 interval;
        uint256 totalAmount;
        uint256 amountPaid;
        uint256 nextPaymentTime;
        bool isActive;
    }

    EmiPlan public plan;

    // --------------------------------------
    // CREATE EMI PLAN (Receiver sets EMI plan)
    // --------------------------------------

    function createEmiPlan(
        address _sender,
        uint256 _emiAmount,
        uint256 _interval,
        uint256 _totalAmount
    ) external {
        require(_sender != address(0), "Invalid sender");
        require(_emiAmount > 0, "EMI amount must be > 0");
        require(_interval >= 60, "Interval must be >= 60 seconds");
        require(_totalAmount > _emiAmount, "Total must be > EMI amount");

        plan = EmiPlan({
            sender: _sender,
            receiver: msg.sender,
            emiAmount: _emiAmount,
            interval: _interval,
            totalAmount: _totalAmount,
            amountPaid: 0,
            nextPaymentTime: block.timestamp + _interval,
            isActive: true
        });

        emit EmiPlanCreated(_sender, msg.sender, _emiAmount, _interval, _totalAmount);
    }

    // --------------------------------------
    // SENDER DEPOSITS FUNDS INTO CONTRACT
    // --------------------------------------

    function depositFunds() external payable nonReentrant {
        require(plan.isActive, "Plan not active");
        require(msg.sender == plan.sender, "Only sender can deposit");

        emit DepositMade(msg.sender, msg.value);
    }

    // --------------------------------------
    // CHAINLINK AUTOMATION - CHECKUPKEEP
    // --------------------------------------

    function checkUpkeep(bytes calldata) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory) 
    {
        upkeepNeeded =
            plan.isActive &&
            address(this).balance >= plan.emiAmount &&
            block.timestamp >= plan.nextPaymentTime;

        return (upkeepNeeded, "");
    }

    // --------------------------------------
    // CHAINLINK AUTOMATION - PERFORMUPKEEP
    // --------------------------------------

    function performUpkeep(bytes calldata) 
        external 
        override 
        nonReentrant 
    {
        if (
            plan.isActive &&
            address(this).balance >= plan.emiAmount &&
            block.timestamp >= plan.nextPaymentTime
        ) {
            payable(plan.receiver).transfer(plan.emiAmount);
            plan.amountPaid += plan.emiAmount;

            if (plan.amountPaid >= plan.totalAmount) {
                plan.isActive = false;
                emit EmiCompleted(plan.receiver);
                return;
            }

            plan.nextPaymentTime = block.timestamp + plan.interval;
            emit EmiPaid(plan.receiver, plan.emiAmount, plan.nextPaymentTime);
        }
    }

    // --------------------------------------
    // EMERGENCY WITHDRAW (Owner Only)
    // --------------------------------------

    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
        emit EmergencyWithdraw(owner(), amount);
    }

    // --------------------------------------
    // PUBLIC VIEW FUNCTIONS
    // --------------------------------------

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

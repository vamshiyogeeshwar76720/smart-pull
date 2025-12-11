// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard, Ownable {
    event EmiPlanCreated(
        address indexed sender,
        address indexed receiver,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    );

    event DepositMade(address indexed sender, uint256 amount);
    event EmiPaid(
        address indexed receiver,
        uint256 amount,
        uint256 nextPaymentTime
    );
    event EmiCompleted(address indexed receiver);

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

    mapping(address => uint256) public senderDeposits;

    // ------------------------------
    // SENDER CREATES EMI PLAN
    // ------------------------------
    function createEmiPlan(
        address receiver,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    ) external {
        require(receiver != address(0), "Invalid receiver");
        require(emiAmount > 0, "Invalid EMI");
        require(totalAmount > emiAmount, "Total < EMI");
        require(interval >= 60, "Interval too small");

        plan = EmiPlan({
            sender: msg.sender,
            receiver: receiver,
            emiAmount: emiAmount,
            interval: interval,
            totalAmount: totalAmount,
            amountPaid: 0,
            nextPaymentTime: block.timestamp + interval,
            isActive: true
        });

        emit EmiPlanCreated(
            msg.sender,
            receiver,
            emiAmount,
            interval,
            totalAmount
        );
    }

    // ------------------------------
    // SENDER DEPOSITS FUNDS
    // ------------------------------
    function depositFunds() external payable nonReentrant {
        require(plan.isActive, "No active plan");
        require(msg.sender == plan.sender, "Not EMI sender");

        senderDeposits[msg.sender] += msg.value;
        emit DepositMade(msg.sender, msg.value);
    }

    function getSenderDeposit(address s) external view returns (uint256) {
        return senderDeposits[s];
    }

    // ------------------------------
    // CHAINLINK CHECK
    // ------------------------------
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded =
            plan.isActive &&
            senderDeposits[plan.sender] >= plan.emiAmount &&
            block.timestamp >= plan.nextPaymentTime;
    }

    // ------------------------------
    // CHAINLINK PERFORM
    // ------------------------------
    function performUpkeep(bytes calldata) external override nonReentrant {
        if (
            plan.isActive &&
            senderDeposits[plan.sender] >= plan.emiAmount &&
            block.timestamp >= plan.nextPaymentTime
        ) {
            senderDeposits[plan.sender] -= plan.emiAmount;
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

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

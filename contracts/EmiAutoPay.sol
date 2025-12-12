// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
gti 
contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
    event EmiPlanCreated(
        uint256 indexed planId,
        address indexed receiver,
        string receiverNetwork,
        address tokenAddress,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    );

    event PlanActivated(uint256 indexed planId, address indexed sender);

    event EmiPaid(
        uint256 indexed planId,
        address indexed receiver,
        uint256 amount,
        uint256 nextPaymentTime
    );

    event EmiCompleted(uint256 indexed planId, address indexed receiver);

    struct EmiPlan {
        address sender;
        address receiver;
        string receiverNetwork;
        address tokenAddress;
        uint256 emiAmount;
        uint256 interval;
        uint256 totalAmount;
        uint256 amountPaid;
        uint256 nextPaymentTime;
        bool isActive;
    }

    uint256 public planCounter;
    mapping(uint256 => EmiPlan) public plans;

    // RECEIVER CREATES PLAN (Inactive)
    function createEmiPlan(
        address receiver,
        string memory receiverNetwork,
        address tokenAddress,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    ) external {
        require(receiver != address(0), "Invalid receiver");
        require(tokenAddress != address(0), "Invalid token");
        require(emiAmount > 0, "Invalid EMI");
        require(totalAmount >= emiAmount, "Total < EMI");
        require(interval >= 60, "Interval >= 1 minute");

        planCounter++;

        plans[planCounter] = EmiPlan({
            sender: address(0),
            receiver: receiver,
            receiverNetwork: receiverNetwork,
            tokenAddress: tokenAddress,
            emiAmount: emiAmount,
            interval: interval,
            totalAmount: totalAmount,
            amountPaid: 0,
            nextPaymentTime: 0,
            isActive: false
        });

        emit EmiPlanCreated(
            planCounter,
            receiver,
            receiverNetwork,
            tokenAddress,
            emiAmount,
            interval,
            totalAmount
        );
    }

    // SENDER SENDS FIRST PAYMENT MANUALLY → RECEIVER CALLS THIS ONE TIME
    function activatePlan(uint256 planId, address sender) external {
        EmiPlan storage plan = plans[planId];

        require(!plan.isActive, "Already active");
        require(plan.sender == address(0), "Sender already locked");
        require(sender != address(0), "Invalid sender");

        // SET SENDER & START AUTO-DEBIT
        plan.sender = sender;
        plan.isActive = true;
        plan.nextPaymentTime = block.timestamp + plan.interval;

        emit PlanActivated(planId, sender);
    }

    // CHAINLINK UPKEEP CHECK
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        for (uint256 i = 1; i <= planCounter; i++) {
            EmiPlan storage plan = plans[i];

            if (
                plan.isActive &&
                plan.amountPaid < plan.totalAmount &&
                block.timestamp >= plan.nextPaymentTime &&
                IERC20(plan.tokenAddress).allowance(
                    plan.sender,
                    address(this)
                ) >=
                plan.emiAmount &&
                IERC20(plan.tokenAddress).balanceOf(plan.sender) >=
                plan.emiAmount
            ) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    // CHAINLINK AUTO-DEBIT
    function performUpkeep(
        bytes calldata performData
    ) external override nonReentrant {
        uint256 planId = abi.decode(performData, (uint256));
        EmiPlan storage plan = plans[planId];

        require(plan.isActive, "Plan inactive");
        require(block.timestamp >= plan.nextPaymentTime, "Too early");

        IERC20 token = IERC20(plan.tokenAddress);
        require(
            token.transferFrom(plan.sender, plan.receiver, plan.emiAmount),
            "Transfer failed"
        );

        plan.amountPaid += plan.emiAmount;

        if (plan.amountPaid >= plan.totalAmount) {
            plan.isActive = false;
            emit EmiCompleted(planId, plan.receiver);
            return;
        }

        plan.nextPaymentTime = block.timestamp + plan.interval;

        emit EmiPaid(
            planId,
            plan.receiver,
            plan.emiAmount,
            plan.nextPaymentTime
        );
    }
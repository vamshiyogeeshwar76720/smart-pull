// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
    event EmiPlanCreated(
        uint256 indexed planId,
        address indexed sender,
        address indexed receiver,
        address token,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    );

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
        address token;
        uint256 emiAmount;
        uint256 interval;
        uint256 totalAmount;
        uint256 amountPaid;
        uint256 nextPaymentTime;
        bool isActive;
    }

    uint256 public planCounter;
    mapping(uint256 => EmiPlan) public plans;

    function createEmiPlan(
        address receiver,
        address token,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    ) external {
        require(receiver != address(0), "Invalid receiver");
        require(token != address(0), "Invalid token");
        require(emiAmount > 0, "Invalid EMI amount");
        require(totalAmount >= emiAmount, "Total < EMI");
        require(interval >= 60, "Interval at least 1 minute");

        planCounter++;
        plans[planCounter] = EmiPlan({
            sender: msg.sender,
            receiver: receiver,
            token: token,
            emiAmount: emiAmount,
            interval: interval,
            totalAmount: totalAmount,
            amountPaid: 0,
            nextPaymentTime: block.timestamp + interval,
            isActive: true
        });

        emit EmiPlanCreated(
            planCounter,
            msg.sender,
            receiver,
            token,
            emiAmount,
            interval,
            totalAmount
        );
    }

    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
        for (uint256 i = 1; i <= planCounter; i++) {
            EmiPlan storage plan = plans[i];
            if (
                plan.isActive &&
                plan.amountPaid < plan.totalAmount &&
                block.timestamp >= plan.nextPaymentTime &&
                IERC20(plan.token).allowance(plan.sender, address(this)) >=
                plan.emiAmount &&
                IERC20(plan.token).balanceOf(plan.sender) >= plan.emiAmount
            ) {
                upkeepNeeded = true;
                return (true, abi.encode(i));
            }
        }
        upkeepNeeded = false;
    }

    function performUpkeep(
        bytes calldata performData
    ) external override nonReentrant {
        uint256 planId = abi.decode(performData, (uint256));
        EmiPlan storage plan = plans[planId];
        require(plan.isActive, "Plan not active");
        require(block.timestamp >= plan.nextPaymentTime, "Too early");

        IERC20 token = IERC20(plan.token);
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
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract EmiAutoPayEVM is AutomationCompatibleInterface {
    struct Plan {
        address sender;
        address receiver;
        address token;
        uint256 emi;
        uint256 interval;
        uint256 total;
        uint256 paid;
        uint256 nextPay;
        bool active;
    }

    uint256 public planCount;
    mapping(uint256 => Plan) public plans;

    event PlanCreated(uint256 planId);
    event FirstPaymentDetected(uint256 planId, address sender);
    event EmiPaid(uint256 planId, uint256 amount);

    // RECEIVER CREATES PLAN
    function createPlan(
        address token,
        uint256 emi,
        uint256 interval,
        uint256 total
    ) external {
        require(interval >= 60);
        planCount++;

        plans[planCount] = Plan(
            address(0),
            msg.sender,
            token,
            emi,
            interval,
            total,
            0,
            0,
            false
        );

        emit PlanCreated(planCount);
    }

    // RECEIVER CONFIRMS FIRST PAYMENT
    function confirmFirstPayment(uint256 planId, address sender) external {
        Plan storage p = plans[planId];
        require(msg.sender == p.receiver);
        require(!p.active);

        p.sender = sender;
        p.active = true;
        p.nextPay = block.timestamp + p.interval;

        emit FirstPaymentDetected(planId, sender);
    }

    // CHAINLINK
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool, bytes memory) {
        for (uint i = 1; i <= planCount; i++) {
            Plan storage p = plans[i];
            if (
                p.active &&
                block.timestamp >= p.nextPay &&
                p.paid < p.total &&
                IERC20(p.token).allowance(p.sender, address(this)) >= p.emi
            ) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata data) external override {
        uint planId = abi.decode(data, (uint));
        Plan storage p = plans[planId];

        IERC20(p.token).transferFrom(p.sender, p.receiver, p.emi);

        p.paid += p.emi;
        p.nextPay = block.timestamp + p.interval;

        emit EmiPaid(planId, p.emi);
    }
}

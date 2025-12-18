// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
    TRC20 EMI AutoPay Contract
    - No Permit (TRON doesn't support it)
    - Requires backend / cron job to trigger payments
*/

interface ITRC20 {
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}

contract EmiAutoPayTRON {
    /*//////////////////////////////////////////////////////////////
                                STRUCT
    //////////////////////////////////////////////////////////////*/

    struct Plan {
        address payer; // Sender (customer)
        address receiver; // Merchant
        address token; // TRC20 token (USDT)
        uint256 emi; // EMI amount
        uint256 interval; // Seconds
        uint256 total; // Total amount
        uint256 paid; // Paid so far
        uint256 nextPay; // Next payment timestamp
        bool active;
    }

    uint256 public planCount;
    mapping(uint256 => Plan) public plans;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PlanCreated(uint256 indexed planId);
    event PlanActivated(uint256 indexed planId, address indexed payer);
    event EmiPaid(uint256 indexed planId, uint256 amount);
    event PlanCompleted(uint256 indexed planId);

    /*//////////////////////////////////////////////////////////////
                        CREATE PLAN (RECEIVER)
    //////////////////////////////////////////////////////////////*/

    function createPlan(
        address token,
        uint256 emi,
        uint256 interval,
        uint256 total
    ) external {
        require(token != address(0), "Invalid token");
        require(emi > 0, "Invalid EMI");
        require(interval >= 60, "Min interval 60s");
        require(total >= emi, "Total < EMI");

        planCount++;

        plans[planCount] = Plan({
            payer: address(0),
            receiver: msg.sender,
            token: token,
            emi: emi,
            interval: interval,
            total: total,
            paid: 0,
            nextPay: 0,
            active: false
        });

        emit PlanCreated(planCount);
    }

    /*//////////////////////////////////////////////////////////////
                        ACTIVATE PLAN (PAYER)
    //////////////////////////////////////////////////////////////*/

    function activatePlan(uint256 planId) external {
        Plan storage p = plans[planId];
        require(!p.active, "Already active");

        require(
            ITRC20(p.token).allowance(msg.sender, address(this)) >= p.emi,
            "Approve EMI first"
        );

        p.payer = msg.sender;
        p.active = true;
        p.nextPay = block.timestamp + p.interval;

        emit PlanActivated(planId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                    PAY EMI (BACKEND / CRON)
    //////////////////////////////////////////////////////////////*/

    function payEmi(uint256 planId) external {
        Plan storage p = plans[planId];
        require(p.active, "Inactive");
        require(block.timestamp >= p.nextPay, "Too early");

        require(
            ITRC20(p.token).transferFrom(p.payer, p.receiver, p.emi),
            "Transfer failed"
        );

        p.paid += p.emi;

        if (p.paid >= p.total) {
            p.active = false;
            emit EmiPaid(planId, p.emi);
            emit PlanCompleted(planId);
        } else {
            p.nextPay = block.timestamp + p.interval;
            emit EmiPaid(planId, p.emi);
        }
    }
}

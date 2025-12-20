// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/*//////////////////////////////////////////////////////////////
                            PERMIT2
//////////////////////////////////////////////////////////////*/

interface IPermit2 {
    function permit(
        address owner,
        PermitSingle calldata permitSingle,
        bytes calldata signature
    ) external;

    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external;
}

struct PermitSingle {
    PermitDetails details;
    address spender;
    uint256 sigDeadline;
}

struct PermitDetails {
    address token;
    uint160 amount;
    uint48 expiration;
    uint48 nonce;
}

contract EmiAutoPayEVM is AutomationCompatibleInterface, ReentrancyGuard {
    address public constant PERMIT2 =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public immutable USDT;

    constructor(address _usdt) {
        require(_usdt != address(0), "Invalid USDT");
        USDT = _usdt;
    }

    struct Plan {
        address sender;
        address receiver;
        uint256 emi;
        uint256 interval;
        uint256 total;
        uint256 paid;
        uint256 nextPay;
        bool active;
    }

    uint256 public planCount;
    mapping(uint256 => Plan) public plans;

    event PlanCreated(uint256 indexed planId);
    event PlanActivated(uint256 indexed planId, address sender);
    event EmiPaid(uint256 indexed planId, uint256 amount);
    event EmiCompleted(uint256 indexed planId);

    /*//////////////////////////////////////////////////////////////
                        RECEIVER CREATES PLAN
    //////////////////////////////////////////////////////////////*/

    function createPlan(uint256 emi, uint256 interval, uint256 total) external {
        require(emi > 0, "Invalid EMI");
        require(interval >= 60, "Min 60s");
        require(total >= emi, "Total < EMI");

        planCount++;

        plans[planCount] = Plan({
            sender: address(0),
            receiver: msg.sender,
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
        SENDER ACTIVATES + DOWNPAYMENT + PERMIT2 (ONE TX)
    //////////////////////////////////////////////////////////////*/

    function activatePlanWithPermit2AndPay(
        uint256 planId,
        uint160 activationAmount,
        PermitSingle calldata permit,
        bytes calldata signature
    ) external nonReentrant {
        Plan storage p = plans[planId];
        require(p.receiver != address(0), "Invalid plan");
        require(!p.active, "Already active");
        // require(downPayment >= p.emi, "Down < EMI");

        // 🔒 ADD THIS
        require(permit.details.amount >= p.total, "Permit amount < total EMI");

        require(permit.details.token == USDT, "USDT only");
        require(permit.spender == address(this), "Bad spender");

        // Register sender
        p.sender = msg.sender;

        // Permit2 for future EMIs

        IPermit2(PERMIT2).permit(msg.sender, permit, signature);

        if (activationAmount > 0) {
            IPermit2(PERMIT2).transferFrom(
                msg.sender,
                p.receiver,
                activationAmount,
                USDT
            );
            emit EmiPaid(planId, activationAmount);
        }

        p.active = true;
        // p.startTime = block.timestamp;
        p.nextPay = block.timestamp + p.interval;

        emit PlanActivated(planId, msg.sender);
        //      if (activationAmount > 0) {
        //     emit EmiPaid(planId, activationAmount); // optional event
        // }
    }

    /*//////////////////////////////////////////////////////////////
                        CHAINLINK AUTOMATION
    //////////////////////////////////////////////////////////////*/

    function checkUpkeep(
        bytes calldata
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 1; i <= planCount; i++) {
            Plan storage p = plans[i];
            if (p.active && p.paid < p.total && block.timestamp >= p.nextPay) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata data) external override nonReentrant {
        uint256 planId = abi.decode(data, (uint256));
        Plan storage p = plans[planId];
        require(p.active, "Inactive");
        IPermit2(PERMIT2).transferFrom(
            p.sender,
            p.receiver,
            uint160(p.emi),
            USDT
        );

        p.paid += p.emi;

        if (p.paid >= p.total) {
            p.active = false;
            emit EmiCompleted(planId);
        } else {
            p.nextPay = block.timestamp + p.interval;
            emit EmiPaid(planId, p.emi);
        }
    }
}

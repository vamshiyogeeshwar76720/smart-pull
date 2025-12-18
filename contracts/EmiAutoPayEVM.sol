// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
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
    // Ethereum Permit2 (Uniswap)
    address public constant PERMIT2 =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

    /*//////////////////////////////////////////////////////////////
                                STRUCT
    //////////////////////////////////////////////////////////////*/

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

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PlanCreated(uint256 indexed planId);
    event PlanActivated(uint256 indexed planId, address indexed sender);
    event EmiPaid(uint256 indexed planId, uint256 amount);
    event EmiCompleted(uint256 indexed planId);

    /*//////////////////////////////////////////////////////////////
                        RECEIVER CREATES PLAN
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
            sender: address(0),
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
                ACTIVATE PLAN (EIP-2612 → DAI / USDC)
    //////////////////////////////////////////////////////////////*/

    function activatePlanWithPermit(
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        Plan storage p = plans[planId];
        require(!p.active, "Already active");

        IERC20Permit(p.token).permit(
            msg.sender,
            address(this),
            p.emi,
            deadline,
            v,
            r,
            s
        );

        _activate(planId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                ACTIVATE PLAN (PERMIT2 → USDT)
    //////////////////////////////////////////////////////////////*/

    function activatePlanWithPermit2(
        uint256 planId,
        PermitSingle calldata permit,
        bytes calldata signature
    ) external {
        Plan storage p = plans[planId];
        require(!p.active, "Already active");

        IPermit2(PERMIT2).permit(msg.sender, permit, signature);

        _activate(planId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                ACTIVATE PLAN (NORMAL APPROVE)
    //////////////////////////////////////////////////////////////*/

    function activatePlan(uint256 planId) external {
        Plan storage p = plans[planId];
        require(!p.active, "Already active");

        require(
            IERC20(p.token).allowance(msg.sender, address(this)) >= p.emi,
            "Insufficient allowance"
        );

        _activate(planId, msg.sender);
    }

    function _activate(uint256 planId, address sender) internal {
        Plan storage p = plans[planId];
        p.sender = sender;
        p.active = true;
        p.nextPay = block.timestamp + p.interval;

        emit PlanActivated(planId, sender);
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
        require(block.timestamp >= p.nextPay, "Too early");

        // 1️⃣ Try normal ERC20 transferFrom
        bool success = IERC20(p.token).transferFrom(
            p.sender,
            p.receiver,
            p.emi
        );

        // 2️⃣ Fallback to Permit2 (USDT path)
        if (!success) {
            IPermit2(PERMIT2).transferFrom(
                p.sender,
                p.receiver,
                uint160(p.emi),
                p.token
            );
        }

        p.paid += p.emi;

        if (p.paid >= p.total) {
            p.active = false;
            emit EmiPaid(planId, p.emi);
            emit EmiCompleted(planId);
        } else {
            p.nextPay = block.timestamp + p.interval;
            emit EmiPaid(planId, p.emi);
        }
    }
}

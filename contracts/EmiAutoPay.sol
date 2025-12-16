// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
    event EmiPlanCreated(
        uint256 indexed planId,
        address indexed receiver,
        address token,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    );

    event PlanActivated(uint256 indexed planId, address indexed sender);
    event EmiPaid(uint256 indexed planId, address receiver, uint256 amount);
    event EmiCompleted(uint256 indexed planId);

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

    // ---------------- RECEIVER CREATES PLAN ----------------
    function createEmiPlan(
        address receiver,
        address token,
        uint256 emiAmount,
        uint256 interval,
        uint256 totalAmount
    ) external {
        require(receiver != address(0), "Invalid receiver");
        require(token != address(0), "Invalid token");
        require(interval >= 60, "Min 1 min");

        planCounter++;

        plans[planCounter] = EmiPlan({
            sender: address(0),
            receiver: receiver,
            token: token,
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
            token,
            emiAmount,
            interval,
            totalAmount
        );
    }

    // ---------------- SENDER INITIAL PAYMENT ----------------
    function receivePayment(
        uint256 planId,
        uint256 amount
    ) external nonReentrant {
        EmiPlan storage plan = plans[planId];

        require(!plan.isActive, "Plan already active");
        require(amount >= plan.emiAmount, "Amount < EMI");
        require(plan.receiver != address(0), "Plan does not exist");

        IERC20 token = IERC20(plan.token);

        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Approve token first"
        );
        require(
            token.transferFrom(msg.sender, plan.receiver, amount),
            "Transfer failed"
        );

        plan.sender = msg.sender;
        plan.isActive = true;
        plan.amountPaid = amount;
        plan.nextPaymentTime = block.timestamp + plan.interval;

        emit PlanActivated(planId, msg.sender);
        emit EmiPaid(planId, plan.receiver, amount);
    }

    // ---------------- CHAINLINK AUTOMATION ----------------
    function checkUpkeep(
        bytes calldata
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 1; i <= planCounter; i++) {
            EmiPlan storage p = plans[i];
            if (
                p.isActive &&
                p.amountPaid < p.totalAmount &&
                block.timestamp >= p.nextPaymentTime &&
                IERC20(p.token).allowance(p.sender, address(this)) >=
                p.emiAmount
            ) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    function performUpkeep(
        bytes calldata performData
    ) external override nonReentrant {
        uint256 planId = abi.decode(performData, (uint256));
        EmiPlan storage p = plans[planId];

        require(p.isActive, "Plan not active");

        IERC20(p.token).transferFrom(p.sender, p.receiver, p.emiAmount);

        p.amountPaid += p.emiAmount;

        if (p.amountPaid >= p.totalAmount) {
            p.isActive = false;
            emit EmiCompleted(planId);
        } else {
            p.nextPaymentTime = block.timestamp + p.interval;
            emit EmiPaid(planId, p.receiver, p.emiAmount);
        }
    }
}

// import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
//     event EmiPlanCreated(
//         uint256 indexed planId,
//         address indexed receiver,
//         address token,
//         uint256 emiAmount,
//         uint256 interval,
//         uint256 totalAmount
//     );

//     event PlanActivated(uint256 indexed planId, address indexed sender);
//     event EmiPaid(uint256 indexed planId, address receiver, uint256 amount);
//     event EmiCompleted(uint256 indexed planId);

//     struct EmiPlan {
//         address sender;
//         address receiver;
//         address token;
//         uint256 emiAmount;
//         uint256 interval;
//         uint256 totalAmount;
//         uint256 amountPaid;
//         uint256 nextPaymentTime;
//         bool isActive;
//     }

//     uint256 public planCounter;
//     mapping(uint256 => EmiPlan) public plans;

//     // ---------------- RECEIVER CREATES PLAN ----------------
//     function createEmiPlan(
//         address receiver,
//         address token,
//         uint256 emiAmount,
//         uint256 interval,
//         uint256 totalAmount
//     ) external {
//         require(receiver != address(0), "Invalid receiver");
//         require(token != address(0), "Invalid token");
//         require(interval >= 60, "Min 1 minute");

//         planCounter++;

//         plans[planCounter] = EmiPlan({
//             sender: address(0),
//             receiver: receiver,
//             token: token,
//             emiAmount: emiAmount,
//             interval: interval,
//             totalAmount: totalAmount,
//             amountPaid: 0,
//             nextPaymentTime: 0,
//             isActive: false
//         });

//         emit EmiPlanCreated(
//             planCounter,
//             receiver,
//             token,
//             emiAmount,
//             interval,
//             totalAmount
//         );
//     }

//     // ---------------- OPTION-2 MAGIC ----------------
//     function receivePayment(
//         uint256 planId,
//         uint256 amount
//     ) external nonReentrant {
//         EmiPlan storage plan = plans[planId];

//         require(!plan.isActive, "Plan already active");
//         require(amount >= plan.emiAmount, "Amount < EMI");

//         IERC20 token = IERC20(plan.token);

//         require(
//             token.allowance(msg.sender, address(this)) >= amount,
//             "Approve first"
//         );

//         require(
//             token.transferFrom(msg.sender, plan.receiver, amount),
//             "Transfer failed"
//         );

//         plan.sender = msg.sender;
//         plan.isActive = true;
//         plan.amountPaid = amount;
//         plan.nextPaymentTime = block.timestamp + plan.interval;

//         emit PlanActivated(planId, msg.sender);
//         emit EmiPaid(planId, plan.receiver, amount);
//     }

//     // ---------------- CHAINLINK ----------------
//     function checkUpkeep(
//         bytes calldata
//     ) external view override returns (bool upkeepNeeded, bytes memory data) {
//         for (uint256 i = 1; i <= planCounter; i++) {
//             EmiPlan storage p = plans[i];
//             if (
//                 p.isActive &&
//                 p.amountPaid < p.totalAmount &&
//                 block.timestamp >= p.nextPaymentTime &&
//                 IERC20(p.token).allowance(p.sender, address(this)) >=
//                 p.emiAmount
//             ) {
//                 return (true, abi.encode(i));
//             }
//         }
//         return (false, "");
//     }

//     function performUpkeep(bytes calldata data) external override nonReentrant {
//         uint256 planId = abi.decode(data, (uint256));
//         EmiPlan storage p = plans[planId];

//         IERC20(p.token).transferFrom(p.sender, p.receiver, p.emiAmount);

//         p.amountPaid += p.emiAmount;

//         if (p.amountPaid >= p.totalAmount) {
//             p.isActive = false;
//             emit EmiCompleted(planId);
//         } else {
//             p.nextPaymentTime = block.timestamp + p.interval;
//             emit EmiPaid(planId, p.receiver, p.emiAmount);
//         }
//     }
// }

// //code for the reeciver address based appraoch

// import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
//     // Add at the top below existing events
//     event DirectEmiPayment(
//         address indexed sender,
//         address indexed receiver,
//         uint256 amount,
//         uint256 planId
//     );

//     event EmiPlanCreated(
//         uint256 indexed planId,
//         address indexed receiver,
//         string receiverNetwork,
//         address tokenAddress,
//         uint256 emiAmount,
//         uint256 interval,
//         uint256 totalAmount
//     );

//     event PlanActivated(uint256 indexed planId, address indexed sender);

//     event EmiPaid(
//         uint256 indexed planId,
//         address indexed receiver,
//         uint256 amount,
//         uint256 nextPaymentTime
//     );

//     event EmiCompleted(uint256 indexed planId, address indexed receiver);

//     struct EmiPlan {
//         address sender; // Will be set when sender scans link
//         address receiver;
//         string receiverNetwork;
//         address tokenAddress;
//         uint256 emiAmount;
//         uint256 interval;
//         uint256 totalAmount;
//         uint256 amountPaid;
//         uint256 nextPaymentTime;
//         bool isActive;
//     }

//     uint256 public planCounter;
//     mapping(uint256 => EmiPlan) public plans;

//     // Receiver creates plan (inactive)
//     function createEmiPlan(
//         address receiver,
//         string memory receiverNetwork,
//         address tokenAddress,
//         uint256 emiAmount,
//         uint256 interval,
//         uint256 totalAmount
//     ) external {
//         require(receiver != address(0), "Invalid receiver");
//         require(tokenAddress != address(0), "Invalid token");
//         require(emiAmount > 0, "Invalid EMI");
//         require(totalAmount >= emiAmount, "Total < EMI");
//         require(interval >= 60, "Interval >= 1 minute");

//         planCounter++;

//         plans[planCounter] = EmiPlan({
//             sender: address(0),
//             receiver: receiver,
//             receiverNetwork: receiverNetwork,
//             tokenAddress: tokenAddress,
//             emiAmount: emiAmount,
//             interval: interval,
//             totalAmount: totalAmount,
//             amountPaid: 0,
//             nextPaymentTime: 0,
//             isActive: false
//         });

//         emit EmiPlanCreated(
//             planCounter,
//             receiver,
//             receiverNetwork,
//             tokenAddress,
//             emiAmount,
//             interval,
//             totalAmount
//         );
//     }

//     /**
//      * @notice Pay EMI by sending tokens directly to contract
//      * @dev Sender uses ANY wallet, no website needed
//      */
//     function payEmiByReceiver(address receiver) external nonReentrant {
//         uint256 activePlanId = 0;

//         // Find active plan for receiver
//         for (uint256 i = 1; i <= planCounter; i++) {
//             if (
//                 plans[i].receiver == receiver &&
//                 plans[i].isActive &&
//                 plans[i].amountPaid < plans[i].totalAmount
//             ) {
//                 activePlanId = i;
//                 break;
//             }
//         }

//         require(activePlanId != 0, "No active EMI plan");

//         EmiPlan storage plan = plans[activePlanId];

//         IERC20 token = IERC20(plan.tokenAddress);

//         require(
//             token.allowance(msg.sender, address(this)) >= plan.emiAmount,
//             "Approve EMI amount first"
//         );

//         require(
//             token.balanceOf(msg.sender) >= plan.emiAmount,
//             "Insufficient balance"
//         );

//         token.transferFrom(msg.sender, plan.receiver, plan.emiAmount);

//         plan.amountPaid += plan.emiAmount;
//         plan.nextPaymentTime = block.timestamp + plan.interval;

//         emit DirectEmiPayment(
//             msg.sender,
//             receiver,
//             plan.emiAmount,
//             activePlanId
//         );

//         if (plan.amountPaid >= plan.totalAmount) {
//             plan.isActive = false;
//             emit EmiCompleted(activePlanId, plan.receiver);
//         }
//     }

//     // Sender scans link → activates plan
//     function activatePlan(uint256 planId) external {
//         EmiPlan storage plan = plans[planId];
//         require(!plan.isActive, "Already active");
//         require(plan.sender == address(0), "Sender already assigned");

//         plan.sender = msg.sender;
//         plan.isActive = true;
//         plan.nextPaymentTime = block.timestamp + plan.interval;

//         emit PlanActivated(planId, msg.sender);
//     }

//     // Chainlink check
//     function checkUpkeep(
//         bytes calldata
//     )
//         external
//         view
//         override
//         returns (bool upkeepNeeded, bytes memory performData)
//     {
//         for (uint256 i = 1; i <= planCounter; i++) {
//             EmiPlan storage plan = plans[i];
//             if (
//                 plan.isActive &&
//                 plan.amountPaid < plan.totalAmount &&
//                 block.timestamp >= plan.nextPaymentTime &&
//                 IERC20(plan.tokenAddress).allowance(
//                     plan.sender,
//                     address(this)
//                 ) >=
//                 plan.emiAmount &&
//                 IERC20(plan.tokenAddress).balanceOf(plan.sender) >=
//                 plan.emiAmount
//             ) {
//                 return (true, abi.encode(i));
//             }
//         }
//         return (false, "");
//     }

//     // Chainlink auto-pay
//     function performUpkeep(
//         bytes calldata performData
//     ) external override nonReentrant {
//         uint256 planId = abi.decode(performData, (uint256));
//         EmiPlan storage plan = plans[planId];

//         require(plan.isActive, "Plan inactive");
//         require(block.timestamp >= plan.nextPaymentTime, "Too early");

//         IERC20 token = IERC20(plan.tokenAddress);
//         require(
//             token.transferFrom(plan.sender, plan.receiver, plan.emiAmount),
//             "Transfer failed"
//         );

//         plan.amountPaid += plan.emiAmount;

//         if (plan.amountPaid >= plan.totalAmount) {
//             plan.isActive = false;
//             emit EmiCompleted(planId, plan.receiver);
//             return;
//         }

//         plan.nextPaymentTime = block.timestamp + plan.interval;

//         emit EmiPaid(
//             planId,
//             plan.receiver,
//             plan.emiAmount,
//             plan.nextPaymentTime
//         );
//     }
// }

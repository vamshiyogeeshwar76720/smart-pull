// old code pull based - sender to receiver (receive payment not fucntioning . to work this seperate page fo teh sender is needeed)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

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

    event ReceiverModified(
        uint256 indexed planId,
        address oldReceiver,
        address newReceiver
    );

    function modifyReceiver(uint256 planId, address newReceiver) external {
        EmiPlan storage plan = plans[planId];

        require(plan.isActive, "Plan not active");
        require(plan.amountPaid < plan.totalAmount, "Plan completed");
        require(msg.sender == plan.receiver, "Only receiver can modify");
        require(newReceiver != address(0), "Invalid receiver");
        require(newReceiver != plan.receiver, "Same receiver");

        address oldReceiver = plan.receiver;
        plan.receiver = newReceiver;

        emit ReceiverModified(planId, oldReceiver, newReceiver);
    }

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
        require(emiAmount > 0, "Invalid EMI amount");
        require(totalAmount >= emiAmount, "Total < EMI");

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

    function activatePlanWithPermit(
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        EmiPlan storage plan = plans[planId];

        require(!plan.isActive, "Already active");
        require(plan.receiver != address(0), "Plan not found");

        // 1️⃣ Permit approval
        IERC20Permit(plan.token).permit(
            msg.sender,
            address(this),
            plan.emiAmount,
            deadline,
            v,
            r,
            s
        );

        // 2️⃣ Activate
        plan.sender = msg.sender;
        plan.isActive = true;
        plan.nextPaymentTime = block.timestamp + plan.interval;

        emit PlanActivated(planId, msg.sender);
    }

    // ---------------- SENDER ACTIVATES EMI ----------------
    function activatePlan(uint256 planId) external {
        EmiPlan storage plan = plans[planId];

        require(!plan.isActive, "Already active");
        require(plan.receiver != address(0), "Plan not found");

        // Sender MUST have approved allowance beforehand
        require(
            IERC20(plan.token).allowance(msg.sender, address(this)) >=
                plan.emiAmount,
            "Insufficient allowance"
        );

        plan.sender = msg.sender;
        plan.isActive = true;
        plan.nextPaymentTime = block.timestamp + plan.interval;

        emit PlanActivated(planId, msg.sender);
    }

    // ---------------- CHAINLINK AUTOMATION ----------------
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory) {
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

    function performUpkeep(bytes calldata data) external override nonReentrant {
        uint256 planId = abi.decode(data, (uint256));
        EmiPlan storage p = plans[planId];

        require(p.isActive, "Inactive");
        // require(p.amountPaid < p.totalAmount, "Plan already completed");
        // IERC20(p.token).transferFrom(p.sender, p.receiver, p.emiAmount);
        require(block.timestamp >= p.nextPaymentTime, "Too early");
        IERC20 token = IERC20(p.token);

        require(
            token.transferFrom(p.sender, p.receiver, p.emiAmount),
            "Transfer failed"
        );

        // bool success = token.transferFrom(p.sender, p.receiver, p.emiAmount);
        // require(success, "EMI transfer failed");
        p.amountPaid += p.emiAmount;
        if (p.amountPaid >= p.totalAmount) {
            p.isActive = false;
            emit EmiPaid(planId, p.receiver, p.emiAmount);
            emit EmiCompleted(planId);
        } else {
            p.nextPaymentTime = block.timestamp + p.interval;
            emit EmiPaid(planId, p.receiver, p.emiAmount);
        }
    }
}

// ---------------- SENDER INITIAL PAYMENT ----------------
// function receivePayment(
//     uint256 planId,
//     uint256 amount
// ) external nonReentrant {
//     EmiPlan storage plan = plans[planId];

//     require(!plan.isActive, "Plan already active");
//     require(amount >= plan.emiAmount, "Amount < EMI");
//     require(amount <= plan.totalAmount, "Amount exceeds total");

//     require(plan.receiver != address(0), "Plan does not exist");

//     IERC20 token = IERC20(plan.token);

//     require(
//         token.allowance(msg.sender, address(this)) >= amount,
//         "Approve token first"
//     );
//     require(
//         token.transferFrom(msg.sender, plan.receiver, amount),
//         "Transfer failed"
//     );

//     plan.sender = msg.sender;
//     plan.isActive = true;
//     plan.amountPaid = amount;
//     plan.nextPaymentTime = block.timestamp + plan.interval;

//     emit PlanActivated(planId, msg.sender);
//     emit EmiPaid(planId, plan.receiver, amount);
// }

//escrow model -- the moeny needs to be deposited at a time only. (sender to contract to receiver)

// import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// contract EmiAutoPay is AutomationCompatibleInterface, ReentrancyGuard {
//     struct EmiPlan {
//         address sender;
//         address receiver;
//         address token;
//         uint256 emiAmount;
//         uint256 interval;
//         uint256 totalAmount;
//         uint256 amountReleased;
//         uint256 nextPaymentTime;
//         bool active;
//     }

//     uint256 public planCounter;
//     mapping(uint256 => EmiPlan) public plans;

//     event EmiPlanCreated(uint256 planId, address receiver);
//     event Deposited(uint256 planId, address sender, uint256 amount);
//     event EmiReleased(uint256 planId, uint256 amount);
//     event PlanCompleted(uint256 planId);

//     // ---------------- RECEIVER CREATES PLAN ----------------
//     function createEmiPlan(
//         address token,
//         uint256 emiAmount,
//         uint256 interval,
//         uint256 totalAmount
//     ) external {
//         require(emiAmount > 0, "Invalid EMI");
//         require(totalAmount >= emiAmount, "Total < EMI");
//         require(interval >= 60, "Min 1 min");

//         planCounter++;

//         plans[planCounter] = EmiPlan({
//             sender: address(0),
//             receiver: msg.sender,
//             token: token,
//             emiAmount: emiAmount,
//             interval: interval,
//             totalAmount: totalAmount,
//             amountReleased: 0,
//             nextPaymentTime: 0,
//             active: false
//         });

//         emit EmiPlanCreated(planCounter, msg.sender);
//     }

//     // ---------------- SENDER DEPOSITS ONCE ----------------
//     function deposit(uint256 planId, uint256 amount) external nonReentrant {
//         EmiPlan storage p = plans[planId];
//         require(!p.active, "Already active");
//         require(amount >= p.totalAmount, "Send full amount");

//         require(
//             IERC20(p.token).transfer(p.receiver, p.emiAmount),
//             "EMI transfer failed"
//         );

//         p.sender = msg.sender;
//         p.active = true;
//         p.nextPaymentTime = block.timestamp;

//         emit Deposited(planId, msg.sender, amount);
//     }

//     // ---------------- CHAINLINK ----------------
//     function checkUpkeep(
//         bytes calldata
//     ) external view override returns (bool, bytes memory) {
//         for (uint256 i = 1; i <= planCounter; i++) {
//             EmiPlan storage p = plans[i];
//             if (
//                 p.active &&
//                 block.timestamp >= p.nextPaymentTime &&
//                 p.amountReleased < p.totalAmount
//             ) {
//                 return (true, abi.encode(i));
//             }
//         }
//         return (false, "");
//     }

//     function performUpkeep(bytes calldata data) external override nonReentrant {
//         uint256 planId = abi.decode(data, (uint256));
//         EmiPlan storage p = plans[planId];

//         require(p.receiver != address(0), "Invalid plan");
//         require(p.active, "Inactive");
//         require(block.timestamp >= p.nextPaymentTime, "Too early");

//         uint256 remaining = p.totalAmount - p.amountReleased;
//         uint256 payAmount = remaining < p.emiAmount ? remaining : p.emiAmount;

//         require(
//             IERC20(p.token).transfer(p.receiver, payAmount),
//             "EMI transfer failed"
//         );

//         p.amountReleased += payAmount;

//         if (p.amountReleased >= p.totalAmount) {
//             p.active = false;
//             emit PlanCompleted(planId);
//         } else {
//             p.nextPaymentTime = block.timestamp + p.interval;
//         }

//         emit EmiReleased(planId, payAmount);
//     }
// }

pragma solidity ^0.5.10;

interface ITRC20 {
    function transferFrom(
        address from,
        address to,
        uint value
    ) external returns (bool);
    function allowance(
        address owner,
        address spender
    ) external view returns (uint);
}

contract EmiAutoPayTRON {
    struct Plan {
        address sender;
        address receiver;
        address token;
        uint emi;
        uint interval;
        uint total;
        uint paid;
        uint nextPay;
        bool active;
    }

    uint public planCount;
    mapping(uint => Plan) public plans;

    function createPlan(
        address token,
        uint emi,
        uint interval,
        uint total
    ) external {
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
    }

    function activate(uint planId) external {
        Plan storage p = plans[planId];
        require(!p.active);
        require(ITRC20(p.token).allowance(msg.sender, address(this)) >= p.emi);

        p.sender = msg.sender;
        p.active = true;
        p.nextPay = now + p.interval;
    }

    function pay(uint planId) external {
        Plan storage p = plans[planId];
        require(p.active);
        require(now >= p.nextPay);

        ITRC20(p.token).transferFrom(p.sender, p.receiver, p.emi);

        p.paid += p.emi;
        p.nextPay = now + p.interval;

        if (p.paid >= p.total) {
            p.active = false;
        }
    }
}

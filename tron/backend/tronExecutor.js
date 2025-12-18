import { tronWeb, CONTRACT_ABI, CONTRACT_ADDRESS } from "./tronConfig.js";

let contract;

async function loadContract() {
  if (!contract) {
    contract = await tronWeb.contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  }
  return contract;
}

export async function executeEmis() {
  const c = await loadContract();
  const planCount = (await c.planCount().call()).toNumber();

  console.log("🔍 Checking TRON EMI plans:", planCount);

  for (let i = 1; i <= planCount; i++) {
    const p = await c.plans(i).call();

    if (
      p.active &&
      Number(p.paid) < Number(p.total) &&
      Date.now() / 1000 >= Number(p.nextPay)
    ) {
      try {
        console.log(`⚡ Executing EMI for plan ${i}`);

        await c.payEmi(i).send({
          feeLimit: 20_000_000,
        });

        console.log(`✅ EMI executed for plan ${i}`);
      } catch (err) {
        console.error(`❌ Plan ${i} failed`, err.message);
      }
    }
  }
}

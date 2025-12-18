import cron from "node-cron";
import { executeEmis } from "./tronExecutor.js";

console.log("🚀 TRON EMI Executor Started");

// Every 1 minute
cron.schedule("* * * * *", async () => {
  await executeEmis();
});

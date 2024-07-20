import { getApi } from "./common/apis";
import { printAssetsAndPool } from "./tasks/printAssetsAndPool";

console.log("debugpool");

const wah = await getApi("wah");

await printAssetsAndPool(wah, 20120608);
//await printAssetsAndPool(wah, 19801204);

console.log("finished");
process.exit(0);

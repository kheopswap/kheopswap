// import { createAssetAndPool } from "./tasks/createAssetAndPool";
// import { alice } from "./common/accounts";
// import { sendNativeTokens } from "./tasks/sendNativeTokens";
// import { getApi } from "./common/apis";
// import type { SS58String } from "polkadot-api";

// const relay = getApi("devrelay");
// const assetHub = getApi("devah");

// try {
//   await createAssetAndPool(
//     assetHub,
//     10001,
//     "TK1",
//     "Token 1",
//     12,
//     alice,
//     12_000_000_000_000_000_000_000n, // 12M
//     1_000_000_000_000_000n, // 1K ROC
//     1_000_000_000_000_000_000_000n // 1M tokens
//   );

//   await createAssetAndPool(
//     assetHub,
//     10002,
//     "TK2",
//     "Token 2",
//     12,
//     alice,
//     12_000_000_000_000_000_000_000n, // 12M
//     1_000_000_000_000_000n, // 1K ROC
//     1_000_000_000_000_000_000_000n // 1M tokens
//   );

//   await sendNativeTokens(
//     relay,
//     alice,
//     process.env.ADDRESS_DEV as SS58String,
//     1_000_000_000_000_000n
//   );
//   await sendNativeTokens(
//     assetHub,
//     alice,
//     process.env.ADDRESS_DEV as SS58String,
//     1_000_000_000_000_000n
//   );
// } catch (e) {
//   console.error(e);
//   console.log();
//   console.log(
//     "if you've just spawned your zombienet an error is expected, try again in few seconds"
//   );
// }

// process.exit(0);

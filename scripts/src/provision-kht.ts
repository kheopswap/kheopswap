import { Binary } from "polkadot-api";
import { parseUnits } from "viem";
import { alice, getAccount } from "./common/accounts";
import { getApi } from "./common/apis";
import { waitTransactionComplete } from "./common/waitTransactionComplete";
import { getAssetTokenLocation, getNativeTokenLocation } from "./common/xcm";
import { createAssetAndPool } from "./tasks/createAssetAndPool";
import { printAssetsAndPool } from "./tasks/printAssetsAndPool";
import { printAssetsAndPools } from "./tasks/printAssetsAndPools";
import { sendNativeTokens } from "./tasks/sendNativeTokens";

// const ah = await getApi("devah");

// await printAssetsAndPool(ah, 10001);

const assetHub = await getApi("rah");

// await printAssetsAndPool(wah, 19801204);
// const assetId = 19801204;
// const swapAmount = 996407000000n;

const mnemonic = process.env.KHEOPSWAP_MNEMONIC;
const derivationPath = process.env.KHEOPSWAP_DERIVATION_PATH;
const expectedAddress = process.env.KHEOPSWAP_ADDRESS;

if (!mnemonic || !derivationPath || !expectedAddress) {
	throw new Error("Missing env variables");
}

console.log(derivationPath);

const kheopswap = getAccount(mnemonic, derivationPath);
console.log("expected", expectedAddress);
console.log("kheopswap", kheopswap.address);

const balanceToken1 = await assetHub.query.System.Account.getValue(
	kheopswap.address,
);
console.log("balanceToken1", balanceToken1);

await createAssetAndPool(
	assetHub,
	20120608,
	"KTT",
	"Kheopswap Test Token",
	12,
	kheopswap,
	parseUnits("1000000000", 12),
	parseUnits("140", 12),
	parseUnits("100000", 12),
);
// const obsTx = await wah.tx.Assets.set_metadata({
//   id: assetId,
//   decimals: 12,
//   symbol: Binary.fromText("obs"),
//   name: Binary.fromText("obsolete do not use"),
// });

// const obsTx = await wah.tx.AssetConversion.swap_exact_tokens_for_tokens({
//   path: [getNativeTokenLocation(1), getAssetTokenLocation(assetId)],
//   amount_in: swapAmount,
//   amount_out_min: 0n,
//   keep_alive: true,
//   send_to: kheopswap.address,
// }).signSubmitAndWatch(kheopswap.signer);

// await waitTransactionComplete("swap", obsTx);

console.log("finished");
process.exit(0);

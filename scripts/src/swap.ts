import { Binary } from "polkadot-api";
import { getAccount } from "./common/accounts";
import { getApi } from "./common/apis";
import { waitTransactionComplete } from "./common/waitTransactionComplete";
import { getAssetTokenLocation, getNativeTokenLocation } from "./common/xcm";
import { printAssetsAndPool } from "./tasks/printAssetsAndPool";
import { printAssetsAndPools } from "./tasks/printAssetsAndPools";

// const ah = await getApi("devah");

// await printAssetsAndPool(ah, 10001);

const wah = await getApi("wah");

// await printAssetsAndPool(wah, 19801204);
const assetId = 19801204;
const swapAmount = 996407000000n;

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

const balanceToken1 = await wah.query.System.Account.getValue(
	kheopswap.address,
);
console.log("balanceToken1", balanceToken1);
const balanceToken2 = await wah.query.Assets.Account.getValue(
	assetId,
	kheopswap.address,
);
console.log("balanceToken2", balanceToken2);

const obsTx = await wah.tx.Assets.set_metadata({
	id: assetId,
	decimals: 12,
	symbol: Binary.fromText("obs"),
	name: Binary.fromText("obsolete do not use"),
});

// const obsTx = await wah.tx.AssetConversion.swap_exact_tokens_for_tokens({
//   path: [getNativeTokenLocation(1), getAssetTokenLocation(assetId)],
//   amount_in: swapAmount,
//   amount_out_min: 0n,
//   keep_alive: true,
//   send_to: kheopswap.address,
// }).signSubmitAndWatch(kheopswap.signer);

// await waitTransactionComplete("swap", obsTx);

// console.log("finished");

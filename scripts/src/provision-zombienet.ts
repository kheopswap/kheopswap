import { parseUnits } from "viem";
import { alice } from "./common/accounts";
import { getApi } from "./common/apis";
import { waitTransactionComplete } from "./common/waitTransactionComplete";
import { createAssetCalls } from "./tasks/createAsset";
import { createAssetAndPoolCalls } from "./tasks/createAssetAndPool";
import { sendAssetTokensCall } from "./tasks/sendAssetTokens";
import {
	sendNativeTokens,
	sendNativeTokensCall,
} from "./tasks/sendNativeTokens";

const relay = await getApi("devrelay");
const assetHub = await getApi("devah");

const provisionRelay = async () => {
	await sendNativeTokens(
		relay,
		alice,
		process.env.ADDRESS_DEV!,
		parseUnits("1000", 12),
	);
};

const provisionAssetHub = async () => {
	const callsToken1 = await createAssetAndPoolCalls(
		assetHub,
		10001,
		"TK1",
		"Token 1",
		12,
		alice,
		parseUnits("12000000", 12), // 12M
		parseUnits("1000", 12), // 1K ROC
		parseUnits("1000000", 12), // 1M tokens
	);

	const callsToken2 = await createAssetAndPoolCalls(
		assetHub,
		10002,
		"TK2",
		"Token 2",
		12,
		alice,
		parseUnits("12000000", 12), // 12M
		parseUnits("1000", 12), // 1K ROC
		parseUnits("1000000", 12), // 1M tokens
	);

	const callsToken3 = await createAssetCalls(
		assetHub,
		10003,
		"TK3",
		"Token 3",
		12,
		alice,
		parseUnits("12000000", 12), // 12M
		true,
	);

	const callsToken4 = await createAssetCalls(
		assetHub,
		10004,
		"TK4",
		"Token 4",
		12,
		alice,
		parseUnits("12000000", 12), // 12M
		false,
	);

	const callTokenKTT = await createAssetAndPoolCalls(
		assetHub,
		20120608,
		"KTT",
		"Kheopswap Test Token",
		12,
		alice,
		parseUnits("1000000000", 12),
		parseUnits("1000", 12),
		parseUnits("1000000", 12),
	);

	const callsSendNativeTokens1 = sendNativeTokensCall(
		assetHub,
		alice,
		process.env.ADDRESS_DEV!,
		parseUnits("1000", 12),
	);

	const callsSendAssetsTokens1 = sendAssetTokensCall(
		assetHub,
		alice,
		process.env.ADDRESS_DEV!,
		10003,
		parseUnits("1000000", 12),
	);

	const callsSendAssetsTokens2 = sendAssetTokensCall(
		assetHub,
		alice,
		process.env.ADDRESS_DEV!,
		10004,
		parseUnits("1000000", 12),
	);

	const obsAssetHubBatchTx = await assetHub.tx.Utility.batch_all({
		calls: [
			...(callsToken1 ?? []),
			...(callsToken2 ?? []),
			...(callsToken3 ?? []),
			...(callsToken4 ?? []),
			...(callTokenKTT ?? []),
			callsSendNativeTokens1.decodedCall,
			callsSendAssetsTokens1.decodedCall,
			callsSendAssetsTokens2.decodedCall,
		],
	}).signSubmitAndWatch(alice.signer);

	await waitTransactionComplete("Create asset and pool", obsAssetHubBatchTx);
};

try {
	await Promise.all([provisionAssetHub(), provisionRelay()]);
} catch (e) {
	console.error(e);
	console.log();
	console.log(
		"if you've just spawned your zombienet an error is expected, try again in few seconds",
	);
}

console.log("finished");
process.exit(0);

import { formatUnits, parseUnits } from "viem";
import { getAccount } from "./common/accounts";
import { getApi } from "./common/apis";
import {
	MultiAddress,
	XcmV3Junctions,
	XcmV3Junction,
} from "@polkadot-api/descriptors";
import { safeStringify } from "./util/safeStringify";
import type { TxFinalizedPayload } from "polkadot-api";
import { dumpData } from "./util/dumpData";

const mnemonic = process.env.MNEMONIC;
const senderDerivationPath = process.env.DERIVATION_PATH ?? "";
const recipientDerivationPath = "//Chupacabra";

if (!mnemonic) throw new Error("Missing env variable");

const sender = getAccount(mnemonic, senderDerivationPath);
const recipient = getAccount(mnemonic, recipientDerivationPath);

const api = await getApi("rah");

const existentialDeposit = await api.constants.Balances.ExistentialDeposit();
console.log("existentialDeposit", existentialDeposit.toString());

console.log("sender", sender.address);
console.log("recipient", recipient.address);

const [senderBalance, recipientBalance] =
	await api.query.System.Account.getValues([
		[sender.address],
		[recipient.address],
	]);

console.log("sender has %s WND", formatUnits(senderBalance.data.free, 12));
console.log(
	"recipient has %s ROC",
	formatUnits(recipientBalance.data.free, 12),
);

export const getErrorMessageFromTxEvents = (tx: TxFinalizedPayload) => {
	try {
		const errorEvent = tx.events.find(
			(e) => e.type === "System" && e.value.type === "ExtrinsicFailed",
		);

		const dispatchError = errorEvent?.value.value.dispatch_error;
		if (dispatchError && dispatchError.type && dispatchError.value?.type)
			return `${dispatchError.type}: ${dispatchError.value.type}`;

		// const moduleError =
		//   dispatchError &&
		//   dispatchError.type === "Module" &&
		//   dispatchError.value.error;
		// if (moduleError && typeof moduleError?.asText === "function")
		//   return `Module: ${moduleError?.asText()}`;
	} catch (err) {
		console.error("Failed to parse error", { err, tx });
	}

	return "Unknown error";
};

const printResult = (tx: TxFinalizedPayload) => {
	console.log("ok", tx.ok);

	for (const event of tx.events.filter(
		(e) => e.type === "System" && e.value.type === "ExtrinsicFailed",
	)) {
		console.log(event.type);
		console.log(safeStringify(event.value));
	}
	if (!tx.ok) {
		const errMsg = getErrorMessageFromTxEvents(tx);
		console.log("parsed error : ", errMsg);
	}
};

try {
	//   console.log("send half of the existential deposit to the recipient...");
	//   const tx1 = await api.tx.Balances.transfer_keep_alive({
	//     dest: MultiAddress.Id(recipient.address),
	//     value: existentialDeposit / 2n,
	//   }).signAndSubmit(sender.signer, { at: "best" });

	//   printResult(tx1);

	console.log("swap the ED to KHT and send it to the recipient...");
	const tx2 = await api.tx.AssetConversion.swap_exact_tokens_for_tokens({
		amount_in: 1000000000000n,
		amount_out_min: 0n,
		keep_alive: true,
		path: [
			{
				parents: 1,
				interior: XcmV3Junctions.Here(),
			},
			{
				parents: 0,
				interior: XcmV3Junctions.X2([
					XcmV3Junction.PalletInstance(50),
					XcmV3Junction.GeneralIndex(20120608n),
				]),
			},
		],
		send_to: recipient.address,
	}).signAndSubmit(sender.signer, { at: "best" });

	dumpData("tx2.json", tx2);

	printResult(tx2);
} catch (err) {
	console.error(err);
}

process.exit(0);
//api.tx.Balances.transfer_keep_alive(recipient.address, parseUnits()).signAndSend(sender.signer, (resul

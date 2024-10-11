import { parseUnits } from "viem";
import { getAccount } from "./common/accounts";
import { getApi } from "./common/apis";
import { createAssetAndPool } from "./tasks/createAssetAndPool";

const assetHub = await getApi("wah");

const mnemonic = process.env.KHEOPSWAP_MNEMONIC;
const derivationPath = process.env.KHEOPSWAP_DERIVATION_PATH;
const expectedAddress = process.env.KHEOPSWAP_ADDRESS;

if (!mnemonic || !derivationPath || !expectedAddress) {
	throw new Error("Missing env variables");
}

console.info(derivationPath);

const kheopswap = getAccount(mnemonic, derivationPath);
console.info("expected", expectedAddress);
console.info("kheopswap", kheopswap.address);

const balanceToken1 = await assetHub.query.System.Account.getValue(
	kheopswap.address,
);
console.info("balanceToken1", balanceToken1);

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

console.info("finished");
process.exit(0);

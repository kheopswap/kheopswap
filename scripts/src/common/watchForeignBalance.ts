import type { SS58String } from "polkadot-api";
import { formatUnits } from "viem";
import type { Api, AssetHubChainId } from "./apis";
import type { XcmV3Multilocation } from "./xcm";

export const watchForeignBalance = (
	api: Api<AssetHubChainId>,
	address: SS58String,
	multiLocation: XcmV3Multilocation,
	label: string,

	symbol: string,
	decimals: number,
) => {
	let value: bigint | null = null;
	let resolved = false;

	return new Promise<void>((resolve, reject) => {
		api.query.ForeignAssets.Account.watchValue(
			multiLocation,
			address,
			"best",
		).subscribe({
			next: (next) => {
				const diff =
					value === null || !next
						? null
						: next.balance > value
							? { diff: next.balance - value, sign: "+" }
							: { diff: value - next.balance, sign: "-" };
				value = next?.balance ?? 0n;

				console.log(
					`[${label}]`,
					formatUnits(next?.balance ?? 0n, decimals),
					symbol,
					diff ? `(${diff.sign}${formatUnits(diff.diff, decimals)})` : "",
				);

				if (!resolved) resolve();
			},
			error: reject,
		});
	});
};

import type { Api } from "../common/apis";

export const printAssetsAndPools = async (api: Api<"devah" | "wah">) => {
	console.log("Assets");
	const assets = await api.query.Assets.Asset.getEntries({ at: "best" });
	const assetsMetadata = await api.query.Assets.Metadata.getEntries({
		at: "best",
	});

	//   console.log(assets);
	//   console.log(assetsMetadata);
	console.log();

	const assetIds = assets.map((a) => a.keyArgs[0]);

	for (const assetId of assetIds) {
		const asset = assets.find((a) => a.keyArgs[0] === assetId)?.value;
		const metadata = assetsMetadata.find(
			(a) => a.keyArgs[0] === assetId,
		)?.value;

		console.log("Asset", assetId);
		if (metadata) {
			console.log(
				"%s - %s - %d decimals - frozen:%s",
				metadata.symbol.asText(),
				metadata.name.asText(),
				metadata.decimals,
				metadata.is_frozen,
			);
		}
		if (asset) {
			console.log("Admin", asset.admin);
			console.log("Supply: %s - Account:%s", asset.supply, asset.accounts);
			console.log("Status:", asset.status.type);
			console.log("Min balance:", asset.min_balance);
			console.log(
				"Sufficient: %s (%s)",
				asset.is_sufficient,
				asset.sufficients,
			);
		}
		console.log();
	}
};

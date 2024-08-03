import type { Api } from "../common/apis";

export const printAssetsAndPools = async (api: Api<"devah" | "wah">) => {
	console.info("Assets");
	const assets = await api.query.Assets.Asset.getEntries({ at: "best" });
	const assetsMetadata = await api.query.Assets.Metadata.getEntries({
		at: "best",
	});

	//   console.info(assets);
	//   console.info(assetsMetadata);
	console.info();

	const assetIds = assets.map((a) => a.keyArgs[0]);

	for (const assetId of assetIds) {
		const asset = assets.find((a) => a.keyArgs[0] === assetId)?.value;
		const metadata = assetsMetadata.find(
			(a) => a.keyArgs[0] === assetId,
		)?.value;

		console.info("Asset", assetId);
		if (metadata) {
			console.info(
				"%s - %s - %d decimals - frozen:%s",
				metadata.symbol.asText(),
				metadata.name.asText(),
				metadata.decimals,
				metadata.is_frozen,
			);
		}
		if (asset) {
			console.info("Admin", asset.admin);
			console.info("Supply: %s - Account:%s", asset.supply, asset.accounts);
			console.info("Status:", asset.status.type);
			console.info("Min balance:", asset.min_balance);
			console.info(
				"Sufficient: %s (%s)",
				asset.is_sufficient,
				asset.sufficients,
			);
		}
		console.info();
	}
};

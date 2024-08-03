import { formatUnits } from "viem";
import type { Api } from "../common/apis";
import { getAssetTokenLocation, getNativeTokenLocation } from "../common/xcm";

export const printAssetsAndPool = async (
	api: Api<"devah" | "wah">,
	assetId: number,
) => {
	console.info("Searching for asset", assetId);
	const asset = await api.query.Assets.Asset.getValue(assetId);
	const metadata = await api.query.Assets.Metadata.getValue(assetId);

	if (asset && metadata && metadata.deposit) {
		if (metadata.deposit) {
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

		const pool = await api.query.AssetConversion.Pools.getValue([
			getNativeTokenLocation(1),
			getAssetTokenLocation(assetId),
		]);
		if (pool !== undefined) {
			const poolAssetMetadata =
				await api.query.PoolAssets.Metadata.getValue(pool);
			console.info(
				poolAssetMetadata,
				`deposit:${metadata.deposit} is_frozen:${metadata.is_frozen}`,
			);

			const poolAsset = await api.query.PoolAssets.Asset.getValue(pool);
			if (poolAsset) {
				console.info(poolAsset);
				console.info("Pool owner: %s", poolAsset.owner);
				console.info("Pool supply: %s", poolAsset.supply);
				console.info("Pool status: %s", poolAsset.status.type);
				console.info("Pool accounts: %s", poolAsset.accounts);
				console.info(
					"Pool is sufficient: %s (%s)",
					poolAsset.is_sufficient,
					poolAsset.sufficients,
				);

				const balance1 = await api.query.System.Account.getValue(
					poolAsset.owner,
				);
				const balance2 = await api.query.Assets.Account.getValue(
					assetId,
					poolAsset.owner,
				);
				if (balance1)
					console.info(
						"reserve 1",
						balance1,
						formatUnits(balance1.data.free, 12),
					);
				if (balance2)
					console.info(
						"reserve 2",
						balance2,
						formatUnits(balance2.balance, metadata.decimals),
					);

				const reserves = await api.apis.AssetConversionApi.get_reserves(
					getNativeTokenLocation(1),
					getAssetTokenLocation(assetId),
				);
				console.info("reserves from api", reserves);
				const reserves2 = await api.apis.AssetConversionApi.get_reserves(
					getNativeTokenLocation(0),
					getAssetTokenLocation(assetId),
				);
				console.info("reserves from api", reserves2);

				const quote =
					await api.apis.AssetConversionApi.quote_price_exact_tokens_for_tokens(
						getNativeTokenLocation(1),
						getAssetTokenLocation(assetId),
						27034449n,
						true,
					);
				console.info("quote", quote);
			} else console.info("pool asset not found");
		} else console.info("pool not found");
	} else console.info("Asset not found");

	console.info();
};

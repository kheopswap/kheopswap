import { type Api } from "../common/getApi";
import { getAssetTokenLocation, getNativeTokenLocation } from "../common/xcm";
import { formatUnits } from "viem";

export const printAssetsAndPool = async (
  api: Api<"devah" | "wah">,
  assetId: number
) => {
  console.log("Searching for asset", assetId);
  const asset = await api.query.Assets.Asset.getValue(assetId);
  const metadata = await api.query.Assets.Metadata.getValue(assetId);

  if (asset && metadata && metadata.deposit) {
    if (metadata.deposit) {
      console.log(
        "%s - %s - %d decimals - frozen:%s",
        metadata.symbol.asText(),
        metadata.name.asText(),
        metadata.decimals,
        metadata.is_frozen
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
        asset.sufficients
      );
    }

    const pool = await api.query.AssetConversion.Pools.getValue([
      getNativeTokenLocation(1),
      getAssetTokenLocation(assetId),
    ]);
    if (pool !== undefined) {
      const poolAssetMetadata =
        await api.query.PoolAssets.Metadata.getValue(pool);
      console.log(
        poolAssetMetadata,
        `deposit:${metadata.deposit} is_frozen:${metadata.is_frozen}`
      );

      const poolAsset = await api.query.PoolAssets.Asset.getValue(pool);
      if (poolAsset) {
        console.log(poolAsset);
        console.log("Pool owner: %s", poolAsset.owner);
        console.log("Pool supply: %s", poolAsset.supply);
        console.log("Pool status: %s", poolAsset.status.type);
        console.log("Pool accounts: %s", poolAsset.accounts);
        console.log(
          "Pool is sufficient: %s (%s)",
          poolAsset.is_sufficient,
          poolAsset.sufficients
        );

        const balance1 = await api.query.System.Account.getValue(
          poolAsset.owner
        );
        const balance2 = await api.query.Assets.Account.getValue(
          assetId,
          poolAsset.owner
        );
        if (balance1)
          console.log(
            "reserve 1",
            balance1,
            formatUnits(balance1.data.free, 12)
          );
        if (balance2)
          console.log(
            "reserve 2",
            balance2,
            formatUnits(balance2.balance, metadata.decimals)
          );

        const reserves = await api.apis.AssetConversionApi.get_reserves(
          getNativeTokenLocation(1),
          getAssetTokenLocation(assetId)
        );
        console.log("reserves from api", reserves);
        const reserves2 = await api.apis.AssetConversionApi.get_reserves(
          getNativeTokenLocation(0),
          getAssetTokenLocation(assetId)
        );
        console.log("reserves from api", reserves2);

        const quote =
          await api.apis.AssetConversionApi.quote_price_exact_tokens_for_tokens(
            getNativeTokenLocation(1),
            getAssetTokenLocation(assetId),
            27034449n,
            true
          );
        console.log("quote", quote);
      } else console.log("pool asset not found");
    } else console.log("pool not found");
  } else console.log("Asset not found");

  console.log();
};

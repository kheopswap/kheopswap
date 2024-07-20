import { getApi } from "./common/apis";
import { dumpData } from "./util/dumpData";

/**
 * rah
 */
const rah = await getApi("rah");

dumpData(
  "rah/Assets/Asset.json",
  await rah.query.Assets.Asset.getEntries({ at: "best" })
);
dumpData(
  "rah/Assets/Metadata.json",
  await rah.query.Assets.Metadata.getEntries({ at: "best" })
);
dumpData(
  "rah/AssetConvertion/Pools.json",
  await rah.query.AssetConversion.Pools.getEntries({ at: "best" })
);
dumpData(
  "rah/PoolAssets/Asset.json",
  await rah.query.PoolAssets.Asset.getEntries({ at: "best" })
);
dumpData(
  "rah/PoolAssets/Metadata.json",
  await rah.query.PoolAssets.Metadata.getEntries({ at: "best" })
);
dumpData(
  "rah/ForeignAssets/Asset.json",
  await rah.query.ForeignAssets.Asset.getEntries({ at: "best" })
);
dumpData(
  "rah/ForeignAssets/Metadata.json",
  await rah.query.ForeignAssets.Metadata.getEntries({ at: "best" })
);

console.log("ok!");
process.exit(0);

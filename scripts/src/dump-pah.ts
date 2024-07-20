import { getApi } from "./common/getApi";
import { dumpData } from "./util/dumpData";

/**
 * pah
 */
const pah = await getApi("pah");

dumpData(
  "pah/Assets/Asset.json",
  await pah.query.Assets.Asset.getEntries({ at: "best" })
);
dumpData(
  "pah/Assets/Metadata.json",
  await pah.query.Assets.Metadata.getEntries({ at: "best" })
);
dumpData(
  "pah/AssetConvertion/Pools.json",
  await pah.query.AssetConversion.Pools.getEntries({ at: "best" })
);
dumpData(
  "pah/PoolAssets/Asset.json",
  await pah.query.PoolAssets.Asset.getEntries({ at: "best" })
);
dumpData(
  "pah/PoolAssets/Metadata.json",
  await pah.query.PoolAssets.Metadata.getEntries({ at: "best" })
);
dumpData(
  "pah/ForeignAssets/Asset.json",
  await pah.query.ForeignAssets.Asset.getEntries({ at: "best" })
);
dumpData(
  "pah/ForeignAssets/Metadata.json",
  await pah.query.ForeignAssets.Metadata.getEntries({ at: "best" })
);

console.log("ok!");
process.exit(0);

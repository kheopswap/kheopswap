import { getApi } from "./common/getApi";
import { XcmV4Instruction } from "@polkadot-api/descriptors";

const relay = await getApi("devrelay");
const assetHub = await getApi("devah");

// relay.tx.XcmPallet.execute({
//   max_weight: { ref_time: 100n, proof_size: 100n },
//   message: {
//     type: "V4",
//     value: [XcmV4Instruction.WithdrawAsset(10001)],
//   },
// });

// relay.event.AssetRate.AssetRateUpdated.watch((value) => {
//   value.asset_kind.type === "V3" && value.asset_kind.value;
// });

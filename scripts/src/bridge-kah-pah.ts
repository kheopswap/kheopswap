import { AccountId, Binary } from "polkadot-api";
import { getDevEnvAccount } from "./common/accounts";
import { getApi } from "./common/getApi";
import { watchForeignBalance } from "./common/watchForeignBalance";
import { watchNativeBalance } from "./common/watchNativeBalance";
import type { XcmV3Multilocation } from "./common/xcm";

import {
  XcmV3Junction,
  XcmV3JunctionNetworkId,
  XcmV3Junctions,
  XcmV3MultiassetFungibility,
  XcmV3WeightLimit,
  XcmVersionedAssets,
  XcmVersionedLocation,
} from "@polkadot-api/descriptors";
import { waitTransactionComplete } from "./common/waitTransactionComplete";

const devAccount = getDevEnvAccount();

// const LOCATION_WND_FROM_RAH: XcmV3Multilocation = {
//   parents: 2,
//   interior: {
//     type: "X1",
//     value: {
//       type: "GlobalConsensus",
//       value: {
//         type: "Westend",
//       },
//     },
//   },
// };

const NATIVE_FROM_PARA = {
  parents: 1,
  interior: XcmV3Junctions.Here(),
};

const LOCAL = {
  parents: 0,
  interior: XcmV3Junctions.Here(),
};

const PAH_FROM_KAH: XcmV3Multilocation = {
  parents: 2,
  interior: XcmV3Junctions.X2([
    XcmV3Junction.GlobalConsensus(XcmV3JunctionNetworkId.Polkadot()),
    XcmV3Junction.Parachain(1000),
  ]),
};

// const RAH_FROM_WESTEND: XcmV3Multilocation = {
//   parents: 2,
//   interior: XcmV3Junctions.X2([
//     XcmV3Junction.GlobalConsensus(XcmV3JunctionNetworkId.Rococo()),
//     XcmV3Junction.Parachain(1000),
//   ]),
// };

// const WAH_FROM_RAH: XcmV3Multilocation = {
//   parents: 2,
//   interior: XcmV3Junctions.X2([
//     XcmV3Junction.GlobalConsensus(XcmV3JunctionNetworkId.Westend()),
//     XcmV3Junction.Parachain(1000),
//   ]),
// };

const KSM_FROM_PAH: XcmV3Multilocation = {
  parents: 2,
  interior: XcmV3Junctions.X1(
    XcmV3Junction.GlobalConsensus(XcmV3JunctionNetworkId.Kusama())
  ),
};
const DOT_FROM_KAH: XcmV3Multilocation = {
  parents: 2,
  interior: XcmV3Junctions.X1(
    XcmV3Junction.GlobalConsensus(XcmV3JunctionNetworkId.Polkadot())
  ),
};

// const westend = await getApi("westend");
// const rococo = await getApi("rococo");
const kah = await getApi("kah");
const pah = await getApi("pah");

await Promise.all([
  // westend.runtime.latest(),
  // rococo.runtime.latest(),
  kah.runtime.latest(),
  pah.runtime.latest(),
]);
// console.log("smoldot ready");

// if (Date.now()) process.exit(0);

await Promise.all([
  // watchNativeBalance(westend, devAccount.address, "WND Native", "WND", 12),
  // watchNativeBalance(rococo, devAccount.address, "ROC Native", "ROC", 12),
  watchNativeBalance(kah, devAccount.address, "KAH Native", "WND", 12),
  watchNativeBalance(pah, devAccount.address, "PAH Native", "DOT", 10),
]);

await Promise.all([
  watchForeignBalance(
    pah,
    devAccount.address,
    KSM_FROM_PAH,
    "KSM on PAH",
    "KSM",
    12
  ),
  watchForeignBalance(
    kah,
    devAccount.address,
    DOT_FROM_KAH,
    "DOT on WAH",
    "DOT",
    10
  ),
]);
// // watchForeignBalance(
// //   rah,
// //   devAccount.address,
// //   { parents: 2 },
// //   "RAH Foreign WAH",
// //   "WND",
// //   12
// // );

const { nonce } = await kah.query.System.Account.getValue(devAccount.address);
console.log("nonce on westend", nonce);
const obsXferWahToRah = kah.tx.PolkadotXcm.transfer_assets({
  dest: XcmVersionedLocation.V4(PAH_FROM_KAH),
  assets: XcmVersionedAssets.V4([
    {
      id: { parents: 1, interior: XcmV3Junctions.Here() },
      fun: XcmV3MultiassetFungibility.Fungible(1_000_000_000n), // { Fungible: 100_000_000n },
    },
  ]),
  beneficiary: XcmVersionedLocation.V4({
    parents: 0,
    interior: XcmV3Junctions.X1(
      XcmV3Junction.AccountId32({
        id: Binary.fromBytes(AccountId().enc(devAccount.address)),
        network: undefined,
      })
    ),
  }),
  fee_asset_item: 0,
  weight_limit: XcmV3WeightLimit.Unlimited(),
}).signSubmitAndWatch(devAccount.signer, {
  mortality: { mortal: true, period: 64 },
  nonce,
});

await waitTransactionComplete("Transfer WAH to RAH", obsXferWahToRah);

// const obsXferWahToRah = wah.tx.PolkadotXcm.reserve_transfer_assets({
//   dest: {
//     type: "V4",
//     value: {
//       parents: 2,
//       interior: {
//         type: "X1",
//         value: {
//           type: "GlobalConsensus",
//           value: {
//             type: "Rococo",
//             value: undefined,
//           },
//         },
//       },
//     },
//   },
//   assets: XcmVersionedAssets.V4([
//     {
//       id: { parents: 1, interior: { type: "Here", value: undefined } },
//       fun: XcmV3MultiassetFungibility.Fungible(1_000_000_000n), // { Fungible: 100_000_000n },
//     },
//   ]),
//   fee_asset_item: 0,
//   beneficiary: XcmVersionedLocation.V4({
//     parents: 0,
//     interior: XcmV3Junctions.Here(),
//   }),
//   // weight_limit: XcmV3WeightLimit.Unlimited(),
// }).signSubmitAndWatch(devAccount.signer, {
//   mortality: { mortal: true, period: 64 },
// });

//await waitTransactionComplete("Transfer WAH to RAH", obsXferWahToRah);

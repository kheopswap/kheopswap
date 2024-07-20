import { MultiAddress } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { type Account } from "../common/accounts";
import { type Api } from "../common/getApi";
import { waitTransactionComplete } from "../common/waitTransactionComplete";

export const sendAssetTokensCall = (
  api: Api<"devah" | "wah">,
  from: Account,
  to: SS58String,
  assetId: number,
  amount: bigint
) => {
  console.log("sendAssetTokens");

  return api.tx.Assets.transfer_keep_alive({
    id: assetId,
    target: MultiAddress.Id(to),
    amount,
  });
};

export const sendAssetTokens = async (
  api: Api<"devah" | "wah">,
  from: Account,
  to: SS58String,
  assetId: number,
  amount: bigint
) => {
  console.log("sendAssetTokens");

  const call = await sendAssetTokensCall(api, from, to, assetId, amount);

  const obsTx = await call.signSubmitAndWatch(from.signer);

  await waitTransactionComplete("sendAssetTokens", obsTx);
};

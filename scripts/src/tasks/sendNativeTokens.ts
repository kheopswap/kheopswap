import { MultiAddress } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import { type Account } from "../common/accounts";
import { type Api } from "../common/apis";
import { waitTransactionComplete } from "../common/waitTransactionComplete";

export const sendNativeTokensCall = (
  api: Api<"devah" | "devrelay" | "wah">,
  from: Account,
  to: SS58String,
  amount: bigint
) => {
  return api.tx.Balances.transfer_keep_alive({
    dest: MultiAddress.Id(to),
    value: amount,
  });
};

export const sendNativeTokens = async (
  api: Api<"devah" | "devrelay" | "wah">,
  from: Account,
  to: SS58String,
  amount: bigint
) => {
  console.log("sendNativeTokens");

  const call = sendNativeTokensCall(api, from, to, amount);

  const obsTx = call.signSubmitAndWatch(from.signer);

  await waitTransactionComplete("sendNativeTokens", obsTx);
};

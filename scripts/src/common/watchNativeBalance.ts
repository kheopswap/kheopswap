import type { SS58String } from "polkadot-api";
import { formatUnits } from "viem";
import type { Api, ChainId } from "./apis";

export const watchNativeBalance = (
  api: Api<ChainId>,
  address: SS58String,
  label: string,
  symbol: string,
  decimals: number
) => {
  let value: bigint | null = null;
  let resolved = false;

  return new Promise<void>((resolve, reject) => {
    api.query.System.Account.watchValue(address, "best").subscribe({
      next: (next) => {
        const diff =
          value === null || !next
            ? null
            : next.data.free > value
              ? { diff: next.data.free - value, sign: "+" }
              : { diff: value - next.data.free, sign: "-" };
        value = next.data.free ?? 0n;
        console.log(
          `[${label}]`,
          formatUnits(next.data.free, decimals),
          symbol,
          diff ? `(${diff.sign}${formatUnits(diff.diff, decimals)})` : ""
        );

        if (!resolved) resolve();
      },
      error: reject,
    });
  });
};

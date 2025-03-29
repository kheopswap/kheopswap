import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	loadableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { Observable } from "rxjs";
import { getChainAccount$ } from "./getChainAccount";

export const [useIsAccountSufficient, getIsAccountSufficient$] = bind(
	(chainId: ChainId, address: string) =>
		new Observable<LoadableState<boolean>>((subscriber) => {
			subscriber.next(loadableLoading());

			return getChainAccount$(chainId, address).subscribe(
				async (accountState) => {
					try {
						subscriber.next(loadableData(!!accountState.data?.sufficients));
					} catch (cause) {
						subscriber.next(
							loadableError(
								new Error("Failed to check account sufficiency", { cause }),
							),
						);
					}
				},
			);
		}),
);

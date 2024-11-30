import type { ChainId } from "@kheopswap/registry";
import {
	type LoadableObsState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { Observable } from "rxjs";
import { getChainAccount$ } from "./getChainAccount";

export const [useIsAccountSufficient, getIsAccountSufficient$] = bind(
	(chainId: ChainId, address: string) =>
		new Observable<LoadableObsState<boolean>>((subscriber) => {
			subscriber.next(loadableStateLoading());

			return getChainAccount$(chainId, address).subscribe(
				async (accountState) => {
					try {
						subscriber.next(
							loadableStateData(!!accountState.data?.sufficients),
						);
					} catch (cause) {
						subscriber.next(
							loadableStateError(
								new Error("Failed to check account sufficiency", { cause }),
							),
						);
					}
				},
			);
		}),
);

import type { ChainId } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";
import { useEffect, useState } from "react";
import { useApi } from "./useApi";

type UseNonceProps = {
	account: SS58String | null | undefined;
	chainId: ChainId | null | undefined;
};

// Returns nonce at best block, as PAPI uses the finalized block as reference for it
export const useNonce = ({ account, chainId }: UseNonceProps) => {
	const { data: api } = useApi({ chainId });

	const [state, setState] = useState<{
		data: number | undefined;
		isLoading: boolean;
		error: unknown;
	}>({ data: undefined, isLoading: false, error: null });

	useEffect(() => {
		if (!account || !chainId || !api) {
			setState({ data: undefined, isLoading: false, error: null });
			return;
		}

		setState({ data: undefined, isLoading: true, error: null });

		const sub = api.query.System.Account.watchValue(account, "best").subscribe({
			next: (accountInfo) => {
				setState({
					data: accountInfo.nonce,
					isLoading: false,
					error: null,
				});
			},
			error: (error) => {
				setState({ data: undefined, isLoading: false, error });
			},
		});

		return () => {
			sub.unsubscribe();
		};
	}, [account, api, chainId]);

	return state;
};

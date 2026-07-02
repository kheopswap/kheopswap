import { useMemo } from "react";
import { useObservable } from "react-rx";
import { catchError, map, of } from "rxjs";
import { type Api, getApi$ } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";

type UseApiProps<Id extends ChainId> = { chainId: Id | null | undefined };

type UseApiResult<Id extends ChainId> = {
	data: Api<Id> | null;
	isLoading: boolean;
	error: unknown;
};

export const useApi = <Id extends ChainId>({
	chainId,
}: UseApiProps<Id>): UseApiResult<Id> => {
	const api$ = useMemo(
		() =>
			chainId
				? getApi$<Id>(chainId).pipe(
						map(
							(api): UseApiResult<Id> => ({
								data: api,
								isLoading: false,
								error: null,
							}),
						),
						catchError((error) =>
							of<UseApiResult<Id>>({ data: null, isLoading: false, error }),
						),
					)
				: of<UseApiResult<Id>>({ data: null, isLoading: false, error: null }),
		[chainId],
	);

	const defaultValue = useMemo(
		() =>
			({
				data: null,
				isLoading: !!chainId,
				error: null,
			}) as UseApiResult<Id>,
		[chainId],
	);

	return useObservable(api$, defaultValue);
};

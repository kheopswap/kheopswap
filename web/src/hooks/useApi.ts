import { bind } from "@react-rxjs/core";
import { catchError, map, of } from "rxjs";
import { type Api, getApi$ } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";

type UseApiProps<Id extends ChainId> = { chainId: Id | null | undefined };

type UseApiResult<Id extends ChainId> = {
	data: Api<Id> | null;
	isLoading: boolean;
	error: unknown;
};

const [useApiByChainId] = bind(
	(chainId: ChainId | null) =>
		chainId
			? getApi$(chainId).pipe(
					map(
						(api): UseApiResult<ChainId> => ({
							data: api,
							isLoading: false,
							error: null,
						}),
					),
					catchError((error) =>
						of<UseApiResult<ChainId>>({ data: null, isLoading: false, error }),
					),
				)
			: of<UseApiResult<ChainId>>({
					data: null,
					isLoading: false,
					error: null,
				}),
	(chainId): UseApiResult<ChainId> => ({
		data: null,
		isLoading: !!chainId,
		error: null,
	}),
);

export const useApi = <Id extends ChainId>({
	chainId,
}: UseApiProps<Id>): UseApiResult<Id> =>
	useApiByChainId(chainId ?? null) as UseApiResult<Id>;

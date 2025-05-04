import {
	type Api,
	getApiLoadable$,
	isApiAssetHub,
	isApiBifrostPolkadot,
	isApiHydration,
	isApiMoonbeam,
	isApiMythos,
	isApiRelay,
} from "@kheopswap/papi";
import { type ChainId, MultiAddress, type Token } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	loadableLoading,
	logger,
} from "@kheopswap/utils";
import { type Observable, catchError, map, of } from "rxjs";
import type { AnyTransaction } from "src/types";
import type { OperationInputs } from "../operationInputs";

export const getTransferTransaction$ = (
	inputs: OperationInputs,
): Observable<LoadableState<AnyTransaction | null>> => {
	if (inputs.type !== "transfer") of(loadableData(null)); //throw new Error("Invalid operation type");
	logger.debug("getTransferTransaction$", { inputs });

	if (
		!inputs.account ||
		!inputs.tokenIn?.token ||
		inputs.tokenIn.token.id !== inputs.tokenOut?.token?.id ||
		!inputs.recipient ||
		!inputs.plancksIn
	)
		return of(loadableData(null));

	return getTransferTxCall$(
		inputs.tokenIn.token,
		inputs.plancksIn,
		inputs.recipient,
	);
};

export const getTransferTxCall$ = (
	token: Token,
	plancks: bigint,
	dest: string,
): Observable<LoadableState<AnyTransaction>> => {
	return getApiLoadable$(token.chainId).pipe(
		map(({ data: api, error, isLoading }) => {
			if (isLoading) return loadableLoading<AnyTransaction>();
			if (error) return loadableError<AnyTransaction>(error);
			if (!api)
				return loadableError<AnyTransaction>(
					new Error(`No api found for chain${token.chainId}`),
				);

			return loadableData(getTransferTxCall(api, token, plancks, dest));
		}),
		catchError((error) => of(loadableError<AnyTransaction>(error))),
	);
};

export const getTransferTxCall = (
	api: Api<ChainId>,
	token: Token,
	plancks: bigint,
	dest: string,
): AnyTransaction => {
	switch (token.type) {
		case "asset": {
			if (!isApiAssetHub(api))
				throw new Error(`Chain ${api.chainId} does not have the Assets pallet`);

			return api.tx.Assets.transfer({
				id: token.assetId,
				target: MultiAddress.Id(dest),
				amount: plancks,
			});
		}
		case "native": {
			if (isApiHydration(api))
				return api.tx.Balances.transfer_keep_alive({
					dest,
					value: plancks,
				});

			if (isApiRelay(api) || isApiAssetHub(api) || isApiBifrostPolkadot(api))
				return api.tx.Balances.transfer_keep_alive({
					dest: MultiAddress.Id(dest),
					value: plancks,
				});

			if (isApiMoonbeam(api) || isApiMythos(api))
				return api.tx.Balances.transfer_keep_alive({
					dest,
					value: plancks,
				});

			throw new Error("Unknown chain type");
		}
		case "foreign-asset": {
			if (!isApiAssetHub(api))
				throw new Error(
					`Chain ${api.chainId} does not have the ForeignAssets pallet`,
				);

			return api.tx.ForeignAssets.transfer({
				id: token.location,
				amount: plancks,
				target: MultiAddress.Id(dest),
			});
		}
		case "hydration-asset": {
			if (!isApiHydration(api))
				throw new Error(
					`Chain ${api.chainId} does not have the ForeignAssets pallet`,
				);

			return api.tx.Tokens.transfer({
				currency_id: token.assetId,
				amount: plancks,
				dest,
			});
		}
		case "bifrost-asset": {
			if (!isApiBifrostPolkadot(api))
				throw new Error(`Chain ${api.chainId} does not have the Tokens pallet`);

			return api.tx.Tokens.transfer({
				currency_id: token.currencyId,
				amount: plancks,
				dest: MultiAddress.Id(dest),
			});
		}
		default:
			throw new Error(`Unsupported token type ${token.id}`);
	}
};

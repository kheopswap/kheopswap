import { isAccountCompatibleWithToken } from "@kheopswap/registry";
import { getTokenById$ } from "@kheopswap/services/tokens";
import {
	type LoadableState,
	getAddressFromAccountField,
	loadableData,
	loadableLoading,
	tokensToPlancks,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import type { TokenState } from "node_modules/@kheopswap/services/src/tokens/state";
import { type Observable, combineLatest, map, of, switchMap } from "rxjs";
import { type InjectedAccount, getAccount$ } from "src/hooks";
import {
	type OperationType,
	getOperationType$,
} from "./helpers/getOperationType";
import {
	type OperationFormData,
	operationFormData$,
} from "./operationFormData";

export type OperationInputs = {
	type: OperationType | null;
	account: InjectedAccount | null;
	tokenIn: TokenState | null;
	tokenOut: TokenState | null;
	recipient: string | null;
	plancksIn: bigint | null;
};

const getOperationInputs$ = (formData: OperationFormData) => {
	const account$ = formData.accountId
		? getAccount$(formData.accountId)
		: of(null);
	const tokenIn$ = formData.tokenIdIn
		? getTokenById$(formData.tokenIdIn)
		: of(null);
	const tokenOut$ = formData.tokenIdOut
		? getTokenById$(formData.tokenIdOut)
		: of(null);

	return combineLatest([account$, tokenIn$, tokenOut$]).pipe(
		switchMap(
			([account, tokenIn, tokenOut]): Observable<
				LoadableState<OperationInputs>
			> => {
				const recipient =
					getAddressFromAccountField(formData.recipient) ?? null;
				const plancksIn =
					tokenIn?.token && !!formData.amountIn
						? tokensToPlancks(formData.amountIn, tokenIn.token.decimals)
						: null;

				// check account/token compatibility
				if (
					(account?.address &&
						tokenIn?.token &&
						!isAccountCompatibleWithToken(account.address, tokenIn.token)) ||
					(recipient &&
						tokenOut?.token &&
						!isAccountCompatibleWithToken(recipient, tokenOut.token))
				)
					return of(
						loadableData<OperationInputs>(
							{
								type: "invalid",
								account,
								tokenIn,
								tokenOut,
								recipient,
								plancksIn,
							},
							false,
						),
					);

				return getOperationType$(tokenIn?.token, tokenOut?.token).pipe(
					map((type): LoadableState<OperationInputs> => {
						return loadableData<OperationInputs>(
							{
								type: type.data ?? "unknown",
								account,
								tokenIn,
								tokenOut,
								recipient:
									getAddressFromAccountField(formData.recipient) ?? null,
								plancksIn:
									tokenIn?.token && !!formData.amountIn
										? tokensToPlancks(formData.amountIn, tokenIn.token.decimals)
										: null,
							},
							type.isLoading ||
								tokenIn?.status !== "loaded" ||
								tokenOut?.status !== "loaded",
						);
					}),
				);
			},
		),
	);
};

export const [useOperationInputs, operationInputs$] = bind(
	operationFormData$.pipe(
		switchMap((formData) => getOperationInputs$(formData)),
	),
	loadableLoading<OperationInputs>(),
);

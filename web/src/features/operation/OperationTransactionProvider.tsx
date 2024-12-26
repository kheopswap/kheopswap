import { type FC, type PropsWithChildren, useCallback, useMemo } from "react";

import {
	type LoadableState,
	type TxEvents,
	isBigInt,
	loadableStateData,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { get } from "lodash";
import { combineLatest, map } from "rxjs";
import {
	type CallSpendings,
	type ExpectedEventResult,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import {
	operationInputs$,
	updateOperationFormData,
	useOperationInputs,
} from "./state";
import { operationPlancksOut$ } from "./state/operation.plancksOut";
import { operationDeliveryFeeEstimate$ } from "./state/operationDeliveryFeeEstimate";
import { operationFeeEstimateWithToken$ } from "./state/operationFeeToken";
import { useOperationTransaction } from "./state/operationTransaction";

export const OperationTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const { tokenIn, plancksIn, account } = useOperationInputs();
	const { data: call } = useOperationTransaction();
	const { data: expectedEventResults } = useOperationExpectedEventResults();

	const callSpendings = useMemo<CallSpendings>(
		() =>
			tokenIn?.token && !!plancksIn
				? {
						[tokenIn.token?.id]: { plancks: plancksIn, allowDeath: true },
					}
				: {},
		[tokenIn?.token, plancksIn],
	);

	const handleReset = useCallback(() => {
		updateOperationFormData((prev) => ({
			...prev,
			amountIn: undefined,
		}));
	}, []);

	return (
		<TransactionProvider
			call={call}
			fakeCall={call} // TODO
			callSpendings={callSpendings}
			chainId={tokenIn?.token?.chainId}
			signer={account?.id}
			onReset={handleReset}
			followUpData={undefined} // needs to be snapshot on submit
			expectedEventResults={expectedEventResults}
		>
			{children}
		</TransactionProvider>
	);
};

const [useOperationExpectedEventResults] = bind(
	combineLatest([
		operationInputs$,
		operationPlancksOut$,
		operationFeeEstimateWithToken$,
		operationDeliveryFeeEstimate$,
	]).pipe(
		map(
			([inputs, opPlancksOut, opFee, delFee]): LoadableState<
				ExpectedEventResult[]
			> => {
				if (!inputs.tokenIn?.token)
					return loadableStateData([], inputs.tokenIn?.status !== "loaded");
				if (!inputs.tokenOut?.token)
					return loadableStateData([], inputs.tokenIn?.status !== "loaded");
				if (!inputs.account) return loadableStateData([]);
				if (!inputs.recipient) return loadableStateData([]);
				if (!isBigInt(inputs.plancksIn)) return loadableStateData([]);
				if (!isBigInt(opPlancksOut.data)) return loadableStateData([]);

				const results: ExpectedEventResult[] = [];

				const tokenIn = inputs.tokenIn.token;
				const tokenOut = inputs.tokenOut.token;
				const plancksOut = opPlancksOut.data;

				switch (inputs.type) {
					case "transfer": {
						if (tokenIn.type === "native")
							results.push({
								tokenId: tokenIn.id,
								plancks: plancksOut,
								label: "Transfer",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"Balances",
									"Transfer",
									"amount",
								),
							});

						if (tokenIn.type === "asset")
							results.push({
								tokenId: tokenIn.id,
								plancks: plancksOut,
								label: "Transfer",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"Assets",
									"Transferred",
									"amount",
								),
							});

						if (tokenIn.type === "foreign-asset")
							results.push({
								tokenId: tokenIn.id,
								plancks: plancksOut,
								label: "Transfer",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"ForeignAssets",
									"Transferred",
									"amount",
								),
							});

						if (tokenIn.type === "x-token")
							results.push({
								tokenId: tokenIn.id,
								plancks: plancksOut,
								label: "Transfer",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"XTokens",
									"Transferred",
									"amount",
								),
							});

						break;
					}

					case "asset-convert": {
						results.push({
							tokenId: tokenOut.id,
							plancks: plancksOut,
							label: "Swap Outcome",
							getEffectiveValue: getEffectiveValueByNameAndPath(
								"AssetConversion",
								"SwapExecuted",
								"amount_out",
							),
							component: "asset-convert",
						});
						break;
					}

					case "xcm": {
						if (delFee.data?.tokenId && isBigInt(delFee.data?.plancks))
							results.push({
								tokenId: delFee.data.tokenId,
								plancks: delFee.data.plancks,
								label: "XCM Delivery Fee",
								getEffectiveValue: getEffectiveValueByNamesAndPath(
									["XcmPallet", "PolkadotXcm", "KusamaXcm"],
									"FeesPaid",
									"fees[0].fun.value",
								),
							});

						break;
					}

					default:
						break;
				}

				// there is always a transaction fee
				if (opFee.data?.token && isBigInt(opFee.data?.value)) {
					const { token, value } = opFee.data;
					switch (token.type) {
						case "native":
							results.push({
								tokenId: token.id,
								plancks: value,
								label: "Transaction Fee",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"TransactionPayment",
									"TransactionFeePaid",
									"actual_fee",
								),
							});
							break;
						default:
							results.push({
								tokenId: token.id,
								plancks: value,
								label: "Transaction Fee",
								getEffectiveValue: getEffectiveValueByNameAndPath(
									"AssetTxPayment",
									"AssetTxFeePaid",
									"actual_fee",
								),
							});
					}
				}

				return loadableStateData(results);
			},
		),
	),
	loadableStateData([]),
);

const getEffectiveValueByNameAndPath =
	(palletName: string, palletEvent: string, valuePath: string) =>
	(events: TxEvents) => {
		const event = events.find(
			(e) => e.type === palletName && e.value.type === palletEvent,
		);
		return event ? (get(event.value.value, valuePath) as bigint) : null;
	};

const getEffectiveValueByNamesAndPath =
	(palletNames: string[], palletEvent: string, valuePath: string) =>
	(events: TxEvents) => {
		const event = events.find(
			(e) => palletNames.includes(e.type) && e.value.type === palletEvent,
		);
		return event ? (get(event.value.value, valuePath) as bigint) : null;
	};

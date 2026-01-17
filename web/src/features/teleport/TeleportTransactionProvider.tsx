import { type FC, type PropsWithChildren, useMemo } from "react";
import {
	type CallSpendings,
	TransactionProvider,
} from "src/features/transaction/TransactionProvider";
import { useTeleport } from "./TeleportProvider";

const getTeleportTitle = (tokenSymbol: string | undefined): string => {
	return tokenSymbol ? `Teleport ${tokenSymbol}` : "Teleport";
};

export const TeleportTransactionProvider: FC<PropsWithChildren> = ({
	children,
}) => {
	const {
		call,
		fakeCall,
		formData,
		tokenIn,
		plancksIn,
		onReset,
		deliveryFeeEstimate,
		followUpData,
	} = useTeleport();

	const title = useMemo(
		() => getTeleportTitle(tokenIn?.symbol),
		[tokenIn?.symbol],
	);

	const callSpendings = useMemo<CallSpendings>(() => {
		if (!tokenIn || !plancksIn) return {};

		const tokenInPlancks =
			plancksIn +
			(deliveryFeeEstimate?.tokenId === tokenIn.id
				? deliveryFeeEstimate.plancks
				: 0n);

		return {
			[tokenIn.id]: { plancks: tokenInPlancks, allowDeath: false },
		};
	}, [plancksIn, tokenIn, deliveryFeeEstimate]);

	return (
		<TransactionProvider
			call={call}
			fakeCall={fakeCall}
			callSpendings={callSpendings}
			chainId={tokenIn?.chainId}
			signer={formData.from}
			onReset={onReset}
			followUpData={followUpData}
			transactionType="teleport"
			transactionTitle={title}
		>
			{children}
		</TransactionProvider>
	);
};

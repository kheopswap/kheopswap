import type { FC } from "react";
import { of } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getHoldingStablePlancks$ } from "../state/prices";
import { useRelayChains } from "../state/relay";
import { bindSerialized } from "../utils/bindSerialized";
import { cn } from "../utils/cn";
import { UNPRICED } from "../utils/getHoldingValuation";
import { hasValueLine, useIsValuedAsStable } from "../utils/hasValueLine";
import { isBigInt } from "../utils/isBigInt";
import { Shimmer } from "./Shimmer";
import { StableValue } from "./StableValue";
import { getShownValuationStatus, ValuationLabel } from "./ValuationLabel";

const useAmountValuation = bindSerialized(
	(tokenId: TokenId | null, plancks: bigint | null) =>
		tokenId && isBigInt(plancks)
			? getHoldingStablePlancks$(tokenId, plancks)
			: of({ ...UNPRICED, isLoadingStablePlancks: false }),
	(tokenId, plancks) => ({
		...UNPRICED,
		isLoadingStablePlancks: !!tokenId && isBigInt(plancks),
	}),
);

export const StablePrice: FC<{
	plancks: bigint | null | undefined;
	tokenId: TokenId | null | undefined;
	className?: string;
}> = ({ plancks, tokenId, className }) => {
	const { stableToken } = useRelayChains();
	const isValuedAsStable = useIsValuedAsStable(tokenId ?? undefined);
	const { isLoadingStablePlancks, ...valuation } = useAmountValuation(
		tokenId ?? null,
		plancks ?? null,
	);

	const labelStatus = getShownValuationStatus({
		status: valuation.status,
		tokenPlancks: plancks ?? null,
		subject: "amount",
		isLoadingStablePlancks,
	});

	const showsValueLine =
		isBigInt(plancks) && hasValueLine(isValuedAsStable, plancks);

	if (showsValueLine && labelStatus)
		return <ValuationLabel status={labelStatus} subject="amount" />;

	if (showsValueLine && valuation.status === "priced")
		return (
			<StableValue
				stableToken={stableToken}
				plancks={valuation.stablePlancks}
				className={className}
			/>
		);

	return (
		<Shimmer
			className={cn(
				"inline-block font-mono",
				className,
				!(showsValueLine && isLoadingStablePlancks) && "invisible",
			)}
		>
			{`0000 ${stableToken.symbol}`}
		</Shimmer>
	);
};

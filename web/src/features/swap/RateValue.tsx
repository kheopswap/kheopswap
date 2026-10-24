import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { formatDecimals } from "../../utils/formatDecimals";
import { useSwap } from "./SwapProvider";
import { getSwapRate } from "./swapRate";

export const RateValue = () => {
	const { tokenIn, tokenOut, totalIn, swapPlancksOut } = useSwap();
	const [isInverted, setIsInverted] = useState(false);
	if (!tokenIn || !tokenOut || !totalIn || !swapPlancksOut) return null;

	const sent = { token: tokenIn, plancks: totalIn };
	const received = { token: tokenOut, plancks: swapPlancksOut };
	const [base, quote] = isInverted ? [received, sent] : [sent, received];
	const rate = getSwapRate(
		{ plancks: base.plancks, decimals: base.token.decimals },
		{ plancks: quote.plancks, decimals: quote.token.decimals },
	);

	return (
		<button
			type="button"
			onClick={() => setIsInverted((inverted) => !inverted)}
			aria-label="Invert rate"
			className="flex items-center gap-2"
		>
			<ArrowsRightLeftIcon className="size-4 text-muted" />
			<span className="font-mono">
				1 {base.token.symbol} = {formatDecimals(rate, 6)} {quote.token.symbol}
			</span>
		</button>
	);
};

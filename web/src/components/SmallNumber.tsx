import { forwardRef, useMemo } from "react";
import { cn } from "../utils/cn";
import { formatDecimals } from "../utils/formatDecimals";
import { logger } from "../utils/logger";
import { plancksToTokens } from "../utils/plancks";

type PriceProps = {
	value: string | number;
	decimals: number;
	suffix?: string;
	digits?: number;
	className?: string;
};

type FormattedPrice = {
	lead: string;
	collapsedZeros: string;
	rest: string;
};

const PLAIN = (text: string): FormattedPrice => ({
	lead: text,
	collapsedZeros: "",
	rest: "",
});

const formatPrice = (
	value: string | number,
	decimals: number,
	digits: number,
): FormattedPrice => {
	let number = Number(value);
	let prefix = "";

	if (Number.isNaN(number)) return PLAIN("NaN");

	if (number === 0) {
		number = Number(plancksToTokens(1n, decimals));
		prefix = "< ";
	}

	if (number >= 0.01)
		return PLAIN(`${prefix}${formatDecimals(number, digits)}`);

	const match = /^0+\.(0+)(\d*)$/.exec(number.toFixed(20));
	if (match?.length !== 3) return PLAIN(formatDecimals(number, digits));

	const [, zeros = "", significant = ""] = match;
	return {
		lead: `${prefix}0.0`,
		collapsedZeros: zeros.slice(1),
		rest: significant.slice(0, Math.max(1, digits - 2)).replace(/0+$/, ""),
	};
};

export const Price = forwardRef<HTMLSpanElement, PriceProps>(
	({ value, suffix, className, digits = 4, decimals }, ref) => {
		const { lead, collapsedZeros, rest } = useMemo<FormattedPrice>(() => {
			try {
				return formatPrice(value, decimals, digits);
			} catch (err) {
				logger.error("Failed to format number", { err, value, digits });
				return PLAIN(formatDecimals(value, digits));
			}
		}, [value, digits, decimals]);

		return (
			<span ref={ref} className={cn("whitespace-nowrap font-mono", className)}>
				{lead}
				{collapsedZeros && (
					<span
						className="collapsed-zeros"
						data-count={collapsedZeros.length + 1}
					>
						<span>{collapsedZeros}</span>
					</span>
				)}
				{rest}
				{!!suffix && ` ${suffix}`}
			</span>
		);
	},
);
Price.displayName = "Price";

import { type FC, forwardRef, useMemo } from "react";
import { cn, formatDecimals, logger, plancksToTokens } from "src/util";

type PricePartProps = {
	isSub: boolean;
	value: string;
};

const PricePart: FC<PricePartProps> = ({ isSub, value }) =>
	isSub ? <sub>{value}</sub> : value;

type PriceProps = {
	value: string | number;
	decimals: number;
	suffix?: string;
	digits?: number;
	className?: string;
};

export const Price = forwardRef<HTMLSpanElement, PriceProps>(
	({ value, suffix, className, digits = 4, decimals }, ref) => {
		const parts = useMemo<PricePartProps[]>(() => {
			try {
				let number = Number(value);
				let isLowerThan = false;

				if (Number.isNaN(number)) return [{ isSub: false, value: "NaN" }];

				// a price can't be 0, but it can be smaller than the minimal displayable value
				if (number === 0) {
					number = Number(plancksToTokens(1n, decimals));
					isLowerThan = true;
				}

				// no need sub formatting
				if (number >= 0.01)
					return [{ isSub: false, value: formatDecimals(number, digits) }];

				const str = number.toFixed(20); // 20 is the max before exponential notation
				const match = /^0+\.(0+)(\d*)$/.exec(str);

				if (match?.length === 3)
					return [
						{ isSub: false, value: `${isLowerThan ? "< " : ""}0.0` },
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						{ isSub: true, value: match[1]!.length.toString() },
						{
							isSub: false,
							// biome-ignore lint/style/noNonNullAssertion: <explanation>
							value: match[2]!
								.slice(0, Math.max(1, digits - 2)) // min one digit after the sub
								.replace(/0+$/, ""), // remove trailing zeros
						},
					];
			} catch (err) {
				logger.error("Failed to format number", { err, value, digits });
			}

			// fallback to normal formatting
			return [{ isSub: false, value: formatDecimals(value, digits) }];
		}, [value, digits, decimals]);

		return (
			<span ref={ref} className={cn("whitespace-nowrap", className)}>
				{parts.map((props, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
					<PricePart key={`${value}-${i}`} {...props} />
				))}
				{!!suffix && ` ${suffix}`}
			</span>
		);
	},
);
Price.displayName = "Price";

import { type FC, useMemo } from "react";
import { cn, formatDecimals, logger } from "src/util";

type N0mb3rzPartProps = {
	type: "normal" | "sub";
	value: string;
};

const N0mb3rzPart: FC<N0mb3rzPartProps> = ({ type, value }) => {
	switch (type) {
		case "sub":
			return <sub>{value}</sub>;
		case "normal":
			return value;
	}
};

export const N0mb3rz: FC<{
	value: string | number;
	suffix?: string;
	digits?: number;
	className?: string;
}> = ({ value, suffix, className, digits = 4 }) => {
	const parts = useMemo<N0mb3rzPartProps[]>(() => {
		try {
			const number = Number(value);
			if (Number.isNaN(number)) return [{ type: "normal", value: "NaN" }];

			if (number === 0 || number >= 0.01)
				return [{ type: "normal", value: formatDecimals(number, digits) }];

			const str = number.toFixed(20); // 20 is the max before exponential notation
			const match = /^0+\.(0+)(\d*)$/.exec(str);

			if (match?.length === 3)
				return [
					{ type: "normal", value: "0.0" },
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					{ type: "sub", value: match[1]!.length.toString() },
					{
						type: "normal",
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						value: match[2]!
							.slice(0, Math.max(1, digits - 2)) // min one digit after the sub
							.replace(/0+$/, ""), // remove trailing zeros
					},
				];
		} catch (err) {
			logger.error("Failed to format number", { err, value, digits });
		}

		return [{ type: "normal", value: formatDecimals(value, digits) }];
	}, [value, digits]);

	return (
		<span className={cn("whitespace-nowrap", className)}>
			{parts.map((props, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<N0mb3rzPart key={`${value}-${i}`} {...props} />
			))}
			{!!suffix && ` ${suffix}`}
		</span>
	);
};

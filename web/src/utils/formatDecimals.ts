export const formatDecimals = (
	num?: string | number | null,
	digits = 4,
): string => {
	try {
		if (num === null || num === undefined) return "";

		const value = Number(num);
		if (value === 0) return "0";

		const minDisplayable = 1 / 10 ** digits;
		if (value < minDisplayable) return `< ${minDisplayable.toFixed(digits)}`;

		const format = Intl.NumberFormat("en-US", {
			notation: "compact",
			maximumSignificantDigits: digits > 0 ? digits : undefined, // 0 throws
		});

		return format.format(Number(Number(num).toFixed(digits)));
	} catch (err) {
		console.error("formatDecimals", { err, num, digits });
		throw err;
	}
};

const COMPACT_STABLE_VALUE_FROM = 1_000_000;

const stableValueFormat = Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const compactStableValueFormat = Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 2,
});

export const formatStableValue = (num?: string | number | null): string => {
	if (num === null || num === undefined) return "";
	const value = Number(num);
	if (value === 0) return "0.00";
	if (value < 0.01) return "< 0.01";
	return value >= COMPACT_STABLE_VALUE_FROM
		? compactStableValueFormat.format(value)
		: stableValueFormat.format(value);
};

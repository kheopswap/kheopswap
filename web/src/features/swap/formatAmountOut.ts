const SIGNIFICANT_DIGITS = 6;

export const formatAmountOut = (amount: string): string => {
	const [integer = "", fraction = ""] = amount.split(".");
	const leadingZeros =
		integer === "0" ? fraction.length - fraction.replace(/^0+/, "").length : 0;
	const fractionDigits =
		integer === "0"
			? leadingZeros + SIGNIFICANT_DIGITS
			: Math.max(0, SIGNIFICANT_DIGITS - integer.length);
	const kept = fraction.slice(0, fractionDigits).replace(/0+$/, "");
	return kept ? `${integer}.${kept}` : integer;
};

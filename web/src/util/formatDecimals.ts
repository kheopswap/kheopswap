export const formatDecimals = (
  num?: string | number | null,
  digits = 4,
): string => {
  try {
    if (num === null || num === undefined) return "";

    const value = Number(num);
    if (value === 0) return "0";

    const minDisplayable = 1 / Math.pow(10, digits);
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

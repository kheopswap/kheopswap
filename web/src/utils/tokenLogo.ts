import tokenColors from "virtual:token-colors";

export const FALLBACK_LOGO_SRC = "/img/tokens/unknown.svg";

export const getValidTokenLogo = (
	logo: string | null | undefined,
): string | undefined => {
	if (typeof logo !== "string") return undefined;

	const trimmedLogo = logo.trim();
	if (!trimmedLogo) return undefined;

	if (
		trimmedLogo.startsWith("http://") ||
		trimmedLogo.startsWith("https://") ||
		trimmedLogo.startsWith("/") ||
		trimmedLogo.startsWith("./")
	) {
		return trimmedLogo;
	}

	return undefined;
};

const getLogoPath = (logo: string) =>
	logo.replace(/\?.*$/, "").replace(/^\.?\//, "");

export const getTokenLogoColor = (logo: string | undefined) =>
	logo ? (tokenColors[getLogoPath(logo)] ?? null) : null;

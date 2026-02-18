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

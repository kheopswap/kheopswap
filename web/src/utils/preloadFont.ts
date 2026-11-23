const FONT_FAMILIES = [
	"DM Sans Variable",
	"JetBrains Mono Variable",
	"Michroma",
];
const FONT_LOAD_TIMEOUT_MS = 3000;

const giveUpAfterTimeout = () =>
	new Promise<FontFace[]>((resolve) =>
		setTimeout(resolve, FONT_LOAD_TIMEOUT_MS, []),
	);

const isFontFamilyLoaded = async (family: string) => {
	try {
		const faces = await Promise.race([
			document.fonts.load(`1em "${family}"`),
			giveUpAfterTimeout(),
		]);
		return faces.length > 0;
	} catch {
		return false;
	}
};

export const preloadFont = async () => {
	const { classList } = document.documentElement;
	classList.add("wf-loading");
	const loadedFamilies = await Promise.all(
		FONT_FAMILIES.map(isFontFamilyLoaded),
	);
	classList.replace(
		"wf-loading",
		loadedFamilies.some(Boolean) ? "wf-active" : "wf-inactive",
	);
};

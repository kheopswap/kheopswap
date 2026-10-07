export type ColorMode = "dark" | "light";

// index.html reads this key in an inline script to apply the mode before first paint
const STORAGE_KEY = "kheopswap-color-mode";

export const getColorMode = (): ColorMode =>
	document.documentElement.dataset.mode === "light" ? "light" : "dark";

export const setColorMode = (mode: ColorMode) => {
	const root = document.documentElement;
	root.dataset.mode = mode;

	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		// storage can be unavailable (private mode, blocked cookies); the mode still applies for this visit
	}

	const pageColor = getComputedStyle(root)
		.getPropertyValue("--color-page")
		.trim();
	if (pageColor)
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", pageColor);
};

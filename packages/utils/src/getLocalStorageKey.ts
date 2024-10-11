const APP_KEY = "kheopswap"; // TODO pick from constants

export const getLocalStorageKey = (key: string) => {
	return `${APP_KEY}::${key}`;
};

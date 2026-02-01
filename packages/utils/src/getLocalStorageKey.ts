const APP_KEY = "kheopswap";

export const getLocalStorageKey = (key: string) => {
	return `${APP_KEY}::${key}`;
};

export { APP_KEY };

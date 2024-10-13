import { APP_KEY } from "@kheopswap/constants";

export const getLocalStorageKey = (key: string) => {
	return `${APP_KEY}::${key}`;
};

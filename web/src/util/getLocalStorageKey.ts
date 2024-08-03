import { APP_KEY } from "src/config/constants";

export const getLocalStorageKey = (key: string) => {
	return `${APP_KEY}::${key}`;
};

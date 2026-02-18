import { APP_KEY } from "../common/constants";

export const getLocalStorageKey = (key: string) => {
	return `${APP_KEY}::${key}`;
};

import type { TokenInfo } from "src/config/tokens";
import type { LoadingStatus } from "../common";

export type TokenInfoState = {
	tokenInfo: TokenInfo | undefined;
	status: LoadingStatus;
};

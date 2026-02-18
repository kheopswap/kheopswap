import type { TokenInfo } from "../../registry/tokens/types";
import type { LoadingStatus } from "../common";

export type TokenInfoState = {
	tokenInfo: TokenInfo | undefined;
	status: LoadingStatus;
};

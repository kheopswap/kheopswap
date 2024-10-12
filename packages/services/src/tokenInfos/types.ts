import type { TokenInfo } from "@kheopswap/registry";
import type { LoadingStatus } from "../common";

export type TokenInfoState = {
	tokenInfo: TokenInfo | undefined;
	status: LoadingStatus;
};

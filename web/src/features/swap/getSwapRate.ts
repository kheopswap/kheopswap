import { plancksToTokens } from "../../utils/plancks";

type Amount = { plancks: bigint; decimals: number };

export const getSwapRate = (sent: Amount, received: Amount) =>
	Number(plancksToTokens(received.plancks, received.decimals)) /
	Number(plancksToTokens(sent.plancks, sent.decimals));

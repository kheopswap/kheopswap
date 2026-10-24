import type { Token } from "../../registry/tokens/types";
import { getMaxSwapAmount } from "../../utils/ammMath";
import { isBigInt } from "../../utils/isBigInt";

export const getTransferMax = ({
	token,
	balance,
	existentialDeposit,
	feeToken,
	feeEstimate,
}: {
	token: Pick<Token, "id" | "type">;
	balance: bigint | null | undefined;
	existentialDeposit: bigint | null | undefined;
	feeToken: Pick<Token, "id"> | null | undefined;
	feeEstimate: bigint | null | undefined;
}): bigint | null => {
	if (!feeToken || !isBigInt(balance) || !isBigInt(existentialDeposit))
		return null;
	const fee = feeToken.id === token.id ? feeEstimate : 0n;
	if (!isBigInt(fee)) return null;
	return getMaxSwapAmount({
		balance,
		tokenIn: token,
		existentialDeposit,
		fee: { tokenId: feeToken.id, plancks: fee },
		deliveryFee: undefined,
	});
};

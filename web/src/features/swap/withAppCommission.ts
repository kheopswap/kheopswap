import { APP_FEE_ADDRESS } from "../../common/constants";
import { getApi } from "../../papi/getApi";
import type { ChainIdAssetHub } from "../../registry/chains/types";
import type { TokenId } from "../../registry/tokens/types";
import type { AnyTransaction } from "../../types/transactions";
import { getTransferExtrinsic } from "../transfer/getTransferExtrinsic";

export const withAppCommission = async (
	chainId: ChainIdAssetHub,
	call: AnyTransaction,
	tokenIdIn: TokenId,
	appCommission: bigint | null | undefined,
): Promise<AnyTransaction> => {
	if (!appCommission) return call;

	const feeCall = await getTransferExtrinsic(
		chainId,
		tokenIdIn,
		appCommission,
		APP_FEE_ADDRESS,
	);
	const api = await getApi(chainId);

	return api.tx.Utility.batch_all({
		calls: [call.decodedCall, feeCall.decodedCall],
	});
};

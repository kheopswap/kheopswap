import { FormEventHandler, useCallback } from "react";

import { RemoveLiquidityOutcome } from "./RemoveLiquidityOutcome";
import { useRemoveLiquidity } from "./RemoveLiquidityProvider";
import { RemoveLiquiditySlider } from "./RemoveLiquiditySlider";
import { RemoveLiquiditySummary } from "./RemoveLiquiditySummary";

import { FormFieldContainer, MagicButton } from "src/components";
import { useLiquidityPoolPage } from "src/features/liquidity/pool/LiquidityPoolPageProvider";
import { useTransaction } from "src/features/transaction/TransactionProvider";

export const RemoveLiquidityForm = () => {
	const { nativeToken, assetToken, position } = useLiquidityPoolPage();

	const {
		nativeReceived,
		assetReceived,
		nativeReceivedMin,
		assetReceivedMin,
		ratio,
		setRatio,
	} = useRemoveLiquidity();

	const { canSubmit, onSubmit } = useTransaction();

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			onSubmit();
		},
		[onSubmit],
	);

	// TODO remove & shimmer
	if (!nativeToken || !assetToken) return null;

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex w-full flex-col gap-3">
				<FormFieldContainer label="Liquidity to remove">
					<RemoveLiquiditySlider
						ratio={ratio}
						onRatioChange={setRatio}
						disabled={!position?.shares}
					/>
				</FormFieldContainer>
				<FormFieldContainer label="Expected outcome">
					<RemoveLiquidityOutcome
						tokenId1={nativeToken?.id}
						tokenId2={assetToken.id}
						plancks1={nativeReceived}
						plancks2={assetReceived}
					/>
				</FormFieldContainer>
				<FormFieldContainer label="Min. received">
					<RemoveLiquidityOutcome
						tokenId1={nativeToken?.id}
						tokenId2={assetToken.id}
						plancks1={nativeReceivedMin}
						plancks2={assetReceivedMin}
					/>
				</FormFieldContainer>
				<MagicButton type="submit" disabled={!canSubmit}>
					Remove Liquidity
				</MagicButton>
				<RemoveLiquiditySummary />
			</div>
		</form>
	);
};

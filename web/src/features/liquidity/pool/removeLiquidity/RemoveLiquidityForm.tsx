import { type FormEventHandler, useCallback } from "react";
import { FormFieldContainer } from "../../../../components/FormFieldContainer";
import { useTransaction } from "../../../transaction/TransactionProvider";
import { TransactionSubmitButton } from "../../../transaction/TransactionSubmitButton";
import { useLiquidityPoolPage } from "../LiquidityPoolPageProvider";
import { RemoveLiquidityOutcome } from "./RemoveLiquidityOutcome";
import { useRemoveLiquidity } from "./RemoveLiquidityProvider";
import { RemoveLiquiditySlider } from "./RemoveLiquiditySlider";
import { RemoveLiquiditySummary } from "./RemoveLiquiditySummary";

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

	const { onSubmit } = useTransaction();

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
				<TransactionSubmitButton>Remove Liquidity</TransactionSubmitButton>
				<RemoveLiquiditySummary />
			</div>
		</form>
	);
};

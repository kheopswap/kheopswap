import type { FC, PropsWithChildren } from "react";
import { MagicButton } from "../../components/MagicButton";
import { useTransaction } from "./TransactionProvider";

type TransactionSubmitButtonProps = PropsWithChildren<{
	disabled?: boolean;
}>;

export const TransactionSubmitButton: FC<TransactionSubmitButtonProps> = ({
	children,
	disabled,
}) => {
	const {
		canSubmit,
		isEthereumNetworkMismatch,
		isSwitchingEthereumNetwork,
		onSwitchEthereumNetwork,
	} = useTransaction();

	if (isEthereumNetworkMismatch) {
		return (
			<MagicButton
				type="button"
				disabled={isSwitchingEthereumNetwork}
				onClick={onSwitchEthereumNetwork}
			>
				Switch network
			</MagicButton>
		);
	}

	return (
		<MagicButton type="submit" disabled={disabled || !canSubmit}>
			{children}
		</MagicButton>
	);
};

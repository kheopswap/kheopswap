import type { FC, PropsWithChildren } from "react";
import { Styles } from "../../components/styles";
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
			<button
				type="button"
				className={Styles.primaryButton}
				disabled={isSwitchingEthereumNetwork}
				onClick={onSwitchEthereumNetwork}
			>
				Switch network
			</button>
		);
	}

	return (
		<button
			type="submit"
			className={Styles.primaryButton}
			disabled={disabled || !canSubmit}
		>
			{children}
		</button>
	);
};

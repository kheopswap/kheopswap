import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { TRANSFERABLE_TOKEN_TYPES, type TokenId } from "@kheopswap/registry";
import { cn, logger } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash";
import {
	type FC,
	type FormEvent,
	type FormEventHandler,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { of, switchMap } from "rxjs";
import {
	AccountSelect,
	FormFieldContainer,
	Styles,
	TokenAmountPicker,
} from "src/components";
import { accounts$, useAllTokens } from "src/hooks";
import {
	operationInputs$,
	updateOperationFormData,
	useOperationFormData,
	useOperationInputs,
} from "./state";

const [useTokenPickerAccounts] = bind(
	operationInputs$.pipe(
		switchMap((inputs) => (inputs.account ? of([inputs.account]) : accounts$)),
	),
);

const useRetainOnRefresh = () => {
	const formData = useOperationFormData();

	const location = useLocation();
	const navigate = useNavigate();

	const refInit = useRef(false);

	useEffect(() => {
		if (!refInit.current && location.state) {
			refInit.current = true;
			updateOperationFormData(location.state);
		}
	}, [location.state]);

	useEffect(() => {
		if (!isEqual(location.state, formData))
			navigate(location, { state: formData, replace: true });
	}, [formData, location, navigate]);
};

export const OperationForm = () => {
	useRetainOnRefresh();
	const { data: tokens } = useAllTokens({ types: TRANSFERABLE_TOKEN_TYPES });

	const formData = useOperationFormData();
	const inputs = useOperationInputs();

	const tokenPickerAccounts = useTokenPickerAccounts();

	useEffect(() => {
		logger.debug("[operation] formData", formData);
	}, [formData]);

	useEffect(() => {
		logger.debug("[operation] inputs", inputs);
	}, [inputs]);

	const handleSwapTokensClick = useCallback(() => {
		updateOperationFormData({
			tokenIdIn: formData.tokenIdOut,
			tokenIdOut: formData.tokenIdIn,
		});
	}, [formData.tokenIdIn, formData.tokenIdOut]);

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		// onSubmit();
	}, []);

	const amountOut = ""; // TODO

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex w-full flex-col gap-3">
				<FormFieldContainer id="sender-account" label="Sender Account">
					<AccountSelect
						id="sender-account"
						idOrAddress={formData.accountId}
						tokenId={formData.tokenIdIn}
						ownedOnly
						onChange={onSenderChange}
					/>
				</FormFieldContainer>

				<div className="relative flex flex-col gap-2">
					<TokenAmountPicker
						inputProps={{
							value: formData.amountIn ?? "",
							onInput: setAmountIn,
						}}
						tokenId={formData.tokenIdIn}
						//plancks={inputs.plancksIn} // TODO shouldnt need this
						tokens={tokens}
						accounts={tokenPickerAccounts}
						isLoading={inputs.tokenIn?.status === "loading"}
						onTokenChange={setTokenIn}
						// errorMessage={inputErrorMessage}
						// balance={balanceIn}
						// isLoadingBalance={isLoadingBalanceIn}
						// onMaxClick={onMaxClick}
					/>
					<SwapTokensButton onClick={handleSwapTokensClick} />
					<TokenAmountPicker
						inputProps={{ value: amountOut ?? "", readOnly: true }}
						tokenId={formData.tokenIdOut}
						//plancks={plancksOut}
						tokens={tokens}
						accounts={tokenPickerAccounts}
						isLoading={inputs.tokenOut?.status === "loading"}
						onTokenChange={setTokenOut}
						// errorMessage={outputErrorMessage}
						// balance={balanceOut}
						// isLoadingBalance={isLoadingBalanceOut}
						// isComputingValue={isLoadingAmountOut}
					/>
				</div>

				<FormFieldContainer id="recipient-account" label="Recipient Account">
					<AccountSelect
						id="recipient-account"
						idOrAddress={formData.recipient}
						tokenId={formData.tokenIdOut}
						onChange={onRecipientChange}
					/>
				</FormFieldContainer>

				{/* <FormFieldContainer label="Tokens">
					<SwapTokensEditor />
				</FormFieldContainer>

				<MagicButton type="submit" disabled={!canSubmit}>
					Swap
				</MagicButton>

				<SwapSummary /> */}
			</div>
		</form>
	);
};

const onSenderChange = (idOrAddress: string) => {
	updateOperationFormData({ accountId: idOrAddress });
};

const onRecipientChange = (address: string) => {
	updateOperationFormData({ recipient: address });
};

const setAmountIn = (e: FormEvent<HTMLInputElement>) => {
	updateOperationFormData({ amountIn: e.currentTarget.value });
};

const setTokenIn = (tokenIdIn: TokenId) => {
	updateOperationFormData({ tokenIdIn });
};

const setTokenOut = (tokenIdOut: TokenId) => {
	updateOperationFormData({ tokenIdOut });
};

const SwapTokensButton: FC<{ onClick: () => void; className?: string }> = ({
	onClick,
	className,
}) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			Styles.button,
			"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2  p-2",
			className,
		)}
	>
		<ArrowDownIcon className="size-4" />
	</button>
);

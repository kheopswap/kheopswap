import { ArrowDownIcon } from "@heroicons/react/24/solid";
import {
	TRANSFERABLE_TOKEN_TYPES,
	type TokenId,
	getTokenId,
} from "@kheopswap/registry";
import {
	cn,
	getAddressFromAccountField,
	isBigInt,
	logger,
	plancksToTokens,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { isEqual } from "lodash";
import {
	type FC,
	type FormEvent,
	type FormEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { of, switchMap } from "rxjs";
import {
	AccountSelect,
	FormFieldContainer,
	MagicButton,
	Styles,
	TokenAmountPicker,
} from "src/components";
import { useChainAccount } from "src/helpers/getChainAccount";
import { useExistentialDeposit } from "src/helpers/getExistentialDeposit";
import { accounts$, useAllTokens } from "src/hooks";
import { useTransaction } from "../transaction/TransactionProvider";
import { OperationSummary } from "./OperationSummary";
import {
	operationInputs$,
	updateOperationFormData,
	useOperationFormData,
	useOperationInputs,
} from "./state";
import { useAssetConversionLPFee } from "./state/helpers/getAssetConversionLPFee";
import { useOperationPlancksOut } from "./state/operation.plancksOut";
import {
	operationTransaction$,
	useOperationTransaction,
} from "./state/operationTransaction";

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
	const transaction = useOperationTransaction();

	const tokenPickerAccounts = useTokenPickerAccounts();

	useEffect(() => {
		logger.debug("[operation] formData", formData);
	}, [formData]);

	useEffect(() => {
		logger.debug("[operation] inputs", inputs);
	}, [inputs]);

	useEffect(() => {
		logger.debug("[operation] operation tx", transaction);
	}, [transaction]);

	const handleSwapTokensClick = useCallback(() => {
		updateOperationFormData({
			tokenIdIn: formData.tokenIdOut,
			tokenIdOut: formData.tokenIdIn,
		});
	}, [formData.tokenIdIn, formData.tokenIdOut]);

	const { onSubmit, canSubmit } = useTransaction();

	const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			onSubmit();
		},
		[onSubmit],
	);

	useEffect(() => {
		console.log("[debug] useTransaction", { onSubmit, canSubmit });
	}, [onSubmit, canSubmit]);

	const lpFee = useAssetConversionLPFee("pah");
	useEffect(() => {
		console.log("[debug] lpFee", lpFee);
	}, [lpFee]);

	const ed = useExistentialDeposit(
		getTokenId({ type: "asset", chainId: "pah", assetId: 1337 }),
	);
	useEffect(() => {
		console.log("[debug] ed", ed);
	}, [ed]);

	const chainAccount = useChainAccount(
		"pah",
		getAddressFromAccountField(formData.accountId),
	);
	useEffect(() => {
		console.log("[debug] chainAccount", chainAccount);
	}, [chainAccount]);

	const plancksOut = useOperationPlancksOut();
	useEffect(() => {
		console.log("[debug] plancksOut", plancksOut);
	}, [plancksOut]);

	const [amountOut, isLoadingAmountOut] = useMemo(
		() =>
			isBigInt(plancksOut.data) && inputs.tokenOut?.token
				? [
						plancksToTokens(plancksOut.data, inputs.tokenOut.token.decimals),
						plancksOut.isLoading,
					]
				: ["", plancksOut.isLoading],
		[plancksOut, inputs.tokenOut?.token],
	);

	const operationLabel = useMemo(() => {
		if (inputs.type === "transfer") return "Transfer";
		if (inputs.type === "asset-convert") return "Swap";
		if (inputs.type === "xcm") return "Cross-chain transfer";
		return "Invalid operation";
	}, [inputs.type]);

	//const amountOut = ""; // TODO

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
						// plancks={null}
						tokens={tokens}
						accounts={tokenPickerAccounts}
						isLoading={inputs.tokenOut?.status === "loading"}
						onTokenChange={setTokenOut}
						// errorMessage={outputErrorMessage}
						// balance={balanceOut}
						// isLoadingBalance={isLoadingBalanceOut}
						isComputingValue={isLoadingAmountOut}
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

				<MagicButton type="submit" disabled={!canSubmit}>
					{operationLabel}
				</MagicButton>

				<OperationSummary />

				{/* <FormFieldContainer label="Tokens">
					<SwapTokensEditor />
				</FormFieldContainer>

				

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

import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { TRANSFERABLE_TOKEN_TYPES, type TokenId } from "@kheopswap/registry";
import { cn, isBigInt, logger, plancksToTokens } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { fromPairs, isEqual } from "lodash";
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
import { accounts$, useAllTokens, useBalance } from "src/hooks";
import { useTransaction } from "../transaction/TransactionProvider";
import { OperationSummary } from "./OperationSummary";
import {
	operationInputs$,
	updateOperationFormData,
	useOperationFormData,
	useOperationInputs,
} from "./state";
import { usePossibleRoutesFromToken } from "./state/helpers/getPossibleRoutesForToken";
import { useOperationPlancksOut } from "./state/operation.plancksOut";
import { useOperationMaxPlancksIn } from "./state/operationMaxPlancksIn";
import {
	useOperationFakeTransaction,
	useOperationTransaction,
} from "./state/operationTransaction";

const [useTokenPickerAccounts] = bind(
	operationInputs$.pipe(
		switchMap(({ data: inputs }) =>
			inputs?.account ? of([inputs.account]) : accounts$,
		),
	),
);

// keeps the form data in the location state so user can refresh page without losing inputs
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
	const { data: tokens, isLoading: isLoadingAllTokens } = useAllTokens({
		types: TRANSFERABLE_TOKEN_TYPES,
	});

	const formData = useOperationFormData();
	const { data: inputs } = useOperationInputs();
	const transaction = useOperationTransaction();
	const fakeTransaction = useOperationFakeTransaction();
	const tokenPickerAccounts = useTokenPickerAccounts();

	useEffect(() => {
		logger.debug("[operation] formData", formData);
	}, [formData]);

	useEffect(() => {
		logger.debug("[operation] inputs", inputs);
	}, [inputs]);

	useEffect(() => {
		logger.debug("[operation] operation tx", { transaction, fakeTransaction });
	}, [transaction, fakeTransaction]);

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

	// useEffect(() => {
	// 	console.log("[debug] useTransaction", { onSubmit, canSubmit });
	// }, [onSubmit, canSubmit]);

	// useEffect(() => {
	// 	console.log("[debug] lpFee", lpFee);
	// }, [lpFee]);

	// const ed = useExistentialDeposit(
	// 	getTokenId({ type: "asset", chainId: "pah", assetId: 1337 }),
	// );
	// useEffect(() => {
	// 	console.log("[debug] ed", ed);
	// }, [ed]);

	// const chainAccount = useChainAccount(
	// 	"pah",
	// 	getAddressFromAccountField(formData.accountId),
	// );
	// useEffect(() => {
	// 	console.log("[debug] chainAccount", chainAccount);
	// }, [chainAccount]);

	const plancksOut = useOperationPlancksOut();
	// useEffect(() => {
	// 	console.log("[debug] plancksOut", plancksOut);
	// }, [plancksOut]);

	const [amountOut, isLoadingAmountOut] = useMemo(
		() =>
			isBigInt(plancksOut.data) && inputs?.tokenOut?.token
				? [
						plancksToTokens(plancksOut.data, inputs.tokenOut.token.decimals),
						plancksOut.isLoading,
					]
				: ["", plancksOut.isLoading],
		[plancksOut, inputs?.tokenOut?.token],
	);

	const operationLabel = useMemo(() => {
		if (inputs?.type === "transfer") return "Transfer";
		if (inputs?.type === "asset-convert") return "Swap";
		if (inputs?.type === "xcm") return "Cross-chain transfer";
		return "Invalid operation";
	}, [inputs?.type]);

	const { data: balanceIn, isLoading: isLoadingBalanceIn } = useBalance({
		address: inputs?.account?.address,
		tokenId: inputs?.tokenIn?.token?.id,
	});
	const { data: balanceOut, isLoading: isLoadingBalanceOut } = useBalance({
		address: inputs?.recipient,
		tokenId: inputs?.tokenOut?.token?.id,
	});

	//const amountOut = ""; // TODO
	//const lpFee = useAssetConversionLPFee("pah");
	const maxPlancksIn = useOperationMaxPlancksIn();

	const onMaxClick = useCallback(() => {
		if (!isBigInt(maxPlancksIn) || !inputs?.tokenIn?.token) return;
		updateOperationFormData({
			amountIn: plancksToTokens(maxPlancksIn, inputs.tokenIn.token.decimals),
		});

		// in case of XCM operation, need the dry run to be available
		// keep ED only if tokenIn is sufficient and there is no other sufficient asset
		//	throw new Error("Not implemented");
	}, [maxPlancksIn, inputs?.tokenIn?.token]);

	//const tokenIn = useToken({ tokenId: formData.tokenIdIn });
	const { data: targetTokens, isLoading: isLoadingTargetTokens } =
		usePossibleRoutesFromToken(inputs?.tokenIn?.token);
	const dicTargetTokens = useMemo(
		() => fromPairs((targetTokens ?? []).map((token) => [token.id, token])),
		[targetTokens],
	);

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex w-full flex-col gap-3">
				<FormFieldContainer id="sender-account" label="From">
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
						tokens={tokens}
						accounts={tokenPickerAccounts}
						isLoading={isLoadingAllTokens}
						onTokenChange={setTokenIn}
						// errorMessage={inputErrorMessage}
						balance={balanceIn}
						isLoadingBalance={isLoadingBalanceIn}
						onMaxClick={onMaxClick}
					/>
					<SwapTokensButton onClick={handleSwapTokensClick} />
					<TokenAmountPicker
						inputProps={{ value: amountOut ?? "", readOnly: true }}
						tokenId={formData.tokenIdOut}
						tokens={dicTargetTokens}
						accounts={tokenPickerAccounts}
						isLoading={isLoadingTargetTokens}
						onTokenChange={setTokenOut}
						// errorMessage={outputErrorMessage}
						balance={balanceOut}
						isLoadingBalance={isLoadingBalanceOut}
						isComputingValue={isLoadingAmountOut}
					/>
				</div>

				<FormFieldContainer id="recipient-account" label="Recipient">
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

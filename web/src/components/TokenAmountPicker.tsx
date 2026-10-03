import { maskitoNumberOptionsGenerator } from "@maskito/kit";
import { useMaskito } from "@maskito/react";
import {
	type DetailedHTMLProps,
	type FC,
	forwardRef,
	type InputHTMLAttributes,
	useCallback,
	useMemo,
} from "react";
import type { PolkadotAccount } from "../common/kheopskit";
import type { Token, TokenId } from "../registry/tokens/types";
import { cn } from "../utils/cn";
import { isBigInt } from "../utils/isBigInt";
import { Shimmer } from "./Shimmer";
import { StablePrice } from "./StablePrice";
import { Styles } from "./styles";
import { TokenSelectButton } from "./TokenSelectButton";
import { Tokens } from "./Tokens";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

const TokenInput = forwardRef<
	HTMLInputElement,
	{ decimals?: number } & DetailedHTMLProps<
		InputHTMLAttributes<HTMLInputElement>,
		HTMLInputElement
	>
>(({ decimals, ...props }, refForward) => {
	const maskito = useMemo(
		() => ({
			options: maskitoNumberOptionsGenerator({
				thousandSeparator: "",
				min: 0,
				maximumFractionDigits: decimals,
			}),
		}),
		[decimals],
	);

	const refFormat = useMaskito(maskito);

	const ref = useCallback(
		(node: HTMLInputElement | null) => {
			refFormat(node);
			if (typeof refForward === "function") refForward(node);
			else if (refForward) refForward.current = node;
		},
		[refFormat, refForward],
	);

	return <input ref={ref} {...props} />;
});

export type TokenAmountPickerProps = Partial<
	DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
>;

export const TokenAmountPicker: FC<{
	inputProps: TokenAmountPickerProps;
	tokenId: TokenId | null | undefined;
	tokens?: Record<string, Token> | undefined;
	accounts?: PolkadotAccount[] | string[];
	plancks: bigint | null | undefined;
	isLoading: boolean;
	errorMessage?: string | null;
	disableTokenButton?: boolean;
	onTokenChange: (tokenId: TokenId) => void;
	balance?: bigint | null | undefined; // TODO remove optional
	isLoadingBalance?: boolean;
	onMaxClick?: () => void;
	isComputingValue?: boolean;
	inputLabel?: string;
}> = ({
	inputProps,
	tokenId,
	tokens,
	accounts,
	isLoading,
	plancks,
	errorMessage,
	onTokenChange,
	disableTokenButton,

	balance,
	isLoadingBalance,
	onMaxClick,

	isComputingValue,
	inputLabel,
}) => {
	const token = useMemo(
		() => (tokenId ? tokens?.[tokenId] : undefined),
		[tokenId, tokens],
	);

	return (
		<div
			className={cn(
				Styles.field,
				"flex w-full flex-col gap-2.5 p-3.5",
				inputProps.readOnly && "focus-within:border-transparent",
			)}
		>
			<div className="flex w-full relative">
				<TokenInput
					decimals={token?.decimals}
					{...inputProps}
					inputMode="decimal"
					placeholder="0"
					spellCheck={false}
					autoComplete="off"
					autoCorrect="off"
					aria-label={inputLabel ?? "Token amount"}
					className={cn(
						"w-full min-w-0 grow border-none bg-transparent py-0 pr-2 text-left font-mono text-[28px] font-medium tracking-[-0.02em] text-text placeholder:text-faint focus:border-none focus:outline-hidden focus:ring-0",
						isComputingValue && "invisible",
					)}
				/>
				<TokenSelectButton
					className={cn(
						"shrink-0",
						disableTokenButton && "disabled:opacity-100",
					)}
					tokens={tokens}
					accounts={accounts}
					isLoading={isLoading}
					tokenId={tokenId}
					onChange={onTokenChange}
					disabled={disableTokenButton}
				/>
				{isComputingValue && (
					<Shimmer className="absolute top-1/2 left-0 -translate-y-1/2 font-mono text-[28px] leading-tight">
						0.000000000
					</Shimmer>
				)}
			</div>
			<div className="flex w-full items-center overflow-hidden text-xs">
				<div
					className={cn(
						"grow truncate",
						!!errorMessage && "text-error",
						isComputingValue && "invisible",
					)}
				>
					{errorMessage ? (
						<Tooltip>
							<TooltipTrigger className={cn("text-error")}>
								{errorMessage}
							</TooltipTrigger>
							<TooltipContent>{errorMessage}</TooltipContent>
						</Tooltip>
					) : (
						<StablePrice
							plancks={plancks}
							tokenId={tokenId}
							className="text-muted"
						/>
					)}
				</div>

				{(isLoadingBalance || isBigInt(balance)) && (
					<div className="flex shrink-0 items-center text-nowrap text-muted">
						{isBigInt(balance) && token ? (
							<>
								{onMaxClick && !!balance && (
									<button
										type="button"
										className="mr-2 h-6 rounded-chip bg-hover px-2 text-[11px] font-semibold tracking-[0.05em] text-text"
										onClick={onMaxClick}
										aria-label="Use maximum balance"
									>
										MAX
									</button>
								)}
								<Tokens
									plancks={balance}
									token={token}
									pulse={isLoadingBalance}
								/>
							</>
						) : isLoadingBalance ? (
							<Shimmer>0.000 TKN</Shimmer>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
};

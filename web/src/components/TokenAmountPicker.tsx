import {
	type DetailedHTMLProps,
	type FC,
	type InputHTMLAttributes,
	forwardRef,
	useMemo,
} from "react";

import { Shimmer } from "./Shimmer";
import { TokenSelectButton } from "./TokenSelectButton";
import { Styles } from "./styles";

import { useMergeRefs } from "@floating-ui/react";
import { maskitoNumberOptionsGenerator } from "@maskito/kit";
import { useMaskito } from "@maskito/react";
import type { Dictionary } from "lodash";

import type { Token, TokenId } from "@kheopswap/registry";
import { cn, isBigInt, tokensToPlancks } from "@kheopswap/utils";
import {
	StablePrice,
	Tokens,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components";
import type { InjectedAccount } from "src/hooks";

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
				precision: decimals,
			}),
		}),
		[decimals],
	);

	const refFormat = useMaskito(maskito);

	const ref = useMergeRefs([refFormat, refForward]);

	return <input ref={ref} {...props} />;
});

export type TokenAmountPickerProps = Partial<
	DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
>;

export const TokenAmountPicker: FC<{
	inputProps: TokenAmountPickerProps;
	tokenId: TokenId | null | undefined;
	tokens?: Dictionary<Token> | undefined;
	accounts?: InjectedAccount[] | string[];
	// plancks: bigint | null | undefined;
	isLoading: boolean;
	errorMessage?: string | null;
	disableTokenButton?: boolean;
	onTokenChange: (tokenId: TokenId) => void;
	balance?: bigint | null | undefined; // TODO remove optional
	isLoadingBalance?: boolean;
	onMaxClick?: () => void;
	isComputingValue?: boolean;
}> = ({
	inputProps,
	tokenId,
	tokens,
	accounts,
	isLoading,

	errorMessage,
	onTokenChange,
	disableTokenButton,

	balance,
	isLoadingBalance,
	onMaxClick,

	isComputingValue,
}) => {
	const token = useMemo(
		() => (tokenId ? tokens?.[tokenId] : undefined),
		[tokenId, tokens],
	);

	const plancks = useMemo(
		() =>
			typeof inputProps.value === "string" && !inputProps.value && token
				? tokensToPlancks(inputProps.value, token.decimals)
				: null,
		[inputProps.value, token],
	);

	return (
		<div
			className={cn(
				Styles.field,
				"flex w-full flex-col gap-2 p-3 ",
				inputProps.readOnly && "focus-within:border-neutral-800",
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
					className={cn(
						"w-full min-w-0 grow border-none bg-transparent py-0 pr-2 text-left text-2xl font-semibold text-white placeholder:text-white/50 focus:border-none focus:outline-none focus:ring-0",
						isComputingValue && "invisible",
					)}
				/>
				<TokenSelectButton
					className={cn(
						"shrink-0",
						disableTokenButton &&
							"border-neutral-750/50 bg-transparent disabled:opacity-100",
					)}
					tokens={tokens}
					accounts={accounts}
					isLoading={isLoading}
					tokenId={tokenId}
					onChange={onTokenChange}
					disabled={disableTokenButton}
				/>
				{isComputingValue && (
					<Shimmer className={cn("absolute top-3 left-0 text-2xl")}>
						0.000000000
					</Shimmer>
				)}
			</div>
			<div className="flex w-full overflow-hidden">
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
							className="text-neutral-500"
						/>
					)}
				</div>

				{(isLoadingBalance || isBigInt(balance)) && (
					<div className="flex shrink-0 items-center text-nowrap text-neutral-500">
						{isBigInt(balance) && token ? (
							<>
								{onMaxClick && !!balance && (
									<button
										type="button"
										className={cn(
											Styles.button,
											"mr-2 px-1 py-0.5 text-xs",
											"text-neutral-300",
										)}
										onClick={onMaxClick}
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

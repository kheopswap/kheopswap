import type { FC } from "react";
import { useMemo } from "react";
import { AccountIcon } from "../../components/AccountIcon";
import { AccountSelectDrawer } from "../../components/AccountSelectDrawer";
import { Shimmer } from "../../components/Shimmer";
import { StableValue } from "../../components/StableValue";
import { Tokens } from "../../components/Tokens";
import { useOpenClose } from "../../hooks/useOpenClose";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import type { BalanceWithStable } from "../../types/balances";
import { cn } from "../../utils/cn";
import { getAccountName } from "../../utils/getAccountName";
import { hasValueLine } from "../../utils/hasValueLine";
import { isApplicableBalance } from "../../utils/isApplicableBalance";
import { isBigInt } from "../../utils/isBigInt";
import { shortenAddress } from "../../utils/shortenAddress";
import { sortBigInt } from "../../utils/sortBigInt";
import { usePortfolio } from "./PortfolioProvider";

const sortBalances = (a: BalanceWithStable, b: BalanceWithStable) => {
	if (isBigInt(a.tokenPlancks) && isBigInt(b.tokenPlancks))
		return sortBigInt(a.tokenPlancks, b.tokenPlancks, true);
	if (a.tokenPlancks && !b.tokenPlancks) return -1;
	if (!a.tokenPlancks && b.tokenPlancks) return 1;
	return 0;
};

export const TokenDetailsBalances: FC<{ token: Token }> = ({ token }) => {
	const { stableToken } = useRelayChains();
	const { accounts, balances, isLoading } = usePortfolio();
	const { open, close, isOpen } = useOpenClose();

	const rows = useMemo(
		() =>
			accounts
				.flatMap((account) => {
					const balance = balances.find(
						(b) => b.tokenId === token.id && b.address === account.address,
					);
					return balance && isApplicableBalance(balance)
						? [{ account, accountName: getAccountName(account), balance }]
						: [];
				})
				.sort((a, b) => sortBalances(a.balance, b.balance)),
		[accounts, balances, token.id],
	);

	return (
		<div>
			{rows.length ? (
				<div className="flex flex-col gap-1 text-sm">
					{rows.map(({ account, accountName, balance }) => (
						<div
							key={account.id}
							className={cn(
								"flex min-h-12 items-center gap-4 rounded-control bg-surface-2 px-3.5 py-2",
								!balance.tokenPlancks && "opacity-50",
							)}
						>
							<div className="flex grow items-center gap-2">
								<AccountIcon className="size-6" account={account} />
								<div className="grow">
									{accountName ?? shortenAddress(account.address)}
								</div>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-0.5">
								<div className="text-sm">
									{isBigInt(balance.tokenPlancks) ? (
										<Tokens
											token={token}
											plancks={balance.tokenPlancks}
											pulse={balance.isLoadingTokenPlancks}
										/>
									) : (
										<Shimmer>
											<Tokens token={token} plancks={0n} />
										</Shimmer>
									)}
								</div>

								{hasValueLine(token.id, stableToken.id, balance.tokenPlancks) &&
									(isBigInt(balance.stablePlancks) ||
										balance.isLoadingStablePlancks) && (
										<div className="text-xs text-muted">
											{isBigInt(balance.stablePlancks) ? (
												<StableValue
													stableToken={stableToken}
													plancks={balance.stablePlancks}
													pulse={balance.isLoadingStablePlancks}
												/>
											) : (
												<Shimmer
													className={isLoading ? "visible" : "invisible"}
												>
													<StableValue stableToken={stableToken} plancks={0n} />
												</Shimmer>
											)}
										</div>
									)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="my-4 rounded-control bg-surface-2 p-4 text-muted">
					<button
						type="button"
						onClick={open}
						className="font-medium text-text hover:text-accent"
					>
						Connect your accounts
					</button>{" "}
					to browse your balances.
				</div>
			)}
			<AccountSelectDrawer
				title={"Connect"}
				isOpen={isOpen}
				onDismiss={close}
				ownedOnly
			/>
		</div>
	);
};

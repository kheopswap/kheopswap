import { APP_FEE_ADDRESS, APP_FEE_PERCENT } from "@kheopswap/constants";
import type { Token } from "@kheopswap/registry";
import { getBalance$ } from "@kheopswap/services/balances";
import { isBigInt, loadableData } from "@kheopswap/utils";
import { combineLatest, of, switchMap } from "rxjs";
import { getExistentialDeposit$ } from "src/helpers/getExistentialDeposit";

const getSwapAppFee = (plancksIn: bigint) => {
	const appCommissionPercent =
		!!APP_FEE_ADDRESS && !!APP_FEE_PERCENT ? APP_FEE_PERCENT : 0;
	// fee = 0.3% of totalIn
	const appCommissionNum =
		plancksIn * BigInt(Number(appCommissionPercent * 10000).toFixed());
	return appCommissionNum / 1000000n;
};

export const getSwapAppFee$ = (tokenIn: Token, plancksIn: bigint) => {
	return combineLatest([
		getBalance$({ address: APP_FEE_ADDRESS, tokenId: tokenIn.id }),
		getExistentialDeposit$(tokenIn.id),
	]).pipe(
		switchMap(([treasuryBalance, existentialDeposit]) => {
			const commission = getSwapAppFee(plancksIn);

			if (treasuryBalance.balance)
				return of(
					loadableData(
						getSwapAppFee(plancksIn),
						treasuryBalance.status !== "loaded",
					),
				);

			// ASSUME TARGET ACCOUNT IS SUFFICIENT

			// if account has no token yet, need commission to be bigger than existentialDeposit, otherwise tx would revert
			const possibleCommission =
				isBigInt(existentialDeposit.data) &&
				commission >= existentialDeposit.data
					? commission
					: 0n;

			return of(
				loadableData(
					possibleCommission,
					treasuryBalance.status !== "loaded" || existentialDeposit.isLoading,
				),
			);
		}),
	);
};

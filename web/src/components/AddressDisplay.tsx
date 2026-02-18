import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { LinkIcon } from "@heroicons/react/24/solid";
import type { WalletAccount } from "@kheopskit/core";
import { useWallets } from "@kheopskit/react";
import { type FC, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { useCopyToClipboard } from "usehooks-ts";
import { isAddress as isEvmAddress } from "viem";
import { getAccountName } from "../util/getAccountName";
import { cn } from "../utils/cn";
import { logger } from "../utils/logger";
import { notifyError } from "../utils/notifyError";
import { shortenAddress } from "../utils/shortenAddress";
import { AccountIcon } from "./AccountIcon";
import { EthereumIdenticon } from "./EthereumIdenticon";
import { PolkadotIdenticon } from "./PolkadotIdenticon";
import { Pulse } from "./Pulse";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip/Tooltip";

const AddressAvatar: FC<{
	address: string;
	className?: string;
	account?: WalletAccount;
}> = ({ address, className, account }) => {
	const isEvm = useMemo(
		() => isEvmAddress(address, { strict: false }),
		[address],
	);

	return account ? (
		<AccountIcon account={account} className={className} />
	) : isEvm ? (
		<EthereumIdenticon address={address} className={className} />
	) : (
		<PolkadotIdenticon address={address} className={className} />
	);
};

export const AddressDisplay: FC<{
	address: string;
	url?: string | null;
	className?: string;
	iconClassName?: string;
	pulse?: boolean;
}> = ({ address, url, pulse, className, iconClassName }) => {
	const { accounts } = useWallets();
	const [, copyToClipboard] = useCopyToClipboard();

	const account = useMemo(
		() => accounts.find((a) => a.address === address),
		[accounts, address],
	);
	const accountName = useMemo(() => getAccountName(account), [account]);

	const handleCopyClick = useCallback(async () => {
		try {
			if (await copyToClipboard(address))
				toast.success("Address copied to clipboard");
			else toast.error("Failed to copy address");
		} catch (err) {
			logger.error("Failed to copy address", { err });
			notifyError("Failed to copy address");
		}
	}, [address, copyToClipboard]);

	return (
		<Pulse
			pulse={pulse}
			className={cn("inline-flex gap-1 items-center", className)}
		>
			<AddressAvatar
				address={address}
				account={account}
				className={cn("size-[1.4em]", iconClassName)}
			/>
			<Tooltip>
				<TooltipTrigger onClick={handleCopyClick}>
					{accountName || shortenAddress(address)}
				</TooltipTrigger>
				<TooltipContent>{address}</TooltipContent>
			</Tooltip>
			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className={iconClassName}
				>
					<LinkIcon />
				</a>
			) : (
				<button type="button" onClick={handleCopyClick}>
					<DocumentDuplicateIcon className={iconClassName} />
				</button>
			)}
		</Pulse>
	);
};

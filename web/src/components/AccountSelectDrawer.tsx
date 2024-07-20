import WalletIcon from "@w3f/polkadot-icons/keyline/Wallet";
import { getInjectedExtensions } from "polkadot-api/pjs-signer";
import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { Drawer } from "./Drawer";
import { DrawerContainer } from "./DrawerContainer";
import { InjectedAccountIcon } from "./InjectedAccountIcon";
import { ActionRightIcon } from "./icons";
import { Styles } from "./styles";

import { InjectedAccount, useInjectedExtension, useWallets } from "src/hooks";
import { cn, isValidAddress, sortWallets } from "src/util";

const ExtensionButton: FC<{
  name: string;
  isConnected: boolean;
  onClick: () => void;
}> = ({ name, isConnected, onClick }) => {
  const { extension, Icon } = useInjectedExtension(name);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border p-2 px-4 text-left",
        isConnected
          ? "border-green-700 hover:bg-green-500/10"
          : "hover:bg-white/10",
      )}
    >
      <div className="size-8 shrink-0">
        {Icon ? (
          <Icon className="size-5" />
        ) : (
          <WalletIcon className="stroke-current" />
        )}
      </div>
      <div className="grow text-left">{extension?.title ?? name}</div>
      <div
        className={cn(
          "size-2 rounded-full",
          isConnected ? "bg-success-500" : "bg-error-500",
        )}
      ></div>
    </button>
  );
};

const AccountButton: FC<{
  account: InjectedAccount;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ account, selected, disabled, onClick }) => {
  const { Icon } = useInjectedExtension(account.wallet);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        Styles.button,
        "flex w-full items-center gap-4   overflow-hidden p-2 pl-4  pr-3 ",
        selected && "ring-1 ring-neutral-500",
        "disabled:border-transparent disabled:opacity-100",
      )}
    >
      <InjectedAccountIcon account={account} className="size-8" />
      <div className="flex grow flex-col justify-center overflow-hidden">
        <div className="flex items-center gap-2 text-neutral-300">
          <div className="truncate">{account.name}</div>
          <div className="inline-block size-4 shrink-0">
            {Icon ? <Icon /> : <WalletIcon className="size-4 stroke-current" />}
          </div>
        </div>
        <div className="truncate text-xs text-neutral-500">
          {account.address}
        </div>
      </div>
      {!disabled && (
        <ActionRightIcon className="size-5 shrink-0 fill-current" />
      )}
    </button>
  );
};

const AddressInput: FC<{
  address: string;
  onChange: (address: string) => void;
}> = ({ address, onChange }) => {
  const [localAddress, setLocalAddress] = useState(address);

  const isValid = useMemo(() => isValidAddress(localAddress), [localAddress]);

  const handleClick = useCallback(() => {
    onChange(localAddress);
  }, [localAddress, onChange]);

  return (
    <div
      className={cn(
        "flex h-[42px] w-full items-center rounded-sm border border-neutral-500 bg-neutral-900 outline-1 focus-within:outline",
        localAddress && !isValid
          ? "border-error-500 outline-error-500"
          : "border-neutral-500 outline-neutral-500",
      )}
    >
      <input
        type="text"
        defaultValue={localAddress}
        onChange={(e) => setLocalAddress(e.target.value)}
        autoComplete="off"
        className="grow bg-transparent px-2 outline-none"
      />
      <div
        className={cn(
          "h-full bg-neutral-600 p-1",

          localAddress
            ? isValid
              ? "hover:bg-neutral-500"
              : "bg-error-500 opacity-50"
            : "bg-neutral-800",
        )}
      >
        <button
          type="button"
          onClick={handleClick}
          disabled={!isValid}
          className="h-full px-2"
        >
          <ActionRightIcon className="size-5 shrink-0 fill-current" />
        </button>
      </div>
    </div>
  );
};

const AccountSelectDrawerContent: FC<{
  title?: string;
  idOrAddress?: string | null;
  ownedOnly?: boolean;
  onClose: () => void;
  onChange?: (accountIdOrAddress: string) => void;
}> = ({ title, idOrAddress, ownedOnly, onClose, onChange }) => {
  const { accounts, connect, disconnect, connectedExtensions } = useWallets();

  const [injectedWallets, setInjectedWallets] = useState<string[]>([]);

  useEffect(() => {
    const wallets = getInjectedExtensions();
    setInjectedWallets(wallets?.sort(sortWallets) ?? []);
  }, []);

  const handleConnectWalletClick = useCallback(
    (wallet: string) => async () => {
      try {
        connectedExtensions.some((ext) => ext.name === wallet)
          ? await disconnect(wallet)
          : await connect(wallet);
      } catch (err) {
        console.error("Failed to connect %s", wallet, { err });
      }
    },
    [connect, connectedExtensions, disconnect],
  );

  const address = useMemo(() => {
    return idOrAddress && isValidAddress(idOrAddress) ? idOrAddress : "";
  }, [idOrAddress]);

  const handleClick = useCallback(
    (id: string) => () => {
      onChange?.(id);
    },
    [onChange],
  );

  return (
    <DrawerContainer
      title={title ?? (accounts.length ? "Select account" : "Connect wallet")}
      onClose={onClose}
    >
      {!ownedOnly && onChange && (
        <div>
          <h4 className="mb-1">Address</h4>
          <AddressInput address={address} onChange={onChange} />
        </div>
      )}
      <div>
        {!!injectedWallets?.length && (
          <>
            <h4 className="mb-1">Connected wallets</h4>
            <ul className="flex flex-col gap-2">
              {injectedWallets.map((wallet) => (
                <li key={wallet}>
                  <ExtensionButton
                    name={wallet}
                    isConnected={connectedExtensions.some(
                      (ext) => ext.name === wallet,
                    )}
                    onClick={handleConnectWalletClick(wallet)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        {!injectedWallets.length && (
          <div className="mb-1">No wallets found</div>
        )}
      </div>
      {!!accounts.length && (
        <div>
          <h4 className="mb-1">Connected Accounts</h4>
          <div className="flex flex-col gap-2">
            {accounts.map((account) => (
              <AccountButton
                key={account.id}
                account={account}
                selected={account.id === idOrAddress}
                onClick={handleClick(account.id)}
                disabled={!onChange}
              />
            ))}
          </div>
        </div>
      )}
    </DrawerContainer>
  );
};

export const AccountSelectDrawer: FC<{
  title?: string;
  isOpen: boolean;
  ownedOnly?: boolean;
  idOrAddress?: string | null | undefined;
  onDismiss: () => void;
  onChange?: (idOrAddress: string) => void;
}> = ({ title, isOpen, idOrAddress, ownedOnly, onChange, onDismiss }) => {
  return (
    <Drawer anchor="right" isOpen={isOpen} onDismiss={onDismiss}>
      <AccountSelectDrawerContent
        title={title}
        ownedOnly={ownedOnly}
        idOrAddress={idOrAddress}
        onClose={onDismiss}
        onChange={onChange}
      />
    </Drawer>
  );
};

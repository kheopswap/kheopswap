import { FC, useCallback, useMemo } from "react";

import { Styles } from "./styles";

import { TokenLogo, TokenSelectDrawer } from "src/components";
import { Token, TokenId } from "src/config/tokens";
import { useChainName, useOpenClose } from "src/hooks";
import { cn } from "src/util";

const TokenButton: FC<{
  tokenId: TokenId | null | undefined;
  tokens: Token[] | undefined;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}> = ({ tokenId, tokens, disabled, className, onClick }) => {
  const token = useMemo(
    () => tokens?.find((t) => t.id === tokenId),
    [tokenId, tokens],
  );
  const { shortName: chainName } = useChainName({ chainId: token?.chainId });

  return (
    <button
      type="button"
      className={cn(
        Styles.button,
        "flex h-14 w-40 max-w-[40%] items-center gap-3 px-3 py-2 ",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {token && <TokenLogo token={token} className="size-8" />}
      <div
        className={cn(
          "flex grow flex-col overflow-hidden text-left",
          !token && "text-center",
        )}
      >
        <div className="truncate">{token?.symbol ?? "Select Token"}</div>
        <div className="truncate text-xs text-neutral-400">{chainName}</div>
      </div>
    </button>
  );
};

export const TokenSelectButton: FC<{
  tokenId: TokenId | null | undefined;
  tokens: Token[] | undefined;
  isLoading: boolean;
  onChange: (tokenId: TokenId) => void;
  className?: string;
  disabled?: boolean;
}> = ({ tokenId, tokens, isLoading, className, disabled, onChange }) => {
  const { isOpen, open, close } = useOpenClose();

  const handleChange = useCallback(
    (tokenId: TokenId) => {
      onChange(tokenId);
      close();
    },
    [close, onChange],
  );

  return (
    <>
      <TokenButton
        tokenId={tokenId}
        tokens={tokens}
        isLoading={isLoading}
        disabled={disabled}
        className={className}
        onClick={open}
      />
      <TokenSelectDrawer
        isOpen={isOpen}
        tokens={tokens}
        isLoading={isLoading}
        tokenId={tokenId}
        onChange={handleChange}
        onDismiss={close}
      />
    </>
  );
};

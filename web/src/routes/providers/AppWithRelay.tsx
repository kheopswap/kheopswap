import { FC, PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

import { ChainInitNotification } from "src/components";
import { isChainIdRelay } from "src/config/chains";
import { ConnectDrawer } from "src/features/connect/ConnectDrawer";
import { ConnectDrawerProvider } from "src/features/connect/context";
import { RelayChainsProvider, WalletsProvider } from "src/hooks";

const RelayPathCheck: FC<PropsWithChildren> = ({ children }) => {
  const { relayId } = useParams();

  return isChainIdRelay(relayId) ? (
    <>{children}</>
  ) : (
    <Navigate to="/polkadot/swap" replace />
  );
};

export const AppWithRelay: FC = () => {
  return (
    <RelayPathCheck>
      <RelayChainsProvider>
        <WalletsProvider>
          <ConnectDrawerProvider>
            <Outlet />
            <ConnectDrawer />
          </ConnectDrawerProvider>
        </WalletsProvider>
        <ChainInitNotification />
      </RelayChainsProvider>
    </RelayPathCheck>
  );
};

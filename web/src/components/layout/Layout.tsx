import { FC, ReactNode } from "react";

import { Footer } from "./Footer";
import { Header } from "./Header/Header";
import { HorizontalNav } from "./HorizontalNav";

export const Layout: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex min-h-screen w-full grow sm:min-h-min">
        <div className="grow py-2 pb-4">
          <div className="container mx-auto max-w-2xl">
            <HorizontalNav />
            <div className="max-w-[100dvw] animate-fade-in">{children}</div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

import { Layout, PageContent } from "src/components";
import { Transfer } from "src/features/transfer";

export const TransferPage = () => (
  <Layout>
    <div className="p-2">
      <PageContent>
        <Transfer />
      </PageContent>
    </div>
  </Layout>
);

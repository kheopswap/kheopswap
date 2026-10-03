import { ErrorBoundary } from "../components/ErrorBoundary";
import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { TabTitle } from "../components/TabTitle";
import { Transfer } from "../features/transfer/Transfer";

export const TransferPage = () => (
	<Layout>
		<PageContent>
			<ErrorBoundary>
				<Transfer />
			</ErrorBoundary>
		</PageContent>
		<TabTitle title="Transfer" />
	</Layout>
);

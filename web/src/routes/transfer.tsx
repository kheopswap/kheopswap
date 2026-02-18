import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { TabTitle } from "../components/TabTitle";
import { Transfer } from "../features/transfer/Transfer";

export const TransferPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Transfer />
			</PageContent>
		</div>
		<TabTitle title="Transfer" />
	</Layout>
);

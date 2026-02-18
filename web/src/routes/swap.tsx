import { Layout } from "../components/layout/Layout";
import { PageContent } from "../components/layout/PageContent";
import { Swap } from "../features/swap/Swap";

export const SwapPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Swap />
			</PageContent>
		</div>
	</Layout>
);

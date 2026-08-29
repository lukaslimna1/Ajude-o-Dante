import { fetchContributions } from "./actions";
import ContributionsManager from "./contributions-manager";

export const dynamic = "force-dynamic";

export default async function DoacoesPage() {
  const { data: contributions } = await fetchContributions();

  return <ContributionsManager initialContributions={contributions} />;
}

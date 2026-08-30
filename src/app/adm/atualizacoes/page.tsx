import { getAdminTimelineEvents } from "../timeline-transparencia/actions";
import UpdatesManager from "./updates-manager";

export const dynamic = "force-dynamic";

export default async function AdminUpdatesPage() {
  const { events } = await getAdminTimelineEvents();
  return <UpdatesManager initialEvents={events} />;
}

import { getAdminTimelineEvents } from "./actions";
import TimelineManager from "./timeline-manager";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  const { events } = await getAdminTimelineEvents();

  return <TimelineManager initialEvents={events} />;
}

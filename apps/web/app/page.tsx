import { currentUserId } from "@project/auth";
import { getNearbyIncidentsForUserProfile, listActiveIncidents } from "@project/domain";
import { IncidentDashboard } from "../components/incident-dashboard";
import { resolveDashboardIncidents } from "../lib/home-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await currentUserId();
  const incidents = await resolveDashboardIncidents({
    userId,
    getNearby: async (id) => getNearbyIncidentsForUserProfile(id),
    getActive: listActiveIncidents,
  });

  return <IncidentDashboard incidents={incidents} userId={userId} />;
}
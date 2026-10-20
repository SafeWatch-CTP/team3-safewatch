export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DashboardIncidentLike = {
  id: string;
  title: string;
  severity: SeverityLevel | string;
  latitude: number;
  longitude: number;
  category?: string | null;
  address?: string | null;
  createdAt?: string | Date;
  status?: string;
};

export const fallbackDashboardIncidents: DashboardIncidentLike[] = [
  {
    id: "demo-1",
    title: "Downtown electrical issue",
    severity: "HIGH",
    latitude: 40.7128,
    longitude: -74.006,
    category: "CIVIL_UNREST",
    address: "Pearl St, downtown core",
    status: "ACTIVE",
    createdAt: new Date("2026-10-20T19:00:00Z"),
  },
  {
    id: "demo-2",
    title: "Harbor medical response",
    severity: "CRITICAL",
    latitude: 40.7282,
    longitude: -73.9942,
    category: "MEDICAL",
    address: "North harbor near Beacon Ave",
    status: "INVESTIGATING",
    createdAt: new Date("2026-10-20T19:10:00Z"),
  },
  {
    id: "demo-3",
    title: "Westside traffic obstruction",
    severity: "MEDIUM",
    latitude: 40.7411,
    longitude: -74.0036,
    category: "TRAFFIC_HAZARD",
    address: "West 12th and 7th corridor",
    status: "ACTIVE",
    createdAt: new Date("2026-10-20T18:45:00Z"),
  },
];

export function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

export function calculateMarkerPosition({ latitude, longitude }: Pick<DashboardIncidentLike, "latitude" | "longitude">) {
  const left = ((longitude + 180) / 360) * 100;
  const top = ((90 - latitude) / 180) * 100;

  return {
    left: clampPercentage(left),
    top: clampPercentage(top),
  };
}

export async function resolveDashboardIncidents<T extends DashboardIncidentLike>({
  userId,
  getNearby,
  getActive,
}: {
  userId: string;
  getNearby: (userId: string) => Promise<T[]>;
  getActive: () => Promise<T[]>;
}): Promise<T[]> {
  try {
    const nearby = await getNearby(userId);
    if (nearby?.length) {
      return nearby;
    }
  } catch {
    // Fall back to active incidents when nearby lookup fails.
  }

  try {
    const active = await getActive();
    if (active?.length) {
      return active;
    }
  } catch {
    // Render a local demo feed so the dashboard remains viewable when services are unavailable.
  }

  return fallbackDashboardIncidents as T[];
}

export function resolveSelectedIncidentId<T extends { id: string }>(incidents: T[], selectedId: string | null | undefined) {
  if (selectedId && incidents.some((incident) => incident.id === selectedId)) {
    return selectedId;
  }

  return incidents[0]?.id ?? null;
}

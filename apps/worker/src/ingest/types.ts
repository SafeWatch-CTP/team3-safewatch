import type { IncidentCategory, IncidentSeverity, IncidentStatus } from "@project/db";

export type HttpGet = (url: string, params?: Record<string, string | number>) => Promise<unknown>;

export interface IngestRecord {
  externalId: string;
  source: "nws" | "nyc311";
  title: string;
  description?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: Date;
}

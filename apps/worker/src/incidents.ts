import { prisma, IncidentCategory, IncidentSeverity } from "@project/db";
import { indexIncident } from "@project/redis";
import { log } from "@project/log";
import type { IngestRecord } from "./ingest/types";

/**
 * Saves a public-feed record keyed by externalId: creates it (and indexes its
 * coordinates) or updates the status of the existing row.
 */
export async function upsertIncident(rec: IngestRecord): Promise<"created" | "updated"> {
    const existing = await prisma.incident.findUnique({ where: { externalId: rec.externalId } });
    if (existing) {
        if (existing.status !== rec.status) {
            await prisma.incident.update({
                where: { id: existing.id },
                data: { status: rec.status, resolvedAt: rec.status === "RESOLVED" ? new Date() : null },
            });
        }
        return "updated";
    }
    const created = await prisma.incident.create({
        data: { ...rec, resolvedAt: rec.status === "RESOLVED" ? new Date() : null },
    });
    try {
        await indexIncident(created.id, created.latitude, created.longitude);
    } catch (err) {
        log.warn({ err: String(err), id: created.id }, "incident saved but coordinate indexing failed");
    }
    return "created";
}

/** Resolves a source's still-active incidents that the source no longer reports. */
export async function resolveMissing(source: string, currentExternalIds: string[]) {
    const { count } = await prisma.incident.updateMany({
        where: { source, status: "ACTIVE", externalId: { notIn: currentExternalIds } },
        data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return count;
}

/**
 * Persists a new incident to PostgreSQL and indexes its coordinates in Redis.
 * Called by the scanner when the CAD feed reports a new event.
 */
export async function createIncident(data : {
    title: string;
    category: IncidentCategory;
    severity: IncidentSeverity;
    longitude: number;
    latitude: number;
    address?: string;
    description?: string;
    externalId?: string;
    source?: string;
}) {
    const incident = await prisma.incident.create({ data });

    await indexIncident(incident.id, incident.latitude, incident.longitude);

    return incident;
}

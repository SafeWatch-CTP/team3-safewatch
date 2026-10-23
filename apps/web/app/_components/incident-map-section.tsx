// The map's surroundings, rendered on the server so the heading, summary,
// severity key and skip link are there before (and without) the map's
// JavaScript. Behavior: docs/specs/incidents/incident-map.md.
import { IncidentMap } from "./incident-map";
import { SEVERITY_ORDER, SEVERITY_PIN, mapSummary, type MapIncident } from "./incident-map-model";

const HEADING_ID = "incident-map-heading";
const HELP_ID = "incident-map-help";

export function IncidentMapSection({
  incidents,
  listId,
}: {
  incidents: MapIncident[];
  listId: string;
}) {
  return (
    // Not a <section>: the map container itself is the named region, and a
    // second landmark with the same name would only add noise.
    <div className="space-y-3">
      <h2 id={HEADING_ID} className="text-lg font-semibold">
        Incident map
      </h2>
      <p id={HELP_ID} className="text-sm text-neutral-700">
        {mapSummary(incidents.length)}
        {incidents.length > 0 && " Each pin opens its details; the list below has the same incidents."}{" "}
        Arrow keys pan the map, and plus and minus zoom.
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">Key:</span>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {SEVERITY_ORDER.map((severity) => {
            const { label, letter, color } = SEVERITY_PIN[severity];
            return (
              <li key={severity} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: color }}
                  className="inline-flex size-5 items-center justify-center rounded-full text-xs font-bold text-white"
                >
                  {letter}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      <a
        href={`#${listId}`}
        className="sr-only focus:not-sr-only focus:inline-block focus:rounded focus:bg-neutral-900 focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip map to incident list
      </a>

      <IncidentMap incidents={incidents} labelledBy={HEADING_ID} describedBy={HELP_ID} />
    </div>
  );
}

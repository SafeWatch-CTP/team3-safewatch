"use client";

// The street map itself. Browser-only (Leaflet touches window on import), so
// it is loaded through incident-map.tsx with ssr: false — never import this
// file from a server component. Behavior: docs/specs/incidents/incident-map.md.
import "leaflet/dist/leaflet.css";
import L, { type FitBoundsOptions, type Marker as LeafletMarker, type PopupEvent } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import {
  MAX_FIT_ZOOM,
  SEVERITY_PIN,
  categoryLabel,
  incidentAnchorId,
  initialView,
  pinName,
  type MapIncident,
} from "./incident-map-model";

// OSMF tile usage policy: light use only, attribution required. Production
// traffic needs a provider that permits it — swap this one constant.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PIN_SIZE = 28; // px: Leaflet positions icons in pixels
const FIT_OPTIONS: FitBoundsOptions = { padding: [32, 32], maxZoom: MAX_FIT_ZOOM };

// divIcon takes an HTML string, and titles come from external feeds.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Leaflet makes the icon element itself the button (role="button",
// tabindex="0"), so the name has to be text inside it. The letter is hidden
// so the name isn't read as "C Critical severity: …".
function pinIcon(incident: MapIncident): L.DivIcon {
  const { letter, color } = SEVERITY_PIN[incident.severity];
  return L.divIcon({
    className: "incident-pin",
    html:
      `<span class="incident-pin__dot" style="background-color:${color}" aria-hidden="true">${letter}</span>` +
      `<span class="incident-pin__name">${escapeHtml(pinName(incident))}</span>`,
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
    popupAnchor: [0, -PIN_SIZE / 2],
  });
}

// Focus goes back to the pin only if it was in the popup (or was dropped to
// <body> when the popup left the DOM), so a click elsewhere isn't overridden.
function returnFocusToPin(event: PopupEvent) {
  const active = document.activeElement;
  const popupElement = event.popup.getElement();
  if (!active || active === document.body || popupElement?.contains(active)) {
    (event.target as LeafletMarker).getElement()?.focus({ preventScroll: true });
  }
}

// Names the map's focusable container and fills two keyboard gaps Leaflet
// leaves: Escape only closes a popup while the container itself has focus,
// and Space does nothing on a pin.
function MapKeyboardAndName({ labelledBy, describedBy }: { labelledBy: string; describedBy: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-labelledby", labelledBy);
    container.setAttribute("aria-describedby", describedBy);

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") {
        map.closePopup();
      } else if (event.key === " " && target.classList.contains("incident-pin")) {
        event.preventDefault(); // Space would otherwise scroll the page
        target.click(); // same path as a pointer click, which toggles the popup
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [map, labelledBy, describedBy]);

  return null;
}

function PopupBody({ incident, isOpen }: { incident: MapIncident; isOpen: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Popup content stays mounted between opens, so focus follows the open
  // state rather than mounting.
  useEffect(() => {
    if (isOpen) titleRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  return (
    <div className="space-y-2 text-sm">
      <h3
        ref={titleRef}
        tabIndex={-1}
        className="incident-popup__title text-base font-semibold text-neutral-900"
      >
        {incident.title}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-neutral-700">
        <dt className="font-medium">Severity</dt>
        <dd>{SEVERITY_PIN[incident.severity].label}</dd>
        <dt className="font-medium">Category</dt>
        <dd>{categoryLabel(incident.category)}</dd>
        <dt className="font-medium">Address</dt>
        <dd>{incident.address ?? "Address unavailable"}</dd>
      </dl>
      <a href={`#${incidentAnchorId(incident.id)}`} className="font-medium text-blue-700 underline">
        Show in list
      </a>
    </div>
  );
}

export type IncidentMapProps = {
  incidents: MapIncident[];
  labelledBy: string;
  describedBy: string;
};

export function IncidentMapLeaflet({ incidents, labelledBy, describedBy }: IncidentMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);

  const view = useMemo(() => initialView(incidents), [incidents]);
  // A new icon object makes react-leaflet replace the pin's element, which
  // would drop focus from it on every popup open/close.
  const icons = useMemo(() => new Map(incidents.map((i) => [i.id, pinIcon(i)])), [incidents]);

  const viewProps =
    view.kind === "bounds"
      ? { bounds: view.bounds, boundsOptions: FIT_OPTIONS }
      : { center: view.center, zoom: view.zoom };

  return (
    <div className="space-y-2">
      <MapContainer
        {...viewProps}
        scrollWheelZoom={false}
        className="incident-map isolate h-80 w-full rounded-lg border border-neutral-300"
      >
        <MapKeyboardAndName labelledBy={labelledBy} describedBy={describedBy} />
        <TileLayer
          url={TILE_URL}
          attribution={ATTRIBUTION}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        {/* Added in feed order, so Tab visits pins in the same order as the list. */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={icons.get(incident.id)}
            eventHandlers={{
              popupopen: () => setOpenId(incident.id),
              popupclose: (event) => {
                setOpenId((current) => (current === incident.id ? null : current));
                returnFocusToPin(event);
              },
            }}
          >
            <Popup>
              <PopupBody incident={incident} isOpen={openId === incident.id} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Present from the first render so the message is announced when it appears. */}
      <p role="status" className="text-sm text-red-700">
        {tilesFailed
          ? "Map tiles couldn't load. The incident list below has the same information."
          : ""}
      </p>
    </div>
  );
}

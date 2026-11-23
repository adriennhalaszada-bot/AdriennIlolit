import { ExternalLink, Lock, MapPin } from "lucide-react";

interface ApproximateLocationMapProps {
  mode: "approximate" | "exact";
  latitude: number | null;
  longitude: number | null;
  label: string;
}

export function ApproximateLocationMap({
  mode,
  latitude,
  longitude,
  label,
}: ApproximateLocationMapProps) {
  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  // Wider bounding box for approximate mode so exact street/house cannot be inferred
  const delta = mode === "approximate" ? 0.018 : 0.003;
  const lat = hasCoords ? latitude! : 47.4979;
  const lng = hasCoords ? longitude! : 19.0402;
  const bbox = `${(lng - delta).toFixed(5)},${(lat - delta * 0.7).toFixed(5)},${(lng + delta).toFixed(5)},${(lat + delta * 0.7).toFixed(5)}`;
  const osmEmbedUrl =
    mode === "exact" && hasCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`
      : `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          {mode === "approximate" ? (
            <Lock className="h-4 w-4 text-emerald-700" />
          ) : (
            <MapPin className="h-4 w-4 text-emerald-700" />
          )}
          <span>
            {mode === "approximate"
              ? "Az ingatlan hozzávetőleges helye"
              : "Pontos megtekintési helyszín"}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>

      <div className="relative h-64 w-full bg-slate-100">
        <iframe
          title={mode === "approximate" ? "Hozzávetőleges térkép" : "Pontos megtekintési térkép"}
          src={osmEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
        />
        {mode === "approximate" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 rounded-full border-2 border-emerald-600/80 bg-emerald-500/15 shadow-inner" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500">
        {mode === "approximate" ? (
          <span>
            A pontos cím és házszám a hirdető által jóváhagyott megtekintés után válik láthatóvá.
          </span>
        ) : (
          <>
            <span>Jóváhagyott megtekintéshez tartozó pontos térképpont.</span>
            {hasCoords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
              >
                Útvonaltervezés
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

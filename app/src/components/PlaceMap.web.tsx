// 웹: Leaflet + OpenStreetMap
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { PlaceMapProps } from './PlaceMap.types';

function zoomFor(radius: number) {
  return radius <= 500 ? 16 : radius <= 1000 ? 15 : radius <= 2000 ? 14 : 13;
}

function Controller({ center, radius, focus, onPickLocation }: {
  center: PlaceMapProps['center'];
  radius: number;
  focus: { lat: number; lng: number } | null;
  onPickLocation: PlaceMapProps['onPickLocation'];
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoomFor(radius));
  }, [center.lat, center.lng, radius, map]);
  useEffect(() => {
    if (focus) map.panTo([focus.lat, focus.lng]);
  }, [focus?.lat, focus?.lng, map]); // eslint-disable-line react-hooks/exhaustive-deps
  useMapEvents({ click: (e) => onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function PlaceMap({ center, radius, places, focusId, theme, onSelect, onPickLocation }: PlaceMapProps) {
  const max = useMemo(() => Math.max(1, ...places.map((p) => p.score)), [places]);
  const focus = places.find((p) => p.id === focusId) ?? null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`.tiles-dark{filter:invert(1) hue-rotate(180deg) brightness(.85) contrast(.9)}
        .leaflet-container{font-family:inherit;background:${theme.bg}}`}</style>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoomFor(radius)}
        style={{ position: 'absolute', inset: 0 }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          className={theme.dark ? 'tiles-dark' : ''}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Controller center={center} radius={radius} focus={focus} onPickLocation={onPickLocation} />
        <Circle center={[center.lat, center.lng]} radius={radius} pathOptions={{ weight: 1, color: theme.accent, fillOpacity: 0.04 }} />
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 3, fillColor: theme.me, fillOpacity: 1 }}
        />
        {places.map((p) => {
          const active = p.id === focusId;
          return (
            <CircleMarker
              key={p.id + (active ? '-a' : '')}
              center={[p.lat, p.lng]}
              radius={5 + 7 * (p.score / max)}
              pathOptions={{
                color: active ? theme.ink : '#fff',
                weight: active ? 3 : 1.5,
                fillColor: theme.accent,
                fillOpacity: 0.35 + 0.6 * (p.score / max),
              }}
              bubblingMouseEvents={false}
              eventHandlers={{ click: () => onSelect(p.id) }}
            >
              <Tooltip permanent={active}>{`${p.name} · ${p.score}점`}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

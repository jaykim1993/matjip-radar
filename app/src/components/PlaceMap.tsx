// iOS/Android: react-native-maps (iOS는 Apple 지도, Android는 Google 지도)
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import type { PlaceMapProps } from './PlaceMap.types';

function regionFor(lat: number, lng: number, radius: number): Region {
  const d = (radius * 2.6) / 111320;
  return { latitude: lat, longitude: lng, latitudeDelta: d, longitudeDelta: d / Math.cos((lat * Math.PI) / 180) };
}

export default function PlaceMap({ center, radius, places, focusId, theme, onSelect, onPickLocation }: PlaceMapProps) {
  const ref = useRef<MapView>(null);
  const max = useMemo(() => Math.max(1, ...places.map((p) => p.score)), [places]);

  useEffect(() => {
    ref.current?.animateToRegion(regionFor(center.lat, center.lng, radius), 400);
  }, [center.lat, center.lng, radius]);

  useEffect(() => {
    const p = places.find((x) => x.id === focusId);
    if (p) ref.current?.animateCamera({ center: { latitude: p.lat, longitude: p.lng } }, { duration: 350 });
  }, [focusId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={regionFor(center.lat, center.lng, radius)}
      showsUserLocation
      showsMyLocationButton={false}
      onLongPress={(e) => onPickLocation({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
    >
      <Circle
        center={{ latitude: center.lat, longitude: center.lng }}
        radius={radius}
        strokeWidth={1}
        strokeColor={theme.accent}
        fillColor={theme.accent + '0f'}
      />
      {places.map((p) => {
        const s = 10 + 14 * (p.score / max);
        const active = p.id === focusId;
        return (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            description={`${p.cat} · 종합 ${p.score}점`}
            onPress={() => onSelect(p.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={active ? 999 : Math.round(p.score)}
          >
            <View
              style={{
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: theme.accent,
                opacity: 0.4 + 0.6 * (p.score / max),
                borderWidth: active ? 3 : 1.5,
                borderColor: active ? theme.ink : '#fff',
              }}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}

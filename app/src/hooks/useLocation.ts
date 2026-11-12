import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { LatLng } from '@/lib/types';

export type PosSource = 'gps' | 'manual' | 'default';
const DEFAULT_POS: LatLng = { lat: 37.5665, lng: 126.978 }; // 서울시청

export function useLocation() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [source, setSource] = useState<PosSource | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const fallback = useCallback((why: string) => {
    const how = Platform.OS === 'web' ? '지도를 클릭해' : '지도를 길게 눌러';
    setMessage(`${why} ${how} 기준 위치를 정할 수 있어요. 지금은 서울시청 기준이에요.`);
    setPos((p) => p ?? DEFAULT_POS);
    setSource((s) => s ?? 'default');
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return fallback('위치 권한이 꺼져 있어요.');
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPos({ lat: l.coords.latitude, lng: l.coords.longitude });
      setAccuracy(l.coords.accuracy ?? null);
      setSource('gps');
      setMessage(null);
    } catch {
      fallback('위치를 찾지 못했어요.');
    } finally {
      setLocating(false);
    }
  }, [fallback]);

  const setManual = useCallback((p: LatLng) => {
    setPos(p);
    setSource('manual');
    setAccuracy(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const label =
    source === 'gps'
      ? `현재 위치${accuracy ? ` (±${Math.round(accuracy)}m)` : ''} 기준`
      : source === 'manual'
        ? '지도에서 고른 위치 기준'
        : source === 'default'
          ? '서울시청 기준 (기본값)'
          : '위치를 확인하는 중…';

  return { pos, source, label, message, locating, locate, setManual };
}

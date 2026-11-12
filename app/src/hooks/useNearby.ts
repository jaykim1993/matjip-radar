import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMore, fetchPlaces } from '@/lib/api';
import type { LatLng, NearbyResponse, PlaceType } from '@/lib/types';

/** 주변 가게 목록. query가 있으면 키워드 검색 결과. loadMore로 최대 20곳씩 추가 */
export function useNearby(pos: LatLng | null, radius: number, type: PlaceType, query = '') {
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    if (!pos) return;
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setData(null); // 조건이 바뀌면 예전 목록을 남기지 않음
    fetchPlaces(pos, radius, type, query, ctrl.signal)
      .then((d) => id === reqId.current && setData(d))
      .catch((e: Error) => {
        if (e.name !== 'AbortError' && id === reqId.current) setError(e.message);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    return () => ctrl.abort();
  }, [pos?.lat, pos?.lng, radius, type, query, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!pos || loading || loadingMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    setError(null);
    fetchMore(pos, radius, type, query)
      .then((d) => id === reqId.current && setData(d))
      .catch((e: Error) => id === reqId.current && setError(e.message))
      .finally(() => id === reqId.current && setLoadingMore(false));
  }, [pos, radius, type, query, loading, loadingMore]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, loadingMore, error, reload, loadMore };
}

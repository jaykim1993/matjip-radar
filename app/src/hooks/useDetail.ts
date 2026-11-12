import { useEffect, useState } from 'react';
import { fetchDetail } from '@/lib/api';
import type { PlaceDetail } from '@/lib/types';

/** 펼친 가게의 상세(소개·리뷰·사진). id가 없으면 아무것도 불러오지 않음 */
export function useDetail(id: string | null) {
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    if (!id) return;
    let alive = true;
    fetchDetail(id)
      .then((d) => alive && setDetail(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  return { detail, error, loading: !!id && !detail && !error };
}

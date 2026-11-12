import type { LatLng, ShownPlace } from '@/lib/types';
import type { Theme } from '@/theme';

export type PlaceMapProps = {
  center: LatLng;
  radius: number;
  places: ShownPlace[];
  focusId: string | null;
  theme: Theme;
  onSelect: (id: string) => void;
  /** 웹: 클릭, 앱: 길게 누르기 */
  onPickLocation: (p: LatLng) => void;
};

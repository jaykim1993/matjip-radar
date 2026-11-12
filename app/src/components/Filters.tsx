import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaceType, PriceTier, SortKey } from '@/lib/types';
import type { Theme } from '@/theme';
import { PRICE_LABELS } from './PlaceCard';
import { Btn, Chip, Row } from './ui';

export const RADII = [500, 1000, 2000, 3000];
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: '종합점수' },
  { key: 'distance', label: '가까운 순' },
  { key: 'rating', label: '평점 순' },
  { key: 'reviews', label: '리뷰 많은 순' },
];

type Props = {
  theme: Theme;
  type: PlaceType;
  setType: (t: PlaceType) => void;
  radius: number;
  setRadius: (r: number) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  prices: Set<PriceTier>;
  togglePrice: (p: PriceTier) => void;
  openOnly: boolean;
  toggleOpen: () => void;
  cats: Set<string>;
  catCounts: [string, number][];
  total: number;
  toggleCat: (c: string | null) => void;
  onPick: () => void;
};

export function Filters(p: Props) {
  const t = p.theme;
  return (
    <View style={[s.wrap, { backgroundColor: t.surface, borderColor: t.line }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollRow}>
        <Chip label="음식점" active={p.type === 'food'} onPress={() => p.setType('food')} theme={t} />
        <Chip label="카페" active={p.type === 'cafe'} onPress={() => p.setType('cafe')} theme={t} />
        <Chip label="영업 중만" active={p.openOnly} onPress={p.toggleOpen} theme={t} />
        <Sep theme={t} />
        <Label text="반경" theme={t} />
        {RADII.map((r) => (
          <Chip key={r} label={r < 1000 ? `${r}m` : `${r / 1000}km`} active={p.radius === r} onPress={() => p.setRadius(r)} theme={t} />
        ))}
        <Sep theme={t} />
        <Label text="가격" theme={t} />
        {([1, 2, 3, 4] as PriceTier[]).map((v) => (
          <Chip key={v} label={PRICE_LABELS[v]} active={p.prices.has(v)} onPress={() => p.togglePrice(v)} theme={t} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollRow}>
        <Label text="정렬" theme={t} />
        {SORTS.map((x) => (
          <Chip key={x.key} label={x.label} active={p.sort === x.key} onPress={() => p.setSort(x.key)} theme={t} />
        ))}
      </ScrollView>

      {p.catCounts.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollRow}>
          <Chip label="전체" count={p.total} active={p.cats.size === 0} onPress={() => p.toggleCat(null)} theme={t} />
          {p.catCounts.map(([c, n]) => (
            <Chip key={c} label={c} count={n} active={p.cats.has(c)} onPress={() => p.toggleCat(c)} theme={t} />
          ))}
        </ScrollView>
      )}

      <View style={s.pick}>
        <Row>
          <View style={{ flex: 1, maxWidth: 480 }}>
            <Btn label="오늘 뭐 먹지?" onPress={p.onPick} theme={t} primary />
          </View>
        </Row>
      </View>
    </View>
  );
}

function Label({ text, theme }: { text: string; theme: Theme }) {
  return <Text style={{ fontSize: 12, color: theme.muted, marginLeft: 2 }}>{text}</Text>;
}
function Sep({ theme }: { theme: Theme }) {
  return <View style={{ width: 1, height: 18, backgroundColor: theme.line, marginHorizontal: 4 }} />;
}

const s = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingVertical: 8, gap: 6 },
  scrollRow: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  pick: { paddingHorizontal: 16, paddingTop: 2 },
});

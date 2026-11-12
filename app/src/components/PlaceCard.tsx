import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fmtDist, fmtNum, placeLinks } from '@/lib/places';
import type { PartKey, ShownPlace, Weights } from '@/lib/types';
import type { Theme } from '@/theme';
import { LinkText, Row } from './ui';

export const PARTS: { key: PartKey; label: string; color: (t: Theme) => string }[] = [
  { key: 'rating', label: '평점', color: (t) => t.rating },
  { key: 'popular', label: '리뷰 수', color: (t) => t.popular },
  { key: 'near', label: '거리', color: (t) => t.near },
];

export function ScoreBar({ p, weights, theme }: { p: ShownPlace; weights: Weights; theme: Theme }) {
  return (
    <View style={[s.bar, { backgroundColor: theme.line }]}>
      {PARTS.filter((x) => weights[x.key] > 0).map((x) => (
        <View key={x.key} style={{ width: `${weights[x.key] * p.parts[x.key] * 100}%`, backgroundColor: x.color(theme) }} />
      ))}
    </View>
  );
}

export const PRICE_LABELS: Record<number, string> = { 1: '1만원 미만', 2: '1만원대', 3: '2만원대', 4: '3만원 이상' };

export function Price({ tier, label, theme }: { tier: number | null; label: string | null; theme: Theme }) {
  const text = label ?? (tier != null ? PRICE_LABELS[tier] : null);
  return (
    <Text style={{ fontSize: 12.5, color: theme.muted }}>
      {text ? (
        <>
          1인 <Text style={{ color: theme.ink, fontWeight: '600' }}>{text}</Text>
        </>
      ) : (
        '가격 정보 없음'
      )}
    </Text>
  );
}

function PlaceCardBase({ p, rank, weights, active, expanded, theme, onPress, children }: {
  p: ShownPlace;
  rank: number;
  weights: Weights;
  active: boolean;
  expanded?: boolean;
  theme: Theme;
  onPress: (id: string) => void;
  /** 펼쳤을 때 아래에 붙는 상세 */
  children?: ReactNode;
}) {
  const sub = [p.typeLabel || p.cat, p.address].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => onPress(p.id)}
      accessibilityState={{ expanded: !!expanded }}
      style={[s.card, { backgroundColor: theme.surface, borderColor: active ? theme.accent : theme.line }]}
    >
      <View style={[s.score, { backgroundColor: theme.accentSoft }]}>
        <Text style={[s.scoreNum, { color: theme.ink }]}>{p.score}</Text>
        <Text style={{ fontSize: 10, color: theme.muted }}>점</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: theme.muted }}>
            {rank}위 · {fmtDist(p.dist)}
          </Text>
          <Text style={{ fontSize: 12, color: expanded ? theme.accent : theme.muted }}>{expanded ? '접기 ▴' : '자세히 ▾'}</Text>
        </View>
        <Text style={[s.name, { color: theme.ink }]} numberOfLines={2}>
          {p.name}
        </Text>
        <Text style={{ fontSize: 13, color: theme.muted, marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Text>
        <ScoreBar p={p} weights={weights} theme={theme} />
        <Row gap={12} wrap>
          <Text style={{ fontSize: 12.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
            <Text style={{ color: theme.popular }}>★</Text>{' '}
            <Text style={{ color: theme.ink, fontWeight: '700' }}>{p.rating != null ? p.rating.toFixed(1) : '–'}</Text>
            {'  '}리뷰 <Text style={{ color: theme.ink, fontWeight: '600' }}>{fmtNum(p.reviewCount)}</Text>
          </Text>
          {p.lowData && <Tag text="리뷰 적음" color={theme.muted} theme={theme} />}
          {p.outside && <Tag text="반경 밖" color={theme.muted} theme={theme} />}
          {p.openNow != null && (
            <Tag text={p.openNow ? '영업 중' : '영업 종료'} color={p.openNow ? theme.open : theme.closed} theme={theme} />
          )}
          <Price tier={p.price} label={p.priceLabel} theme={theme} />
        </Row>
        <Row gap={12} wrap>
          {placeLinks(p).map((l) => (
            <LinkText key={l.label} {...l} color={theme.accent} />
          ))}
        </Row>
        {expanded && children}
      </View>
    </Pressable>
  );
}

function Tag({ text, color, theme }: { text: string; color: string; theme: Theme }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
      <Text style={{ fontSize: 11.5, color, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export const PlaceCard = memo(PlaceCardBase);

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  score: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 24 },
  name: { fontSize: 16, fontWeight: '700', marginTop: 1 },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 6 },
});

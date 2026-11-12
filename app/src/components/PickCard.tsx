import { StyleSheet, Text, View } from 'react-native';
import { fmtDist, placeLinks } from '@/lib/places';
import type { ShownPlace } from '@/lib/types';
import type { Theme } from '@/theme';
import { Btn, LinkText, Row } from './ui';

export function PickCard({ p, theme, onAgain, onShow }: {
  p: ShownPlace;
  theme: Theme;
  onAgain: () => void;
  onShow: () => void;
}) {
  return (
    <View style={[s.box, { backgroundColor: theme.pickBg }]}>
      <Text style={[s.eyebrow, { color: theme.pickInk }]}>오늘은 여기 어때요</Text>
      <Text style={[s.name, { color: theme.pickInk }]}>{p.name}</Text>
      <Text style={{ color: theme.pickInk, opacity: 0.75, marginTop: 2 }}>
        {p.cat} · {fmtDist(p.dist)} · ★ {p.rating != null ? p.rating.toFixed(1) : '–'}{p.priceLabel ? ` · ${p.priceLabel}` : ''} · 종합 {p.score}점
      </Text>
      <View style={{ marginTop: 8 }}>
        <Row gap={12} wrap>
          {placeLinks(p).map((l) => (
            <LinkText key={l.label} {...l} color={theme.pickInk} />
          ))}
        </Row>
      </View>
      <View style={{ marginTop: 12 }}>
        <Row gap={8} wrap>
          <Btn label="다시 뽑기" onPress={onAgain} theme={theme} primary invert />
          <Btn label="지도에서 보기" onPress={onShow} theme={theme} invert />
        </Row>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: 12, padding: 16, marginBottom: 12 },
  eyebrow: { fontSize: 13, fontWeight: '800', opacity: 0.7, letterSpacing: 0.6 },
  name: { fontSize: 22, fontWeight: '800', marginTop: 4 },
});

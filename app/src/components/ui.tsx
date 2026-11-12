import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '@/theme';

export function Chip({ label, count, active, onPress, theme }: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        s.chip,
        { borderColor: active ? theme.accent : theme.line, backgroundColor: active ? theme.accentSoft : theme.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ color: theme.ink, fontSize: 13, fontWeight: active ? '700' : '400' }}>
        {label}
        {count != null && <Text style={{ color: theme.muted, fontSize: 12 }}> {count}</Text>}
      </Text>
    </Pressable>
  );
}

export function Btn({ label, onPress, theme, primary, invert }: {
  label: string;
  onPress: () => void;
  theme: Theme;
  primary?: boolean;
  /** 어두운 배경(추천 카드) 위 버튼 */
  invert?: boolean;
}) {
  const bg = primary ? (invert ? theme.pickInk : theme.accent) : 'transparent';
  const fg = primary ? (invert ? theme.pickBg : theme.accentInk) : invert ? theme.pickInk : theme.ink;
  const border = primary ? bg : invert ? theme.pickInk + '66' : theme.line;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: border }, pressed && { opacity: 0.75 }]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function LinkText({ label, url, color }: { label: string; url: string; color: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" hitSlop={6}>
      <Text style={{ color, fontWeight: '700', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = 6, wrap }: { children: ReactNode; gap?: number; wrap?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }}>{children}</View>;
}

const s = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  btn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
});

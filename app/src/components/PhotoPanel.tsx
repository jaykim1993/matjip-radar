import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { photoUrl } from '@/lib/api';
import type { PlaceDetail } from '@/lib/types';
import type { Theme } from '@/theme';

/** 넓은 화면: 카드를 펼치면 왼쪽(지도 영역)에 사진을 크게 보여줌 */
export function PhotoPanel({ name, detail, loading, theme, onClose }: {
  name: string;
  detail: PlaceDetail | null;
  loading: boolean;
  theme: Theme;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [detail?.id]);
  const photos = detail?.photos ?? [];
  const cur = photos[i];

  return (
    <View style={[StyleSheet.absoluteFill, s.wrap, { backgroundColor: theme.bg }]}>
      <View style={s.head}>
        <Text style={{ color: theme.ink, fontSize: 17, fontWeight: '800', flex: 1 }} numberOfLines={1}>
          {name}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [s.close, { borderColor: theme.line, backgroundColor: theme.surface }, pressed && { opacity: 0.7 }]}
        >
          <Text style={{ color: theme.ink, fontSize: 13 }}>지도 보기</Text>
        </Pressable>
      </View>

      <View style={[s.main, { backgroundColor: theme.line }]}>
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : cur ? (
          <Image source={{ uri: photoUrl(cur.name, 1200) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={{ color: theme.muted }}>등록된 사진이 없어요</Text>
        )}
      </View>

      {photos.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((ph, k) => (
              <Pressable key={ph.name} onPress={() => setI(k)} accessibilityLabel={`사진 ${k + 1}`}>
                <Image
                  source={{ uri: photoUrl(ph.name, 400) }}
                  style={[s.thumb, { borderColor: k === i ? theme.accent : 'transparent', backgroundColor: theme.line }]}
                />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={{ color: theme.muted, fontSize: 11.5 }}>
            사진 {cur?.author || '작성자 미상'} · Google 지도
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 10, zIndex: 1000 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  main: { flex: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 84, height: 84, borderRadius: 8, borderWidth: 3 },
});

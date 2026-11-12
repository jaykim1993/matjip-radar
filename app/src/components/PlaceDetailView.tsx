import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { photoUrl } from '@/lib/api';
import type { PlaceDetail } from '@/lib/types';
import type { Theme } from '@/theme';

/** 카드를 펼쳤을 때: 왼쪽 정사각형 사진 + 오른쪽 요약·영업시간·리뷰 */
export function PlaceDetailView({ detail, loading, error, theme, photoSize = 112 }: {
  detail: PlaceDetail | null;
  loading: boolean;
  error: string | null;
  theme: Theme;
  photoSize?: number;
}) {
  if (loading) {
    return (
      <View style={[s.wrap, { borderColor: theme.line, alignItems: 'center' }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (error || !detail) {
    return (
      <View style={[s.wrap, { borderColor: theme.line }]}>
        <Text style={{ color: theme.muted, fontSize: 13 }}>{error || '상세 정보가 없어요.'}</Text>
      </View>
    );
  }
  return (
    <View style={[s.wrap, { borderColor: theme.line }]}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <CardPhoto detail={detail} theme={theme} size={photoSize} />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          {detail.summary && <Text style={{ color: theme.ink, fontSize: 14, lineHeight: 20 }}>{detail.summary}</Text>}
          {detail.todayHours && <Info label="영업" value={detail.todayHours.replace(/^[^:]+:\s*/, '오늘 ')} theme={theme} />}
          {detail.phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${detail.phone}`)}>
              <Info label="전화" value={detail.phone} theme={theme} />
            </Pressable>
          )}
          {detail.reviews.length > 0 && (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: theme.muted, fontWeight: '700', letterSpacing: 0.3 }}>Google 리뷰</Text>
              {detail.reviews.slice(0, 2).map((r, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Text style={{ fontSize: 13.5, color: theme.ink, lineHeight: 19 }} numberOfLines={3}>
                    {r.text}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted }}>
                    {r.rating != null ? `★${r.rating} · ` : ''}
                    {r.author} · {r.when}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Info({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <Text style={{ fontSize: 13, color: theme.muted }}>
      {label} <Text style={{ color: theme.ink }}>{value}</Text>
    </Text>
  );
}

/** 카드 안 왼쪽 정사각형 사진. 누르면 다음 사진 */
function CardPhoto({ detail, theme, size }: { detail: PlaceDetail; theme: Theme; size: number }) {
  const [i, setI] = useState(0);
  const photos = detail.photos;
  if (!photos.length) {
    return (
      <View style={[s.photo, { width: size, height: size, backgroundColor: theme.line, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: theme.muted, fontSize: 12 }}>사진 없음</Text>
      </View>
    );
  }
  const ph = photos[i % photos.length];
  return (
    <Pressable onPress={() => setI((n) => n + 1)} accessibilityLabel="다음 사진">
      <Image
        source={{ uri: photoUrl(ph.name, 400) }}
        style={[s.photo, { width: size, height: size, backgroundColor: theme.line }]}
        resizeMode="cover"
      />
      <Text style={{ fontSize: 10, color: theme.muted, marginTop: 3, width: size }} numberOfLines={1}>
        {photos.length > 1 ? `${(i % photos.length) + 1}/${photos.length} · ` : ''}
        {ph.author ? `사진 ${ph.author}` : 'Google'}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  photo: { borderRadius: 10 },
});

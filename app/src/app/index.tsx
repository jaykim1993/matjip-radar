import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filters } from '@/components/Filters';
import { PickCard } from '@/components/PickCard';
import { PlaceDetailView } from '@/components/PlaceDetailView';
import { SearchBar } from '@/components/SearchBar';
import { useDetail } from '@/hooks/useDetail';
import { PARTS, PlaceCard } from '@/components/PlaceCard';
import PlaceMap from '@/components/PlaceMap';
import { useLocation } from '@/hooks/useLocation';
import { useNearby } from '@/hooks/useNearby';
import { categoryCounts, filterAndSort, weightedPick } from '@/lib/places';
import type { LatLng, PlaceType, PriceTier, ShownPlace, SortKey } from '@/lib/types';
import { useTheme } from '@/theme';

const WIDE = 900;

export default function Home() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE;

  const loc = useLocation();
  const [type, setTypeRaw] = useState<PlaceType>('food');
  const [radius, setRadius] = useState(1000);
  const [sort, setSort] = useState<SortKey>('score');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Set<PriceTier>>(new Set());
  const [openOnly, setOpenOnly] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pickId, setPickId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ShownPlace>>(null);

  const { data, loading, loadingMore, error, reload, loadMore } = useNearby(loc.pos, radius, type, query);
  const detailState = useDetail(expandedId);

  const shown = useMemo(
    () => (data && loc.pos ? filterAndSort(data.places, loc.pos, cats, prices, sort, openOnly) : []),
    [data, loc.pos, cats, prices, sort, openOnly]
  );
  const catCounts = useMemo(() => (data ? categoryCounts(data.places) : []), [data]);
  const picked = pickId ? shown.find((p) => p.id === pickId) ?? null : null;

  // 카드 누르기: 펼치기/접기 + 지도 이동
  const toggleExpand = useCallback((id: string) => {
    setFocusId(id);
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const search = (q: string) => {
    setQuery(q);
    setCats(new Set());
    setPickId(null);
    setExpandedId(null);
  };

  const setType = (v: PlaceType) => {
    setTypeRaw(v);
    setCats(new Set());
    setPickId(null);
  };
  const togglePrice = (v: PriceTier) =>
    setPrices((s) => {
      const n = new Set(s);
      n.has(v) ? n.delete(v) : n.add(v);
      return n;
    });
  const toggleCat = (c: string | null) =>
    setCats((s) => {
      if (c == null) return new Set();
      const n = new Set(s);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });

  const scrollTo = useCallback(
    (id: string) => {
      const i = shown.findIndex((p) => p.id === id);
      if (i >= 0) listRef.current?.scrollToIndex({ index: i, viewPosition: 0.3, animated: true });
    },
    [shown]
  );

  const onSelectMarker = useCallback(
    (id: string) => {
      setFocusId(id);
      setExpandedId(id);
      scrollTo(id);
    },
    [scrollTo]
  );

  const pick = () => {
    const p = weightedPick(shown, pickId);
    setPickId(p?.id ?? null);
    if (p) setFocusId(p.id);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const onPickLocation = useCallback((p: LatLng) => loc.setManual(p), [loc.setManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      {loc.message && notice(loc.message)}
      {error && data && notice(error)}
      {data?.mode === 'demo' &&
        notice('서버에 Google API 키가 없어 데모 데이터를 보여주고 있어요. 가게 이름과 수치는 모두 가짜예요.')}
      {picked && (
        <PickCard
          p={picked}
          theme={t}
          onAgain={pick}
          onShow={() => {
            setFocusId(picked.id);
            scrollTo(picked.id);
          }}
        />
      )}
      {data && (
        <View style={s.meta}>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {data.query ? `“${data.query}” 검색 결과 ` : ''}
            {shown.length}곳 ·{' '}
            {data.mode === 'demo'
              ? '데모'
              : `기준 ${new Date(data.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
          <View style={s.legend}>
            {PARTS.filter((x) => data.weights[x.key] > 0).map((x) => (
              <View key={x.key} style={s.legendItem}>
                <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: x.color(t) }} />
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {x.label} {Math.round(data.weights[x.key] * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  function notice(text: string) {
    return (
      <View style={[s.notice, { backgroundColor: t.warnBg }]}>
        <Text style={{ color: t.warnInk, fontSize: 13, lineHeight: 19 }}>{text}</Text>
      </View>
    );
  }

  const empty = loading || !loc.pos ? (
    <View style={s.empty}>
      <ActivityIndicator color={t.accent} />
      <Text style={{ color: t.muted, marginTop: 8, textAlign: 'center' }}>
        {loc.pos ? '주변 가게를 찾는 중…' : '위치를 확인하는 중…'}
      </Text>
    </View>
  ) : error ? (
    <View style={s.empty}>
      <Text style={{ color: t.ink, textAlign: 'center' }}>{error}</Text>
      <Pressable onPress={reload} style={{ marginTop: 10 }}>
        <Text style={{ color: t.accent, fontWeight: '700' }}>다시 시도</Text>
      </Pressable>
    </View>
  ) : (
    <Text style={[s.empty, { color: t.muted, textAlign: 'center' }]}>
      조건에 맞는 곳이 없어요. 필터를 줄이거나 반경을 넓혀 보세요.
    </Text>
  );

  const list = (
    <FlatList
      ref={listRef}
      data={loading ? [] : shown}
      keyExtractor={(p) => p.id}
      extraData={[expandedId, detailState, focusId, wide]}
      renderItem={({ item, index }) => (
        <PlaceCard
          p={item}
          rank={index + 1}
          weights={data!.weights}
          active={item.id === focusId}
          expanded={item.id === expandedId}
          theme={t}
          onPress={toggleExpand}
        >
          {item.id === expandedId && (
            <PlaceDetailView
              detail={detailState.detail}
              loading={detailState.loading}
              error={detailState.error}
              theme={t}
              photoSize={wide ? 160 : 112}
            />
          )}
        </PlaceCard>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        data?.hasMore && !loading ? (
          <View style={{ paddingTop: 14, alignItems: 'center' }}>
            {loadingMore ? (
              <ActivityIndicator color={t.accent} />
            ) : (
              <Pressable
                onPress={loadMore}
                accessibilityRole="button"
                style={({ pressed }) => [s.more, { borderColor: t.line, backgroundColor: t.surface }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ color: t.ink, fontWeight: '700' }}>더 불러오기</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>최대 20곳 추가</Text>
              </Pressable>
            )}
          </View>
        ) : undefined
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * 150, animated: true })}
      style={{ flex: 1 }}
    />
  );

  const map = loc.pos ? (
    <PlaceMap
      center={loc.pos}
      radius={radius}
      places={shown}
      focusId={focusId}
      theme={t}
      onSelect={onSelectMarker}
      onPickLocation={onPickLocation}
    />
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <View style={[s.header, { backgroundColor: t.surface, borderColor: t.line }]}>
        <Text style={[s.brand, { color: t.ink }]}>동네맛집 레이더</Text>
        <View style={s.where}>
          <Text style={{ color: t.muted, fontSize: 12.5, flexShrink: 1 }} numberOfLines={1}>
            {loc.label}
          </Text>
          <Pressable
            onPress={loc.locate}
            disabled={loc.locating}
            style={[s.locBtn, { borderColor: t.line }]}
            accessibilityRole="button"
          >
            <Text style={{ color: t.ink, fontSize: 12.5 }}>{loc.locating ? '찾는 중…' : '내 위치'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10, backgroundColor: t.surface }}>
        <SearchBar query={query} onSubmit={search} theme={t} />
      </View>

      <Filters
        theme={t}
        type={type}
        setType={setType}
        radius={radius}
        setRadius={setRadius}
        sort={sort}
        setSort={setSort}
        prices={prices}
        togglePrice={togglePrice}
        openOnly={openOnly}
        toggleOpen={() => setOpenOnly((v) => !v)}
        cats={cats}
        catCounts={catCounts}
        total={data?.places.length ?? 0}
        toggleCat={toggleCat}
        onPick={pick}
      />

      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1.1, borderRightWidth: 1, borderColor: t.line }}>{map}</View>
          <View style={{ flex: 1 }}>{list}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ height: Math.round(height * 0.34), borderBottomWidth: 1, borderColor: t.line }}>{map}</View>
          {list}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brand: { fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  where: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 },
  locBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  notice: { borderRadius: 10, padding: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  legend: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  more: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, alignItems: 'center', gap: 2 },
});

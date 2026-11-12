import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Theme } from '@/theme';

/** 키워드 검색 ("곱창", "파스타" …). 엔터/검색 버튼으로 실행, ✕로 주변 목록 복귀 */
export function SearchBar({ query, onSubmit, theme }: { query: string; onSubmit: (q: string) => void; theme: Theme }) {
  const [text, setText] = useState(query);
  useEffect(() => setText(query), [query]);

  const submit = () => onSubmit(text.trim());
  const clear = () => {
    setText('');
    onSubmit('');
  };

  return (
    <View style={[s.wrap, { borderColor: theme.line, backgroundColor: theme.bg }]}>
      <Text style={{ color: theme.muted, fontSize: 15 }} accessibilityElementsHidden>
        ⌕
      </Text>
      <TextInput
        nativeID="search"
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder="메뉴나 가게 이름 검색 (예: 곱창, 파스타)"
        placeholderTextColor={theme.muted}
        returnKeyType="search"
        style={[s.input, { color: theme.ink }]}
        accessibilityLabel="맛집 검색"
      />
      {(text.length > 0 || query.length > 0) && (
        <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="검색 지우기">
          <Text style={{ color: theme.muted, fontSize: 15, paddingHorizontal: 4 }}>✕</Text>
        </Pressable>
      )}
      <Pressable
        onPress={submit}
        accessibilityRole="button"
        style={({ pressed }) => [s.go, { backgroundColor: theme.ink }, pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: theme.bg, fontWeight: '700', fontSize: 13 }}>검색</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 4,
    height: 40,
  },
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 0, outlineStyle: 'none' } as object,
  go: { borderRadius: 999, paddingHorizontal: 14, height: 32, justifyContent: 'center' },
});

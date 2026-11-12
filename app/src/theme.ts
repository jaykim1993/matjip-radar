import { useColorScheme } from 'react-native';

const light = {
  bg: '#f3f5f2',
  surface: '#ffffff',
  ink: '#17201c',
  muted: '#5b6862',
  line: '#dfe4e0',
  accent: '#0d7a58',
  accentInk: '#ffffff',
  accentSoft: '#e1f1ea',
  rating: '#0d7a58',
  popular: '#e09b12',
  open: '#1f8f4e',
  closed: '#b4442f',
  near: '#9aa6a0',
  warnBg: '#fff4dc',
  warnInk: '#7a5200',
  pickBg: '#17201c',
  pickInk: '#f3f5f2',
  me: '#2f6bff',
};

const dark: typeof light = {
  bg: '#101513',
  surface: '#18201c',
  ink: '#e8eee9',
  muted: '#9aa8a1',
  line: '#2a3530',
  accent: '#35b98a',
  accentInk: '#06140e',
  accentSoft: '#16352a',
  rating: '#35b98a',
  popular: '#f0b43a',
  open: '#4cc57f',
  closed: '#ef7a63',
  near: '#5e6b65',
  warnBg: '#3a2e12',
  warnInk: '#f3d58e',
  pickBg: '#e8eee9',
  pickInk: '#101513',
  me: '#6f9bff',
};

export type Theme = typeof light & { dark: boolean };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? { ...dark, dark: true } : { ...light, dark: false };
}

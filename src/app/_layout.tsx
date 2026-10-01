import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ConvexProvider } from 'convex/react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { convex, useAccount, useDeviceId } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Fonts load once per launch, so holding the tree here never remounts navigation later.
  if (!fontsLoaded) return null;

  return (
    <ConvexProvider client={convex}>
      <AppNavigator />
    </ConvexProvider>
  );
}

function AppNavigator() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const deviceId = useDeviceId();
  const account = useAccount();
  // The native splash covers the first load, so a returning user never sees the welcome screen.
  // Later loads (e.g. right after "Get Started") keep the navigator mounted.
  const loading = deviceId !== null && account === undefined;
  const onboarded = account?.onboarded ?? false;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: theme.primary,
          background: theme.background,
          card: theme.background,
          text: theme.text,
          border: theme.border,
        },
      }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text, fontFamily: Fonts.bold, fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: '' }} />
          <Stack.Screen name="first-salary" options={{ title: '' }} />
        </Stack.Protected>

        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ title: 'Salary history' }} />
          <Stack.Screen name="budgets" options={{ title: 'Budgets' }} />
          <Stack.Screen name="cycle/[id]" options={{ title: '' }} />
          <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="salary" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal', title: 'Profile' }} />
        </Stack.Protected>

        <Stack.Screen name="currency" options={{ presentation: 'modal', title: 'Currency' }} />
      </Stack>
    </ThemeProvider>
  );
}

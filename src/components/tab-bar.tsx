import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { requirePro } from '@/lib/subscription';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: Icons.home },
  transactions: { label: 'Activity', icon: Icons.receipt },
  insights: { label: 'Insights', icon: Icons.insights },
  settings: { label: 'Settings', icon: Icons.settings },
};

/** Floating rounded tab bar with a raised center "add expense" button. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const routes = state.routes.filter((r) => TABS[r.name]);
  const half = Math.ceil(routes.length / 2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const tab = TABS[route.name];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}>
        <Icon name={tab.icon} size={21} color={focused ? theme.text : theme.textTertiary} />
        <Text
          style={[
            styles.label,
            { color: focused ? theme.text : theme.textTertiary, fontFamily: focused ? Fonts.bold : Fonts.medium },
          ]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - 6, Spacing.two) }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.tabBar,
            borderColor: theme.border,
            boxShadow: dark ? undefined : `0 10px 30px ${theme.shadow}, 0 2px 6px ${theme.shadow}`,
          },
        ]}>
        {routes.slice(0, half).map(renderTab)}
        <View style={styles.fabSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            accessibilityHint="Long press to add by voice"
            delayLongPress={350}
            onLongPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push('/assistant');
            }}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (requirePro()) router.push('/expense');
            }}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: theme.primary,
                boxShadow: `0 8px 20px ${theme.primary}66`,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Icon name={Icons.add} size={24} color={theme.onPrimary} />
          </Pressable>
        </View>
        {routes.slice(half).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.gutter,
  },
  bar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: '100%',
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  fabSlot: {
    width: 72,
    alignItems: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
});

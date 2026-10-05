import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { DynamicColorIOS, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openAddExpense } from '@/lib/limits';
import { useIsPro } from '@/lib/subscription';

// Show the plans once per app launch to users without Pro.
let paywallShown = false;

/** iOS 26 draws the tab bar in Liquid Glass and supports a bottom accessory above it. */
const LIQUID_GLASS = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

const tint =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: Colors.light.primaryInk, dark: Colors.dark.primary })
    : undefined;

function addExpense() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  openAddExpense();
}

function addByVoice() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push('/assistant');
}

export default function TabsLayout() {
  const theme = useTheme();
  const isPro = useIsPro();

  useEffect(() => {
    if (isPro === false && !paywallShown) {
      // Let the tabs mount first so closing the paywall lands on Home.
      const t = setTimeout(() => {
        paywallShown = true;
        router.push('/paywall');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isPro]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NativeTabs
        tintColor={tint ?? theme.primary}
        labelStyle={{ ...Fonts.semibold, fontSize: 10 }}
        minimizeBehavior="onScrollDown">
        {LIQUID_GLASS && (
          <NativeTabs.BottomAccessory>
            <AddAccessory />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="transactions">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
            md="receipt_long"
          />
          <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="insights">
          <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
          <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      {!LIQUID_GLASS && <AddButton />}
    </View>
  );
}

/** Glass accessory above the tab bar (iOS 26+): add an expense, or hold a conversation with the AI. */
function AddAccessory() {
  const theme = useTheme();
  const inline = NativeTabs.BottomAccessory.usePlacement() === 'inline';

  return (
    <View style={styles.accessory}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        onPress={addExpense}
        style={({ pressed }) => [styles.accessoryMain, pressed && { opacity: 0.6 }]}>
        <View style={[styles.plus, { backgroundColor: theme.primary }]}>
          <Icon name={Icons.add} size={13} color={theme.onPrimary} />
        </View>
        <Text variant="label" numberOfLines={1} style={{ ...Fonts.bold }}>
          {inline ? 'Add' : 'Add expense'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add by voice"
        onPress={addByVoice}
        hitSlop={8}
        style={({ pressed }) => [styles.voice, { opacity: pressed ? 0.6 : 1 }]}>
        <Icon name={Icons.mic} size={15} color={theme.text} />
        {!inline && (
          <Text variant="caption" style={{ ...Fonts.semibold }}>
            Voice
          </Text>
        )}
      </Pressable>
    </View>
  );
}

/** Floating add button for Android and iOS before 26, where the bottom accessory isn't available. */
function AddButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add expense"
      accessibilityHint="Long press to add by voice"
      delayLongPress={350}
      onPress={addExpense}
      onLongPress={addByVoice}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: insets.bottom + (Platform.OS === 'android' ? 92 : 64),
          backgroundColor: theme.primary,
          boxShadow: `0 ${pressed ? 1 : 4}px 0 ${theme.primaryDeep}`,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
      ]}>
      <Icon name={Icons.add} size={24} color={theme.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accessory: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  accessoryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: '100%',
  },
  plus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: Radius.pill,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

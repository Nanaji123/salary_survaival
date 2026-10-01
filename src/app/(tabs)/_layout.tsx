import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';

import { TabBar } from '@/components/tab-bar';
import { ensurePermissionsOnLaunch } from '@/lib/permissions';
import { useIsPro } from '@/lib/subscription';

// Show the plans once per app launch to users without Pro.
let paywallShown = false;

export default function TabsLayout() {
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

  // Ask for microphone and notification access when the app opens, if not already decided.
  useEffect(() => {
    const t = setTimeout(() => ensurePermissionsOnLaunch(), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

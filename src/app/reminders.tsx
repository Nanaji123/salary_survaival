import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { HeaderTextButton } from '@/components/header-button';
import { Card } from '@/components/ui/card';
import { EmojiImage } from '@/components/ui/emoji';
import { Chip, FormScroll } from '@/components/ui/form';
import { Text } from '@/components/ui/text';
import type { EmojiName } from '@/constants/emoji';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatHour, REMINDER_HOURS, updateReminders, useReminderSettings } from '@/lib/reminders';

/** Turns the daily log nudge and payday reminders on or off. */
export default function RemindersScreen() {
  const settings = useReminderSettings();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reminders',
          headerLeft: () => <HeaderTextButton title="Done" bold onPress={() => router.back()} />,
        }}
      />
      <FormScroll>
        <View style={styles.hero}>
          <EmojiImage name="alarm" size={72} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Never break your streak
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            A gentle nudge when it matters. Reminders are scheduled on your phone, and you can turn them off any time.
          </Text>
        </View>

        <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
          <ReminderToggle
            emoji="fire"
            title="Daily log reminder"
            body="Skipped on days you’ve already logged."
            value={settings.daily}
            onChange={(daily) => updateReminders({ daily })}
          />
          {settings.daily && (
            <View style={{ gap: Spacing.two }}>
              <Text variant="overline" color="textSecondary">
                Remind me at
              </Text>
              <View style={styles.chips}>
                {REMINDER_HOURS.map((hour) => (
                  <Chip
                    key={hour}
                    label={formatHour(hour)}
                    selected={settings.hour === hour}
                    onPress={() => updateReminders({ hour })}
                  />
                ))}
              </View>
            </View>
          )}
        </Card>

        <Card style={{ padding: Spacing.three }}>
          <ReminderToggle
            emoji="banknote"
            title="Payday reminders"
            body="The day before payday, and on payday to add your new salary."
            value={settings.payday}
            onChange={(payday) => updateReminders({ payday })}
          />
        </Card>

        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          If reminders don’t arrive, check that notifications are allowed for Salary Survival in your phone Settings.
        </Text>
      </FormScroll>
    </>
  );
}

function ReminderToggle({
  emoji,
  title,
  body,
  value,
  onChange,
}: {
  emoji: EmojiName;
  title: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: theme.cardAlt }]}>
        <EmojiImage name={emoji} size={24} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" style={Fonts.bold}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {body}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.android }}
      size={size}
      tintColor={color}
      weight="semibold"
      style={{ width: size, height: size }}
    />
  );
}

export const Icons = {
  add: { ios: 'plus', android: 'add' },
  close: { ios: 'xmark', android: 'close' },
  back: { ios: 'chevron.left', android: 'chevron_left' },
  forward: { ios: 'chevron.right', android: 'chevron_right' },
  down: { ios: 'chevron.down', android: 'expand_more' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  wallet: { ios: 'wallet.bifold.fill', android: 'account_balance_wallet' },
  salary: { ios: 'banknote.fill', android: 'payments' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  person: { ios: 'person.crop.circle.fill', android: 'person' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  privacy: { ios: 'hand.raised.fill', android: 'privacy_tip' },
  doc: { ios: 'doc.text.fill', android: 'description' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  trash: { ios: 'trash', android: 'delete' },
  receipt: { ios: 'list.bullet.rectangle.fill', android: 'receipt_long' },
  trendDown: { ios: 'arrow.down.right', android: 'trending_down' },
  trendUp: { ios: 'arrow.up.right', android: 'trending_up' },
  shield: { ios: 'lock.shield.fill', android: 'savings' },
  device: { ios: 'iphone', android: 'phone_iphone' },
  home: { ios: 'house.fill', android: 'home' },
  insights: { ios: 'chart.bar.xaxis', android: 'bar_chart' },
  pie: { ios: 'chart.pie.fill', android: 'pie_chart' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  search: { ios: 'magnifyingglass', android: 'search' },
  target: { ios: 'target', android: 'flag' },
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  bulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  mic: { ios: 'mic.fill', android: 'mic' },
  wand: { ios: 'wand.and.stars', android: 'auto_fix_high' },
  edit: { ios: 'square.and.pencil', android: 'edit' },
  globe: { ios: 'globe', android: 'public' },
  budget: { ios: 'gauge.with.dots.needle.33percent', android: 'speed' },
} satisfies Record<string, IconName>;

import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { getCategory, type CategoryId } from '@/constants/categories';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Rounded-square tile with a pastel tint and a darker glyph. */
export function CategoryIcon({ id, size = 44 }: { id: CategoryId; size?: number }) {
  const c = getCategory(id);
  const dark = useColorScheme() === 'dark';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        borderCurve: 'continuous',
        backgroundColor: dark ? c.color + '2E' : c.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={c.icon} size={size * 0.44} color={c.color} />
    </View>
  );
}

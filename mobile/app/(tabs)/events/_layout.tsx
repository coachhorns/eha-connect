import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerTitle: 'Events' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ headerTitle: 'Event Details' }}
      />
    </Stack>
  );
}

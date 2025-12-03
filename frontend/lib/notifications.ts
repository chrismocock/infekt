import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for push notifications
 */
export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Push token:', token);

  // Store token in Supabase (you would create a device_tokens table)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // TODO: Store token in database
    // await supabase.from('device_tokens').upsert({
    //   user_id: user.id,
    //   token,
    //   platform: Platform.OS,
    // });
  }

  return token;
}

/**
 * Send local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Send infection success notification
 */
export async function notifyInfectionSuccess(
  method: string,
  infectedUsername?: string
) {
  const methodNames: Record<string, string> = {
    direct: 'Direct Infection',
    qr: 'QR Code',
    deep_link: 'Deep Link',
    chat_link: 'Chat Link',
    share_card: 'Share Card',
    story_qr: 'Story QR',
    tag_drop: 'Tag Drop',
    group_infection: 'Group Infection',
    proximity: 'Proximity',
    hotspot: 'Hotspot',
    event: 'Event',
    chain_reaction: 'Chain Reaction',
    ambient: 'Ambient',
    outbreak_zone: 'Outbreak Zone',
    mutant_tag: 'Mutant Tag',
    npc: 'NPC',
  };

  const methodName = methodNames[method] || method;
  const title = '✓ Infection Successful';
  const body = infectedUsername
    ? `You infected ${infectedUsername} via ${methodName}!`
    : `Infection via ${methodName} successful!`;

  await sendLocalNotification(title, body, {
    type: 'infection_success',
    method,
  });
}

/**
 * Send outbreak alert notification
 */
export async function notifyOutbreakAlert(severity: number, location?: string) {
  const title = '⚠️ Outbreak Zone Detected';
  const body = `Severity ${severity}/10${location ? ` near ${location}` : ''}. High infection risk!`;

  await sendLocalNotification(title, body, {
    type: 'outbreak_alert',
    severity,
  });
}

/**
 * Send tag drop available notification
 */
export async function notifyTagDropAvailable(tagCount: number, distance?: number) {
  const title = '📦 Tag Drop Nearby';
  const body = `${tagCount} tag${tagCount !== 1 ? 's' : ''} available${distance ? ` (${distance}m away)` : ''}`;

  await sendLocalNotification(title, body, {
    type: 'tag_drop_available',
    tagCount,
  });
}

/**
 * Send hotspot detected notification
 */
export async function notifyHotspotDetected(
  name: string,
  xpMultiplier: number
) {
  const title = '🔥 Hotspot Detected';
  const body = `${name} - ${xpMultiplier}x XP multiplier active!`;

  await sendLocalNotification(title, body, {
    type: 'hotspot_detected',
    name,
    xpMultiplier,
  });
}

/**
 * Send chain reaction notification
 */
export async function notifyChainReaction(count: number) {
  const title = '💥 Chain Reaction!';
  const body = `${count} player${count !== 1 ? 's' : ''} infected in chain reaction!`;

  await sendLocalNotification(title, body, {
    type: 'chain_reaction',
    count,
  });
}

/**
 * Send mutation unlock notification
 */
export async function notifyMutationUnlock(mutationName: string) {
  const title = '✨ Mutation Unlocked';
  const body = `You unlocked: ${mutationName}`;

  await sendLocalNotification(title, body, {
    type: 'mutation_unlock',
    mutationName,
  });
}


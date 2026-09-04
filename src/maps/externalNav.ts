import { Linking, Platform } from 'react-native';

export const openExternalNavigation = async (
  lat: number,
  lng: number,
  label?: string
): Promise<void> => {
  const destination = `${lat},${lng}`;
  const encodedLabel = label ? encodeURIComponent(label) : '';

  let url = '';

  if (Platform.OS === 'android') {
    // Native Google Maps driving navigation intent
    url = `google.navigation:q=${destination}&mode=d`;
  } else if (Platform.OS === 'ios') {
    // Apple Maps / Google Maps iOS fallback
    url = `maps://app?daddr=${destination}&dirflg=d`;
  } else {
    // Web fallback
    url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback web URL
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('Could not launch external navigation', error);
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    await Linking.openURL(webUrl);
  }
};

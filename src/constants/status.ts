export const NOTIFICATION_CHANNELS = {
  DELIVERY_ASSIGNMENTS: {
    id: 'delivery_assignments',
    name: 'New Delivery Offers',
    importance: 'HIGH', // heads-up notification, sound + vibration
  },
  DELIVERY_UPDATES: {
    id: 'delivery_updates',
    name: 'Delivery Progress & Nudges',
    importance: 'DEFAULT',
  },
  EARNINGS_KYC: {
    id: 'earnings_kyc',
    name: 'Earnings & KYC Updates',
    importance: 'LOW',
  },
  SYSTEM_ANNOUNCEMENTS: {
    id: 'system_announcements',
    name: 'System Announcements',
    importance: 'DEFAULT',
  },
} as const;

export const ASSIGNMENT_TIMEOUT_SECONDS = 30; // Server-authoritative offer window
export const LOCATION_UPDATE_INTERVAL_MS = 15000; // 15s base tracking cadence
export const BATTERY_THROTTLE_INTERVAL_MS = 35000; // 35s throttled cadence (<15% battery)
export const DISTANCE_TRIGGER_METERS = 50; // Distance change to trigger instant update
export const OTP_MAX_ATTEMPTS = 3; // Maximum OTP verification retries

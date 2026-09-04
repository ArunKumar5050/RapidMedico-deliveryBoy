import { calculateHaversineDistance } from '../utils/formatting';
import { LocationPoint } from '../types';

export interface GeofenceResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  toleranceUsed: number;
  confidence: 'high' | 'medium' | 'low';
}

export const checkArrivalGeofence = (
  currentLocation: LocationPoint,
  targetLocation: LocationPoint,
  baseThresholdMeters: number = 100
): GeofenceResult => {
  const distance = calculateHaversineDistance(
    currentLocation.lat,
    currentLocation.lng,
    targetLocation.lat,
    targetLocation.lng
  );

  // Dynamic tolerance calculation based on GPS accuracy rating (Section 8.5)
  let tolerance = baseThresholdMeters;
  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (currentLocation.accuracy > 50) {
    // Poor GPS fix - widen tolerance to prevent blocking legitimate riders
    tolerance = Math.max(baseThresholdMeters, currentLocation.accuracy + 50);
    confidence = 'low';
  } else if (currentLocation.accuracy > 20) {
    tolerance = baseThresholdMeters + 30;
    confidence = 'medium';
  }

  return {
    isWithinGeofence: distance <= tolerance,
    distanceMeters: Math.round(distance),
    toleranceUsed: tolerance,
    confidence,
  };
};

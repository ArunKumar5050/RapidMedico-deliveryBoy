export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatETA = (seconds: number): string => {
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} hr ${remMins} min`;
};

export const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 10) return '**********';
  const clean = phone.replace(/\D/g, '');
  return `+91 ******${clean.slice(-4)}`;
};

export const maskBankAccount = (accountNo: string): string => {
  if (!accountNo || accountNo.length < 4) return '****';
  return `XXXX XXXX ${accountNo.slice(-4)}`;
};

export const extractCoarseArea = (fullAddress: string): string => {
  if (!fullAddress) return 'Local Area';
  const parts = fullAddress.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    return parts.slice(-2).join(', ');
  }
  return parts[0];
};

export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
};

export const getPartnerDisplayName = (partner: any): string => {
  if (!partner) return 'Delivery Partner';
  if (partner.fullName && !/^partner\s*\d*$/i.test(partner.fullName)) {
    return partner.fullName;
  }
  return partner.bankDetails?.accountHolderName || partner.name || partner.firstName || 'Delivery Partner';
};

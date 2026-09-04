export type DeliveryStatus =
  | 'assigned'
  | 'pending_acceptance'
  | 'accepted'
  | 'en_route_pickup'
  | 'arrived_pickup'
  | 'picked_up'
  | 'en_route_delivery'
  | 'arrived_delivery'
  | 'otp_verification'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AvailabilityStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export type KYCStatusType = 'pending' | 'under_review' | 'approved' | 'rejected';

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'vehicle_rc'
  | 'insurance'
  | 'cancelled_cheque';

export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  isMocked?: boolean;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName?: string;
  chequeImageUri?: string;
}

export interface DeliveryPartner {
  partnerId: string;
  fullName: string;
  phone: string;
  email?: string;
  dob: string;
  profilePhotoUrl?: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicenseNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  bankDetails?: BankDetails;
  documentImages?: Partial<Record<DocumentType, string>>;
  cityId: string;
  status: 'active' | 'suspended' | 'inactive';
  availability: AvailabilityStatus;
  kycStatus: {
    overall: KYCStatusType;
    documents: Record<DocumentType, KYCStatusType>;
  };
  reliabilityScore: number;
  lastKnownLocation?: LocationPoint;
  createdAt: string;
  suspendedReason?: string;
  deletedAt?: string;
}

export interface PharmacyDetails {
  pharmacyId: string;
  displayName?: string;
  addressText: string;
  phone?: string;
  landmark?: string;
  location: LocationPoint;
  pickupInstructions?: string;
}

export interface CustomerDetails {
  firstName: string;
  fullName?: string;
  phone?: string;
  deliveryAddress: string;
  landmark?: string;
  instructions?: string;
  location: LocationPoint;
}

export interface DeliveryAssignment {
  assignmentId: string;
  orderId: string;
  partnerId: string;
  status: DeliveryStatus;
  storePickupOtp?: string; // 4-digit OTP generated for store owner verification
  deliveryOtp?: string; // 4-digit OTP from customer/database for delivery verification
  pharmacy: PharmacyDetails;
  customer: CustomerDetails;
  codAmount?: number; // Shown only if COD
  estimatedEarnings: number;
  expiresAt: number; // Server-authoritative timestamp for pending_acceptance
  arrivedAtPharmacyAt?: number;
  pickedUpAt?: number;
  arrivedAtCustomerAt?: number;
  deliveredAt?: number;
  cancellation?: {
    reasonCode?: string;
    cancelledBy?: 'partner' | 'customer' | 'admin' | 'system';
    cancelledAt?: number;
    note?: string;
  };
  createdAt: number;
}

export interface OrderItemCategory {
  categoryName: string;
  itemCount: number;
}

export interface Order {
  orderId: string;
  status: DeliveryStatus;
  categories: OrderItemCategory[];
  codAmount?: number;
}

export interface DeliveryLocation {
  assignmentId: string;
  partnerId: string;
  current: LocationPoint;
  locationStale: boolean;
  updatedAt: number;
}

export interface EarningsEntry {
  assignmentId: string;
  orderId: string;
  basePay: number;
  distanceIncentive: number;
  bonus: number;
  amount: number;
  date: string; // ISO date
}

export interface Earnings {
  partnerId: string;
  today: number;
  thisWeek: number;
  thisMonth: number;
  pendingSettlement: number;
  completedDeliveriesCount: number;
  deliveryEarnings: EarningsEntry[];
  updatedAt: number;
}

export interface KYCDocument {
  documentType: DocumentType;
  status: KYCStatusType;
  rejectionReason?: string;
  submittedAt: number;
  reviewedAt?: number;
  fileUrl?: string;
}

export interface KYC {
  partnerId: string;
  documents: Record<DocumentType, KYCDocument>;
  overallStatus: KYCStatusType;
}

export interface Vehicle {
  vehicleType: string;
  vehicleNumber: string;
  rcNumber: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
}

export interface NotificationItem {
  notificationId: string;
  partnerId: string;
  category: 'delivery_assignments' | 'delivery_updates' | 'earnings_kyc' | 'system_announcements';
  title: string;
  body: string;
  deepLink?: string;
  read: boolean;
  createdAt: number;
}

export interface SupportTicket {
  ticketId: string;
  partnerId: string;
  category: string;
  relatedAssignmentId?: string;
  status: 'open' | 'in_progress' | 'resolved';
  messages: Array<{
    sender: 'partner' | 'support';
    body: string;
    timestamp: number;
  }>;
  createdAt: number;
  resolvedAt?: number;
}

export interface DeliveryHistory {
  entryId: string;
  partnerId: string;
  assignmentId: string;
  orderId: string;
  status: 'completed' | 'cancelled' | 'failed';
  earnings: number;
  completedAt: number;
  pickupAreaCoarse: string; // Coarse locality name per privacy Section 21
  deliveryAreaCoarse: string; // Coarse locality name per privacy Section 21
}

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, functions } from '../firebase/config';
import { AvailabilityStatus, DeliveryPartner, KYCStatusType, DocumentType, BankDetails } from '../types';
import { generateIdempotencyKey } from '../utils/idempotency';

export interface SignupPayload {
  // Step 1: Basic Details
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  cityId: string;
  vehicleType: string;

  // Step 2: KYC, Vehicle & Bank Details + Respective Images
  drivingLicenseNumber: string;
  dlImageUri?: string;
  vehicleNumber: string;
  rcImageUri?: string;
  aadhaarNumber: string;
  aadhaarImageUri?: string;
  panNumber: string;
  panImageUri?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  chequeImageUri?: string;
}

export const DELIVERY_ZONES = [
  { id: 'salasar', name: 'Salasar', state: 'Rajasthan' },
  { id: 'khatushyam_ji', name: 'Khatushyam Ji', state: 'Rajasthan' },
  { id: 'sanwariya_seth', name: 'Sanwariya Seth', state: 'Rajasthan' },
  { id: 'ujjain', name: 'Ujjain', state: 'Madhya Pradesh' },
  { id: 'vrindavan', name: 'Vrindavan', state: 'Uttar Pradesh' },
  { id: 'pushkar', name: 'Pushkar', state: 'Rajasthan' },
];

export const DEMO_PARTNERS: DeliveryPartner[] = [
  {
    partnerId: 'partner_9876543210',
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul.delivery@rapidmedico.com',
    dob: '1995-08-15',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    vehicleType: 'scooter',
    vehicleNumber: 'RJ23EQ1234',
    drivingLicenseNumber: 'RJ-2320150012345',
    aadhaarNumber: '987654321012',
    panNumber: 'ABCDE1234F',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '394857201948',
      ifscCode: 'SBIN0001234',
      accountHolderName: 'Rahul Sharma',
    },
    cityId: 'khatushyam_ji',
    status: 'active',
    availability: 'ONLINE',
    kycStatus: {
      overall: 'approved',
      documents: {
        aadhaar: 'approved',
        pan: 'approved',
        driving_license: 'approved',
        vehicle_rc: 'approved',
        insurance: 'approved',
        cancelled_cheque: 'approved',
      },
    },
    reliabilityScore: 4.94,
    createdAt: '2025-01-10T10:00:00.000Z',
  },
  {
    partnerId: 'partner_9811223344',
    fullName: 'Priya Patel',
    phone: '9811223344',
    email: 'priya.patel@rapidmedico.com',
    dob: '1998-03-22',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    vehicleType: 'ev_bike',
    vehicleNumber: 'RJ14AB5678',
    drivingLicenseNumber: 'RJ-1420180056789',
    aadhaarNumber: '876543210987',
    panNumber: 'FGHIJ5678K',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '501002938475',
      ifscCode: 'HDFC0000456',
      accountHolderName: 'Priya Patel',
    },
    cityId: 'salasar',
    status: 'active',
    availability: 'ONLINE',
    kycStatus: {
      overall: 'approved',
      documents: {
        aadhaar: 'approved',
        pan: 'approved',
        driving_license: 'approved',
        vehicle_rc: 'approved',
        insurance: 'approved',
        cancelled_cheque: 'approved',
      },
    },
    reliabilityScore: 4.88,
    createdAt: '2025-02-15T14:30:00.000Z',
  },
  {
    partnerId: 'partner_9988776655',
    fullName: 'Amit Kumar',
    phone: '9988776655',
    email: 'amit.kumar@rapidmedico.com',
    dob: '1999-11-05',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    vehicleType: 'motorbike',
    vehicleNumber: 'MP13XY9999',
    drivingLicenseNumber: 'MP-1320190099999',
    aadhaarNumber: '765432109876',
    panNumber: 'KLMNO9999P',
    bankDetails: {
      bankName: 'Bank of Baroda',
      accountNumber: '293847561029',
      ifscCode: 'BARB0UJJAIN',
      accountHolderName: 'Amit Kumar',
    },
    cityId: 'ujjain',
    status: 'active',
    availability: 'OFFLINE',
    kycStatus: {
      overall: 'under_review',
      documents: {
        aadhaar: 'under_review',
        pan: 'under_review',
        driving_license: 'under_review',
        vehicle_rc: 'under_review',
        insurance: 'approved',
        cancelled_cheque: 'under_review',
      },
    },
    reliabilityScore: 5.0,
    createdAt: new Date().toISOString(),
  },
];

export const authService = {
  /**
   * Request OTP code for a phone number
   */
  async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      message: `Verification code sent to +91 ${phone}. Use test OTP: 1234`,
    };
  },

  /**
   * Verify entered OTP code and sign in or complete 2-step registration
   */
  async verifyAuthOTP(
    phone: string,
    otp: string,
    signupData?: SignupPayload
  ): Promise<{ success: boolean; partner?: DeliveryPartner; error?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Support standard test OTP 1234 or any 4-digit code in dev mode
    if (otp !== '1234' && otp.length !== 4 && otp !== '0000') {
      return {
        success: false,
        error: 'Invalid verification code. Please enter 1234 or check your SMS.',
      };
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // 1. If this is a new 2-step signup registration
    if (signupData) {
      const docImages: Partial<Record<DocumentType, string>> = {};
      if (signupData.dlImageUri) docImages.driving_license = signupData.dlImageUri;
      if (signupData.rcImageUri) docImages.vehicle_rc = signupData.rcImageUri;
      if (signupData.aadhaarImageUri) docImages.aadhaar = signupData.aadhaarImageUri;
      if (signupData.panImageUri) docImages.pan = signupData.panImageUri;
      if (signupData.chequeImageUri) docImages.cancelled_cheque = signupData.chequeImageUri;

      const newPartner: DeliveryPartner = {
        partnerId: `partner_${cleanPhone}`,
        fullName: signupData.fullName.trim(),
        phone: cleanPhone,
        email: signupData.email?.trim() || `${cleanPhone}@rapidmedico.partner`,
        dob: signupData.dob || '2000-01-01',
        vehicleType: signupData.vehicleType || 'scooter',
        vehicleNumber: signupData.vehicleNumber.toUpperCase().trim(),
        drivingLicenseNumber: signupData.drivingLicenseNumber?.toUpperCase().trim(),
        aadhaarNumber: signupData.aadhaarNumber?.replace(/\s/g, '').trim(),
        panNumber: signupData.panNumber?.toUpperCase().trim(),
        bankDetails: {
          bankName: signupData.bankName?.trim() || 'HDFC Bank',
          accountNumber: signupData.accountNumber?.trim() || 'XXXX XXXX 1234',
          ifscCode: signupData.ifscCode?.toUpperCase().trim() || 'HDFC0001234',
          accountHolderName: signupData.fullName.trim(),
          chequeImageUri: signupData.chequeImageUri,
        },
        documentImages: docImages,
        cityId: signupData.cityId || 'khatushyam_ji',
        status: 'active',
        availability: 'ONLINE',
        kycStatus: {
          overall: 'under_review',
          documents: {
            aadhaar: signupData.aadhaarImageUri ? 'under_review' : 'pending',
            pan: signupData.panImageUri ? 'under_review' : 'pending',
            driving_license: signupData.dlImageUri ? 'under_review' : 'pending',
            vehicle_rc: signupData.rcImageUri ? 'under_review' : 'pending',
            insurance: 'approved',
            cancelled_cheque: signupData.chequeImageUri ? 'under_review' : 'pending',
          },
        },
        reliabilityScore: 5.0,
        createdAt: new Date().toISOString(),
      };

      await this.savePartnerToFirestore(newPartner);
      return { success: true, partner: newPartner };
    }

    // 2. Check if this is a known demo account
    const matchedDemo = DEMO_PARTNERS.find(
      (p) => p.phone === cleanPhone || p.partnerId === `partner_${cleanPhone}`
    );
    if (matchedDemo) {
      return { success: true, partner: matchedDemo };
    }

    // 3. Check Firestore for existing partner
    const firestorePartner = await this.fetchPartnerFromFirestore(`partner_${cleanPhone}`);
    if (firestorePartner) {
      return { success: true, partner: firestorePartner };
    }

    // 4. Default automatic created partner for custom phone logins
    const generatedPartner: DeliveryPartner = {
      partnerId: `partner_${cleanPhone}`,
      fullName: `Partner ${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      email: `driver.${cleanPhone}@rapidmedico.com`,
      dob: '1996-05-12',
      vehicleType: 'scooter',
      vehicleNumber: 'RJ23RM' + cleanPhone.slice(-4),
      cityId: 'khatushyam_ji',
      status: 'active',
      availability: 'ONLINE',
      kycStatus: {
        overall: 'approved',
        documents: {
          aadhaar: 'approved',
          pan: 'approved',
          driving_license: 'approved',
          vehicle_rc: 'approved',
          insurance: 'approved',
          cancelled_cheque: 'approved',
        },
      },
      reliabilityScore: 4.95,
      createdAt: new Date().toISOString(),
    };

    await this.savePartnerToFirestore(generatedPartner);
    return { success: true, partner: generatedPartner };
  },

  async fetchPartnerFromFirestore(partnerId: string): Promise<DeliveryPartner | null> {
    try {
      const ref = doc(db, 'delivery_partners', partnerId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as DeliveryPartner;
      }
    } catch (e) {
      console.warn('[AuthService] Firestore fetch error (falling back to local memory):', e);
    }
    return null;
  },

  async savePartnerToFirestore(partner: DeliveryPartner): Promise<void> {
    try {
      const ref = doc(db, 'delivery_partners', partner.partnerId);
      await setDoc(ref, partner, { merge: true });
    } catch (e) {
      console.warn('[AuthService] Firestore save error (continuing with local state):', e);
    }
  },

  async updateAvailability(
    targetStatus: AvailabilityStatus
  ): Promise<{ availability: AvailabilityStatus; reason?: string }> {
    try {
      const updateFn = httpsCallable<
        { targetStatus: AvailabilityStatus; idempotencyKey: string },
        { success: boolean; availability: AvailabilityStatus; reason?: string }
      >(functions, 'updateAvailability');

      const response = await updateFn({
        targetStatus,
        idempotencyKey: generateIdempotencyKey('avail'),
      });

      return {
        availability: response.data.availability,
        reason: response.data.reason,
      };
    } catch (e: any) {
      return { availability: targetStatus };
    }
  },

  async mockLogin(phone: string): Promise<DeliveryPartner> {
    const demo = DEMO_PARTNERS.find((p) => p.phone === phone) || DEMO_PARTNERS[0];
    return demo;
  },
};

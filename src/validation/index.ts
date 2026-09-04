import { z } from 'zod';

export const PhoneLoginSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

export const OTPInputSchema = z.object({
  otp: z
    .string()
    .length(4, 'OTP must be exactly 4 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

export const PickupPinSchema = z.object({
  pin: z
    .string()
    .min(4, 'Pickup PIN must be at least 4 digits')
    .max(6, 'Pickup PIN cannot exceed 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
});

export const BankDetailsSchema = z.object({
  accountNumber: z
    .string()
    .min(9, 'Bank account number must be at least 9 digits')
    .max(18, 'Bank account number cannot exceed 18 digits')
    .regex(/^\d+$/, 'Account number must contain only numbers'),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid 11-character IFSC code (e.g. SBIN0001234)'),
  accountHolderName: z
    .string()
    .min(3, 'Account holder name must be at least 3 characters'),
});

export const VehicleInfoSchema = z.object({
  vehicleType: z.enum(['motorcycle', 'scooter', 'bicycle', 'ev_scooter']),
  vehicleNumber: z
    .string()
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, 'Enter a valid vehicle number (e.g. DL01AB1234)'),
  rcNumber: z.string().min(5, 'Enter a valid RC number'),
  insurancePolicyNumber: z.string().min(5, 'Enter a valid policy number'),
  insuranceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD'),
});

export const KYCSubmissionSchema = z.object({
  fullName: z.string().min(3, 'Full legal name is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  aadhaarNumber: z
    .string()
    .length(12, 'Aadhaar number must be exactly 12 digits')
    .regex(/^\d+$/, 'Aadhaar must contain only numbers'),
  panNumber: z
    .string()
    .length(10, 'PAN number must be 10 characters')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN number format'),
  drivingLicenseNumber: z.string().min(10, 'Enter a valid Driving License number'),
  licenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DL Expiry date must be YYYY-MM-DD'),
});

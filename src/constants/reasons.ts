export interface ReasonOption {
  code: string;
  label: string;
  description: string;
  isCritical?: boolean;
}

export const DELIVERY_FAILURE_REASONS: ReasonOption[] = [
  {
    code: 'customer_unavailable',
    label: 'Customer Unavailable',
    description: 'Customer was not reachable or did not respond at delivery location.',
  },
  {
    code: 'address_incorrect',
    label: 'Wrong Address',
    description: 'The delivery location is incorrect or unreachable as provided.',
  },
  {
    code: 'customer_refused',
    label: 'Customer Refused Delivery',
    description: 'Customer declined to accept the parcel upon arrival.',
  },
  {
    code: 'otp_unavailable',
    label: 'Customer Cannot Provide OTP',
    description: 'Customer phone unavailable or unable to receive OTP.',
  },
  {
    code: 'package_missing_at_pharmacy',
    label: 'Package Missing at Pharmacy',
    description: 'Pharmacy staff could not locate or hand over the order.',
  },
  {
    code: 'package_damaged',
    label: 'Damaged Package',
    description: 'Package or medicine seals broken/damaged prior to delivery.',
  },
  {
    code: 'item_mismatch',
    label: 'Item Discrepancy',
    description: 'Items in package do not match the expected order pickup manifest.',
  },
  {
    code: 'cod_payment_issue',
    label: 'Cash Collection Issue',
    description: 'Customer unable/unwilling to pay exact Cash on Delivery amount.',
  },
  {
    code: 'route_blocked',
    label: 'Road Closure / Route Blocked',
    description: 'Severe road closure preventing access to delivery pin.',
  },
  {
    code: 'vehicle_breakdown',
    label: 'Vehicle Breakdown',
    description: 'Delivery vehicle broke down during delivery leg.',
    isCritical: true,
  },
  {
    code: 'accident',
    label: 'Accident / Safety Emergency',
    description: 'Emergency or accident occurred during delivery.',
    isCritical: true,
  },
  {
    code: 'partner_unable_to_continue',
    label: 'Personal Emergency',
    description: 'Rider unable to complete active delivery due to emergency.',
    isCritical: true,
  },
];

export const REJECTION_REASONS: ReasonOption[] = [
  {
    code: 'too_far',
    label: 'Pickup Distance Too Far',
    description: 'Pharmacy location is beyond acceptable distance.',
  },
  {
    code: 'going_offline',
    label: 'Ending Shift / Going Offline',
    description: 'Plan to stop working immediately.',
  },
  {
    code: 'vehicle_issue',
    label: 'Vehicle Fuel / Maintenance',
    description: 'Need to refuel or fix vehicle issue.',
  },
  {
    code: 'other',
    label: 'Other Reason',
    description: 'Other personal or operational reason.',
  },
];

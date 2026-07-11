// Mirrors the subset of awarome-BE response shapes the admin UI renders.
// Keep in sync manually with the BE models until the two repos share types.

export interface UserAddressEntry {
  address?: string;
  description?: string;
  state?: string;
  lga?: string;
  country?: string;
  tag?: string;
  isActive?: boolean;
}

export interface UserAddresses {
  home?: UserAddressEntry | null;
  work?: UserAddressEntry | null;
  others?: UserAddressEntry[] | null;
}

export interface AdminUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  state?: string;
  source?: string;
  suspended?: boolean;
  deleted?: boolean;
  createdAt?: string;
}

export interface AdminVendor {
  _id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  vendorId?: string;
  type?: string[];
  rating?: number;
  suspended?: boolean;
  deleted?: boolean;
  isTestVendor?: boolean;
  createdAt?: string;
  users?: Array<{ _id: string; firstName?: string; lastName?: string; email?: string; phone?: string }>;
}

export interface VendorStatistics {
  totalProductsCount: number;
  pendingOrdersCount: number;
  totalOrdersCount: number;
  totalSales: number;
}

// Mirrors src/modules/users/types/vendors.types.ts VendorTypes in awarome-BE.
export const VENDOR_TYPES = [
  'groceries',
  'supermarket',
  'appliances',
  'health_and_beauty',
  'fashion',
  'electronics',
] as const;

export interface AdminProduct {
  _id: string;
  name?: string;
  price?: number;
  quantityAvailable?: number;
  description?: string;
  image?: string;
  category?: { _id: string; name?: string } | string;
  vendor?: { _id: string; name?: string; businessName?: string } | string;
  isAvailable?: boolean;
  deliveryMethod?: string;
  tags?: string[];
  flag?: string;
  deleted?: boolean;
  createdAt?: string;
}

export interface AdminRider {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  ordersCompleted?: number;
  suspended?: boolean;
  createdAt?: string;
}

export interface AdminOrderCart {
  _id: string;
  product?: { _id: string; name?: string; image?: string } | string;
  price?: number;
  quantity?: number;
}

export interface AdminCart {
  _id: string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string } | string;
  product?: { _id: string; name?: string; image?: string; price?: number } | string;
  vendor?: { _id: string; name?: string; businessName?: string } | string;
  quantity?: number;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminOrder {
  _id: string;
  orderId?: string;
  user?:
    | { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string }
    | string;
  vendor?: { _id: string; name?: string; businessName?: string } | string;
  rider?: { _id: string; firstName?: string; lastName?: string; phone?: string } | string;
  carts?: AdminOrderCart[];
  totalPrice?: number;
  deliveryFee?: number;
  serviceCharge?: number;
  productsCost?: number;
  deliveryLocation?: { address?: string };
  status?: string;
  orderDeliveryStatus?: string;
  orderVendorStatus?: string;
  orderAcceptanceTime?: string;
  isPaid?: boolean;
  isDelivered?: boolean;
  paymentMethod?: string;
  createdAt?: string;
}

export interface AdminDelivery {
  _id: string;
  deliveryId?: string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  rider?: { _id: string; firstName?: string; lastName?: string; phone?: string } | string;
  requestType?: string;
  deliveryOption?: string;
  status?: string;
  deliveryFee?: number;
  isPaid?: boolean;
  estimatedDistance?: number;
  sender?: { name?: string; phone?: string };
  receiver?: { name?: string; phone?: string };
  pickupAddress?: { address?: string; note?: string };
  dropoffAddress?: { address?: string; note?: string };
  createdAt?: string;
}

export interface DistanceTier {
  min: number;
  max: number;
  factor: number;
}

export interface PricingConfig {
  baseFare: number;
  pricePerKmBike: number;
  pricePerKmCar: number;
  pricePerKmTruck: number;
  minimumDeliveryCharge: number;
  serviceChargeCap: number;
  distanceTiers: DistanceTier[];
  batchDeliveryShortDistanceKm: number;
  batchDeliveryMediumDistanceKm: number;
  batchDeliveryShortCharge: number;
  batchDeliveryMediumCharge: number;
  batchDeliveryLongCharge: number;
  // Package-delivery batch window floor (4PM-8PM price) per vehicle.
  batchFlatFeeBike: number;
  batchFlatFeeCar: number;
  batchFlatFeeTruck: number;
}

export interface AdminTransaction {
  _id: string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  amount?: number;
  currency?: string;
  transactionReference?: string;
  status?: string;
  type?: string;
  channel?: string;
  message?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface AdminWallet {
  _id: string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  partner?: { _id: string; name?: string } | string;
  balance: number; // kobo
  prevBalance: number; // kobo
  lastFundedAt?: string;
  subscriptionStatus?: string;
  createdAt?: string;
}

export interface AdminWalletTransaction {
  _id: string;
  amount: number; // kobo
  type: 'credit' | 'debit';
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  reference?: string;
  createdAt?: string;
}

export interface AnalyticsOverview {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    activeVendors: number;
    activeRiders: number;
    totalDeliveries: number;
  };
  revenueOverTime: { date: string; revenue: number; orderCount: number }[];
  ordersByStatus: { status: string; count: number }[];
  topVendors: { vendorId: string; name?: string; totalSales: number; orderCount: number }[];
  topRiders: { riderId: string; name?: string; deliveriesCompleted: number }[];
}

export interface AdminPromoCode {
  _id: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number;
  applicability: 'product' | 'delivery' | 'both';
  isActive: boolean;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  createdBy?: { _id: string; firstName?: string; lastName?: string } | string;
  description?: string;
  createdAt?: string;
}

export interface AdminStaff {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AdminAudienceList {
  _id: string;
  name: string;
  totalPhones: number;
  matchedCount: number;
  createdAt?: string;
}

export interface AdminAudienceListDetail extends AdminAudienceList {
  users: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }>;
}

export interface AdminActivityLog {
  _id: string;
  level: string;
  category: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  staff?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  vendor?: { _id: string; name?: string; businessName?: string } | string;
  createdAt?: string;
}


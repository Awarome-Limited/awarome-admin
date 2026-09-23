// Mirrors the subset of awarome-BE response shapes the admin UI renders.
// Keep in sync manually with the BE models until the two repos share types.

import type { PushAudience } from '@/lib/scheduled-push';

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
  status?: 'pending' | 'approved' | 'rejected';
  // Daily trading hours, conventionally 'HH:MM' — older records may hold other
  // free-text formats, so treat these as untrusted strings.
  opensAt?: string;
  closesAt?: string;
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

export interface AdminRiderDocuments {
  govId?: string;
  license?: string;
  vehiclePapers?: string;
}

export interface AdminRider {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  verificationStatus?: 'unsubmitted' | 'pending' | 'approved' | 'rejected' | string;
  verificationNote?: string;
  vehicleType?: 'bike' | 'car' | 'truck' | string;
  plateNumber?: string;
  documents?: AdminRiderDocuments;
  emergencyContact?: string;
  isInHouse?: boolean;
  rating?: number;
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

/**
 * How a job came to be cancelled — set on every cancelled order and delivery,
 * whether a rider asked for it or ops called it off. Names the reason and the
 * staff member accountable for it.
 */
export interface JobCancellation {
  source?: 'rider-request' | 'admin';
  reason?: string;
  note?: string;
  staff?:
    | { _id: string; firstName?: string; lastName?: string; email?: string }
    | string;
  rider?:
    | { _id: string; firstName?: string; lastName?: string; phone?: string }
    | string;
  cancelledAt?: string;
  refundQueued?: boolean;
}

/**
 * Which surface produced a job. Mirrors Channels in awarome-BE. `mobile` is
 * the default, so anything recorded before channels existed reads as mobile.
 */
export type Channel = 'mobile' | 'web' | 'api';

export const CHANNEL_LABELS: Record<Channel, string> = {
  mobile: 'Mobile',
  web: 'Web',
  api: 'API',
};

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
  refundStatus?: string;
  paymentMethod?: string;
  /** The surface this order came from: mobile | web | api. */
  channel?: Channel;
  cancellation?: JobCancellation;
  createdAt?: string;
}

export interface AdminDelivery {
  _id: string;
  deliveryId?: string;
  user?: { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string } | string;
  rider?: { _id: string; firstName?: string; lastName?: string; phone?: string } | string;
  requestType?: string;
  deliveryOption?: string;
  status?: string;
  riderStatus?: string;
  /** The surface this delivery came from: mobile | web | api. */
  channel?: Channel;
  deliveryFee?: number;
  isPaid?: boolean;
  refundStatus?: string;
  estimatedDistance?: number;
  sender?: { name?: string; phone?: string };
  receiver?: { name?: string; phone?: string };
  pickupAddress?: { address?: string; note?: string };
  dropoffAddress?: { address?: string; note?: string };
  cancellation?: JobCancellation;
  createdAt?: string;
}

export interface DistanceTier {
  min: number;
  max: number;
  factor: number;
}

/**
 * Which batch pricing model is live. Switching this changes both the price and
 * whether the customer picks a delivery window at all.
 *
 *  - `window`         four bookable slots, priced down to a per-vehicle floor.
 *  - `flat-discount`  no slots: one price, a flat percentage off instant.
 */
export type BatchPricingModel = 'window' | 'flat-discount';

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
  batchPricingModel: BatchPricingModel;
  // Percent off the instant fee under the `flat-discount` model.
  batchFlatDiscountPercent: number;
  // Package-delivery batch window floor (4PM-8PM price) per vehicle.
  // Only consulted under the `window` model.
  batchFlatFeeBike: number;
  batchFlatFeeCar: number;
  batchFlatFeeTruck: number;
}

export type VehicleType = 'bike' | 'car' | 'truck';

/**
 * One vehicle's availability. It is offered only when the master switch, the
 * delivery-option flag and the surface flag are all on.
 */
export interface VehicleAvailability {
  vehicleType: VehicleType;
  enabled: boolean;
  instant: boolean;
  batch: boolean;
  marketplace: boolean;
  package: boolean;
  disabledMessage?: string;
}

export interface DeliveryOptionsConfig {
  vehicles: VehicleAvailability[];
  // Master switch for batch delivery itself, independent of any vehicle.
  batchEnabled: boolean;
}

export interface DeliveryZone {
  name: string;
  keywords: string[];
  active: boolean;
}

export interface DeliveryZoneConfig {
  zones: DeliveryZone[];
}

// 0 = Sunday … 6 = Saturday. `opensAt`/`closesAt` are 'HH:MM' West Africa Time;
// '23:59' means end-of-day, and a close at or before the open is an overnight
// range that runs into the next day.
export interface OperatingDay {
  day: number;
  enabled: boolean;
  opensAt: string;
  closesAt: string;
}

export interface ServiceStatus {
  open: boolean;
  reason: 'open' | 'paused' | 'closed-day' | 'outside-hours';
  message: string;
  day: number;
  dayLabel: string;
  opensAt?: string;
  closesAt?: string;
}

export interface OperatingHoursConfig {
  days: OperatingDay[];
  paused: boolean;
  closedMessage: string;
  status?: ServiceStatus;
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

/**
 * An API partner: a third party that books couriers over the delivery API
 * rather than through the apps. Onboarding, funding and credentials are all
 * ops actions — partners never self-serve.
 */
export interface AdminPartner {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  country?: string;
  logoImage?: string;
  wallet?: string;
  subscriptionStatus?: string;
  lastSubscribedAt?: string;
  /** The delivery API channel switch. Off until ops turn it on. */
  apiEnabled?: boolean;
  apiSuspendedReason?: string;
  /** Kobo. 0 disables the low-balance alert. */
  lowBalanceThreshold?: number;
  /** Whether this partner's deliveries require a handover PIN by default. */
  defaultRequirePin?: boolean;
  createdAt?: string;
}

/** A partner running low, from GET /admins/partners/low-balance. */
export interface AdminPartnerLowBalance {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  lowBalanceThreshold: number;
  balance: number;
  lastFundedAt?: string;
}

/** Who at the partner owns the integration. A contact record, not a login. */
export interface AdminPartnerUser {
  _id: string;
  partner: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: 'owner' | 'developer' | 'viewer';
  status: 'active' | 'suspended';
  notifyOnLowBalance?: boolean;
  createdAt?: string;
}

/**
 * API key metadata. The secret itself is never returned after issuance — it
 * exists only in the response to the call that created it.
 */
export interface AdminPartnerApiKey {
  _id: string;
  partner: string;
  label?: string;
  mode: 'live' | 'test';
  keyId: string;
  secretLast4?: string;
  status: 'active' | 'revoked';
  scopes?: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt?: string;
}

/** The one-time response to issuing a key. */
export interface IssuedPartnerApiKey {
  id: string;
  keyId: string;
  secret: string;
  mode: string;
  label?: string;
  scopes?: string[];
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

/**
 * One paid job in the dashboard's recent feed — either a marketplace order or
 * a standalone package delivery. `amount` is the order total or the delivery
 * fee respectively.
 */
export interface RecentActivityRow {
  kind: 'order' | 'delivery';
  id: string;
  reference: string;
  amount: number;
  status?: string;
  deliveryStatus?: string;
  customerName?: string;
  customerEmail?: string;
  createdAt?: string;
}

export interface AnalyticsOverview {
  summary: {
    /** Confirmed order revenue plus confirmed standalone delivery fees. */
    totalRevenue: number;
    orderRevenue: number;
    deliveryRevenue: number;
    totalOrders: number;
    activeVendors: number;
    activeRiders: number;
    totalDeliveries: number;
  };
  revenueOverTime: { date: string; revenue: number; orderCount: number }[];
  recentActivity: RecentActivityRow[];
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
  totalEmails?: number;
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

export type ScheduledPushStatus = 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface AdminScheduledPush {
  _id: string;
  title: string;
  message: string;
  audience: PushAudience;
  audienceList?: string;
  audienceListName?: string;
  sendAt: string;
  /** Present on every send of a repeating push. */
  seriesId?: string;
  repeatEveryDays?: number;
  repeatUntil?: string;
  occurrence?: number;
  occurrenceCount?: number;
  status: ScheduledPushStatus;
  result?: { sent: number; failed: number; total: number };
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: { firstName?: string; lastName?: string; email?: string } | string | null;
  createdAt?: string;
}

/** Devices each audience reaches right now, for the scheduler's review. */
export interface ScheduledPushReach {
  customers: number;
  vendors: number;
  riders: number;
  everyone: number;
  lists: Record<string, number>;
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


export type WebBannerMode = 'structured' | 'image';
export type WebBannerTheme = 'indigo' | 'yellow' | 'peach' | 'custom';
export type WebBannerCtaVariant = 'primary' | 'accent' | 'outline';
export type WebBannerLinkType = 'vendor' | 'category' | 'product' | 'url' | 'none';

export interface AdminWebBanner {
  _id: string;
  mode: WebBannerMode;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaVariant: WebBannerCtaVariant;
  theme: WebBannerTheme;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  linkType: WebBannerLinkType;
  linkValue?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminMobileAd {
  _id: string;
  bannerImage: string;
  vendor?: { _id: string; name?: string; businessName?: string } | string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Batch delivery clusters that have not formed yet, and the courier
 * assignment that forms one early. Mirrors `FormingCluster` in
 * awarome-BE/src/modules/deliveries/services/batchDispatch.services.ts.
 */
export interface EarlyFormWarning {
  code: 'before-window';
  window: string;
  label: string;
  startsAt: string;
  minutesEarly: number;
  message: string;
}

export interface FormingBatchJob {
  _id: string;
  orderId?: string;
  deliveryId?: string;
  deliveryFee?: number;
  paidAt?: string;
  createdAt?: string;
  user?: { firstName?: string; lastName?: string; phone?: string } | string;
  vendor?: { businessName?: string; name?: string; address?: string } | string;
  deliveryLocation?: { address?: string };
  pickupAddress?: { address?: string };
  dropoffAddress?: { address?: string };
}

export interface FormingBatchStop {
  jobType: 'order' | 'delivery';
  jobId: string;
  seq: number;
  job?: FormingBatchJob;
}

export interface FormingCluster {
  // null on the flat-discount (windowless) pool — no slot was ever promised.
  window: string | null;
  vehicleType: string;
  size: number;
  target?: number;
  closesAt?: string;
  waitingSince?: string;
  // What dispatch would do with this cluster the moment it forms on its own.
  wouldFormAs: 'gig' | 'in-house' | string;
  earlyWarning?: EarlyFormWarning;
  stops: FormingBatchStop[];
}

export interface FormingBatchesPayload {
  clusters: FormingCluster[];
  counts: { clusters: number; stops: number };
}

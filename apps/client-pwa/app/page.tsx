'use client';

import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Home,
  ImageOff,
  Info,
  LocateFixed,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Mail,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  Save,
  ShieldCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Trash2,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import React, { FormEvent, UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MIN_CLIENT_LOADER_MS = 1400;

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type Customer = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  taxId?: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  status: string;
  address?: string | null;
  zone?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  reference?: string | null;
  brand?: string | null;
  sessionId: string;
  mustChangePassword: boolean;
};

type Purchase = {
  id: string;
  invoiceNumber: string;
  amount: string;
  pointsCalculated: number;
  purchasedAt: string;
  status?: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'REVERSED' | string;
  store: {
    id: string;
    code: string;
    name: string;
  };
};

type PointMovement = {
  id: string;
  type: string;
  status: string;
  points: number;
  description?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  purchase?: Purchase | null;
};

type Summary = {
  customer: Customer;
  availablePoints: number;
  level: {
    code: string;
    name: string;
    minPurchases: number;
    maxPurchases: number | null;
    nextLevelName: string | null;
    nextLevelMinPurchases: number | null;
    remainingPurchases: number;
  };
  purchasesCount: number;
  recentPurchasesCount: number;
  purchases: Purchase[];
  movements: PointMovement[];
  promotionalBalance: string;
  brandCardImageUrl?: string | null;
  brandCardTextColor?: string | null;
  brandSocialLinks?: BrandSocialLinks | null;
};

type SocialNetworkKey = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'whatsapp' | 'website';
type BrandSocialLinks = Partial<Record<SocialNetworkKey, string>>;

const REWARD_TYPE_OPTIONS: Array<[string, string]> = [
  ['DEPORTIVO', 'Deportivo'], ['CASUAL', 'Casual'], ['FORMAL', 'Formal'], ['RUNNING', 'Running'],
  ['URBANO', 'Urbano'], ['ROPA', 'Ropa'], ['ACCESORIO', 'Accesorio'], ['OTRO', 'Otro'],
];
const REWARD_GENDER_OPTIONS: Array<[string, string]> = [
  ['HOMBRE', 'Hombre'], ['MUJER', 'Mujer'], ['NINO', 'Niño'], ['NINA', 'Niña'], ['UNISEX', 'Unisex'],
];

type Reward = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  pointsValue: number;
  stock?: number | null;
  reservedStock: number;
  availableStock?: number | null;
  imageUrl?: string | null;
  isFeatured: boolean;
  requiresApproval: boolean;
  isGiftCard: boolean;
  productType?: string | null;
  genderTarget?: string | null;
  redemptionLimitPerCustomer?: number | null;
  termsConditions?: string | null;
  category?: { id: string; code: string; name: string } | null;
};

type RedemptionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_STORE' | 'READY' | 'DELIVERED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

type Redemption = {
  id: string;
  requestCode: string;
  status: RedemptionStatus;
  pointsReserved: number;
  productNameSnapshot: string;
  productImageUrlSnapshot?: string | null;
  productDescriptionSnapshot?: string | null;
  productIsGiftCardSnapshot?: boolean;
  requestedAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  product: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    pointsValue: number;
    imageUrl?: string | null;
    requiresApproval?: boolean;
    isGiftCard?: boolean;
  };
  pickupStore?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

type MarketingBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  tone: 'blue' | 'green' | 'pink' | 'amber' | 'violet';
  status?: string;
  startsAt: string;
  endsAt?: string | null;
  sortOrder: number;
};

type ClientNotification = {
  id: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMOTION' | 'SYSTEM';
  createdAt: string;
  expiresAt?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: { reason?: string } | null;
};

type StoreBrand = { id: string; name: string; code: string; logoUrl?: string | null };

type StoreProduct = {
  id: string;
  name: string;
  price: number;
  mainImageUrl?: string | null;
  stockQuantity: number;
  hasVariants?: boolean;
  isFeatured?: boolean;
  brand: { id: string; name: string; code: string };
};

type StoreCart = { items: Array<{ id: string; productId: string; quantity: number }> };

type StoreOrderSummary = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: string;
  clientPaymentStatus: string;
  clientVisibleStatus?: string;
  clientVisibleLabel?: string;
  totalAmount: number;
  suggestedDeliveryDate?: string;
  confirmedDeliveryDate?: string | null;
  createdAt: string;
};

type CustomerAddress = {
  id: string;
  label: string;
  addressType?: AddressType | null;
  department: string;
  municipality: string;
  zone?: string | null;
  addressLine: string;
  reference?: string | null;
  postalCode?: string | null;
  recipientName?: string | null;
  contactPhone: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  isActive?: boolean;
};

type AddressType = 'CASA' | 'TRABAJO' | 'OFICINA' | 'FAMILIA' | 'OTRO';
type AddressMode = 'list' | 'create' | 'edit';

type AddressFormState = {
  addressType: AddressType;
  label: string;
  department: string;
  municipality: string;
  zone: string;
  addressLine: string;
  reference: string;
  postalCode: string;
  recipientName: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
};

type InvoiceQrResult = {
  purchase: Purchase;
  pointsCalculated: number;
  status: 'APPROVED' | 'PENDING_REVIEW';
  reviewReasons: string[];
  store: { id: string; code: string; name: string };
  shoeType: { id: string; code: string; name: string };
};

type RedemptionDeliveryResult = {
  id: string;
  requestCode: string;
  status: string;
  productName: string;
  pointsReserved: number;
  deliveredAt: string;
  store: { name: string } | null;
};

export type ClientView = 'home' | 'benefits' | 'qr' | 'rewards' | 'points' | 'profile' | 'notifications';
type ProfileSection = 'menu' | 'personal' | 'address' | 'redemptions' | 'redemptionDetail' | 'purchases' | 'password';

const BRAND_CARD_IMAGES: Record<string, string> = {
  FLEXI: '/images/cards/optimized/1.png',
  'NINE WEST': '/images/cards/optimized/customer-card-nine-west.png',
  NINEWEST: '/images/cards/optimized/customer-card-nine-west.png',
};

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  CASA: 'Casa',
  TRABAJO: 'Trabajo',
  OFICINA: 'Oficina',
  FAMILIA: 'Familia',
  OTRO: 'Otro',
};

function emptyAddressForm(customer?: Customer | null): AddressFormState {
  return {
    addressType: 'CASA',
    label: '',
    department: '',
    municipality: '',
    zone: '',
    addressLine: '',
    reference: '',
    postalCode: '',
    recipientName: customer?.fullName ?? '',
    contactPhone: cleanPhone(customer?.phone ?? ''),
    latitude: null,
    longitude: null,
  };
}

function addressFormFromAddress(address: CustomerAddress, customer?: Customer | null): AddressFormState {
  return {
    addressType: address.addressType ?? 'CASA',
    label: address.label && address.label !== ADDRESS_TYPE_LABELS[address.addressType ?? 'CASA'] ? address.label : '',
    department: address.department,
    municipality: address.municipality,
    zone: address.zone ?? '',
    addressLine: address.addressLine,
    reference: address.reference ?? '',
    postalCode: address.postalCode ?? '',
    recipientName: address.recipientName ?? customer?.fullName ?? '',
    contactPhone: cleanPhone(address.contactPhone ?? customer?.phone ?? ''),
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
  };
}

function osmEmbedUrl(latitude: number, longitude: number) {
  const offset = 0.004;
  const bbox = [
    longitude - offset,
    latitude - offset,
    longitude + offset,
    latitude + offset,
  ].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

function googleMapsEmbedUrl(latitude: number, longitude: number) {
  const query = encodeURIComponent(`${latitude},${longitude}`);
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${query}&zoom=17`;
}

function addressMapEmbedUrl(latitude: number, longitude: number) {
  return GOOGLE_MAPS_API_KEY ? googleMapsEmbedUrl(latitude, longitude) : osmEmbedUrl(latitude, longitude);
}

function cardImageForBrand(brand?: string | null) {
  const defaultCard = BRAND_CARD_IMAGES.FLEXI;
  if (!brand) return defaultCard;
  const normalized = brand.trim().toUpperCase();
  const compact = normalized.replace(/[\s_-]+/g, '');
  return BRAND_CARD_IMAGES[normalized] ?? BRAND_CARD_IMAGES[compact] ?? defaultCard;
}

const nav: Array<{ label: string; icon: typeof Home; view?: ClientView; href: string; floating?: boolean }> = [
  { label: 'Inicio', icon: Home, view: 'home', href: '/' },
  { label: 'Puntos lealtad', icon: Star, view: 'points', href: '/mis-puntos' },
  { label: 'QR', icon: QrCode, view: 'qr', href: '/qr', floating: true },
  { label: 'Canjes', icon: Gift, view: 'rewards', href: '/premios' },
  { label: 'Perfil', icon: UserRound, view: 'profile', href: '/perfil' },
];

function isPageReload() {
  if (typeof window === 'undefined') return false;
  const [navigation] = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return navigation?.type === 'reload';
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ClientHomePage({ initialView = 'home', initialProfileSection = 'menu' }: { initialView?: ClientView; initialProfileSection?: ProfileSection } = {}) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [marketingBanners, setMarketingBanners] = useState<MarketingBanner[]>([]);
  const [storeMarketingBanners, setStoreMarketingBanners] = useState<MarketingBanner[]>([]);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [storeBrands, setStoreBrands] = useState<StoreBrand[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrderSummary[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [addressMode, setAddressMode] = useState<AddressMode>('list');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(() => emptyAddressForm());
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartProductQuantities, setCartProductQuantities] = useState<Record<string, { itemId: string; quantity: number }>>({});
  const [storeSearch, setStoreSearch] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [view, setView] = useState<ClientView>(initialView);
  const [profileSection, setProfileSection] = useState<ProfileSection>(initialProfileSection);
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<ClientNotification | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const viewedBannerIdsRef = useRef<Set<string>>(new Set());
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const loadSummaryRunRef = useRef(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [showAllRedemptions, setShowAllRedemptions] = useState(false);
  const [requestingReward, setRequestingReward] = useState<Reward | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardSearchInput, setRewardSearchInput] = useState('');
  const [showRewardFilters, setShowRewardFilters] = useState(false);
  const [rewardFilterType, setRewardFilterType] = useState('');
  const [rewardFilterGender, setRewardFilterGender] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const [catalogDepartments, setCatalogDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [catalogMunicipalities, setCatalogMunicipalities] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [isQrSubmitting, setIsQrSubmitting] = useState(false);
  const [qrResult, setQrResult] = useState<InvoiceQrResult | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionDeliveryResult | null>(null);
  const [qrMessage, setQrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [showQrResultPopup, setShowQrResultPopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const qrScanTimeoutRef = useRef<number | null>(null);
  const qrScanStopRef = useRef(false);
  const qrAutoStartAttemptedRef = useRef(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    zone: '',
    city: '',
    department: '',
    country: 'Guatemala',
    reference: '',
  });

  useEffect(() => {
    setAccessToken('session');
    if (isPageReload() && initialView !== 'home') {
      setView('home');
      window.history.replaceState(null, '', '/');
    }
    void loadSummary().catch(() => setIsLoading(false));
  }, []);

  useEffect(() => () => stopQrScanner(), []);

  useEffect(() => {
    if (profileSection === 'address' && catalogDepartments.length === 0) {
      void loadGuatemalaDepartments();
    }
  }, [profileSection, catalogDepartments.length]);

  useEffect(() => {
    if (view !== 'qr') {
      stopQrScanner();
      qrAutoStartAttemptedRef.current = false;
      return;
    }
    if (!accessToken || !summary || isQrScanning || isQrSubmitting || qrResult || qrAutoStartAttemptedRef.current) return;
    qrAutoStartAttemptedRef.current = true;
    void startQrScanner();
  }, [view, accessToken, summary, isQrScanning, isQrSubmitting, qrResult]);

  useEffect(() => {
    if (!qrResult) return;
    setShowQrResultPopup(true);
    const redirectTimer = window.setTimeout(() => {
      setShowQrResultPopup(false);
      setQrResult(null);
      setQrMessage(null);
      setView('home');
      window.history.replaceState(null, '', '/');
    }, 4000);
    return () => window.clearTimeout(redirectTimer);
  }, [qrResult]);

  useEffect(() => {
    if (!redemptionResult) return;
    const redirectTimer = window.setTimeout(() => {
      setRedemptionResult(null);
      setQrMessage(null);
      setView('home');
      window.history.replaceState(null, '', '/');
    }, 5000);
    return () => window.clearTimeout(redirectTimer);
  }, [redemptionResult]);

  const progressPercent = useMemo(() => {
    if (!summary?.level.nextLevelMinPurchases) return 100;
    const range = summary.level.nextLevelMinPurchases - summary.level.minPurchases;
    if (range <= 0) return 100;
    return Math.min(100, Math.round(((summary.purchasesCount - summary.level.minPurchases) / range) * 100));
  }, [summary]);

  const approximateBalance = useMemo(() => {
    const amount = summary ? summary.availablePoints * 0.01 : 0;
    return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }, [summary]);

  const pointsExpiringText = useMemo(() => resolvePointsExpiringText(summary), [summary]);

  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const isStoreEnabled = storeBrands.length > 0 || storeProducts.length > 0;
  const defaultAddress = customerAddresses.find((address) => address.isDefault) ?? customerAddresses[0] ?? null;
  const homeDeliveryAddress = defaultAddress ? formatDeliveryAddress(defaultAddress) : undefined;
  const activeStoreOrders = useMemo(() => storeOrders.filter((order) => !isFinalStoreOrder(order)), [storeOrders]);
  const featuredBrands = useMemo(() => storeBrands.slice(0, 5), [storeBrands]);
  const featuredProducts = useMemo(() => {
    const highlighted = storeProducts.filter((product) => product.isFeatured);
    return highlighted.length > 0 ? highlighted : storeProducts;
  }, [storeProducts]);

  useEffect(() => {
    if (!summary?.customer) return;
    const nameParts = splitCustomerName(summary.customer.fullName);

    setProfileForm({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: summary.customer.phone ?? '',
      email: summary.customer.email ?? '',
      address: summary.customer.address ?? '',
      zone: '',
      city: summary.customer.city ?? '',
      department: summary.customer.department ?? '',
      country: 'Guatemala',
      reference: summary.customer.reference ?? '',
    });
  }, [summary?.customer]);

  useEffect(() => {
    if (!message || message.type === 'error') return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  function getCsrfCookie() {
    const match = document.cookie.match(/(?:^|; )client_csrf=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function syncStoreCart(cart: StoreCart) {
    setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
    setCartProductQuantities(Object.fromEntries(
      cart.items.map((item) => [item.productId, { itemId: item.id, quantity: item.quantity }]),
    ));
  }

  async function apiRequest<T>(path: string, options: RequestInit = {}, skipAuthRetry = false): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const buildHeaders = () => {
      const csrfToken = getCsrfCookie();
      return {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...options.headers,
      };
    };

    let response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers: buildHeaders() });

    if (response.status === 401 && !skipAuthRetry) {
      await refreshClientSession();
      response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers: buildHeaders() });
    }

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const issueText = body?.issues?.map((issue: { message: string }) => issue.message).join(' ');
      throw new Error(issueText || body?.message || 'No se pudo completar la operacion.');
    }

    return body as T;
  }

  async function refreshClientSession() {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      const response = await fetch(`${API_BASE}/auth/customer/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      if (!response.ok) {
        setAccessToken(null);
        throw new Error(body?.message || 'Sesion expirada. Ingresa nuevamente.');
      }
      setAccessToken('session');
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    return refreshPromiseRef.current;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: 'Completa los campos requeridos.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await apiRequest<{ customer: Customer }>('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, true);

      setAccessToken('session');
      setShowGreeting(true);
      setTimeout(() => setShowGreeting(false), 10000);
      if (result.customer.mustChangePassword) {
        setPendingCustomer(result.customer);
        setPassword('');
        setMessage(null);
        return;
      }
      await loadSummary();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadSummary() {
    const runId = loadSummaryRunRef.current + 1;
    loadSummaryRunRef.current = runId;
    const startedAt = Date.now();
    setIsLoading(true);
    try {
      const [result, publicRewards, customerRedemptions, publicBanners, publicStoreBanners, customerNotifications, customerPurchases] = await Promise.all([
        apiRequest<Summary>('/client/summary'),
        apiRequest<Reward[]>('/rewards/public'),
        apiRequest<Redemption[]>('/redemptions/customer'),
        apiRequest<MarketingBanner[]>('/marketing-banners/public'),
        apiRequest<MarketingBanner[]>('/marketing-banners/public?placement=STORE'),
        apiRequest<ClientNotification[]>('/notifications/customer'),
        apiRequest<Purchase[]>('/client/purchases'),
      ]);
      const [publicBrands, publicProducts, activeCart, customerOrders, addresses] = await Promise.all([
        apiRequest<StoreBrand[]>('/pwa-client/store/brands').catch(() => []),
        apiRequest<StoreProduct[]>('/pwa-client/store/products').catch(() => []),
        apiRequest<StoreCart>('/pwa-client/store/cart').catch(() => ({ items: [] })),
        apiRequest<StoreOrderSummary[]>('/pwa-client/store/orders').catch(() => []),
        apiRequest<CustomerAddress[]>('/pwa-client/customer/addresses').catch(() => []),
      ]);
      if (result.customer.mustChangePassword) {
        setPendingCustomer(result.customer);
        setSummary(null);
        window.localStorage.removeItem('clientSummary');
        setMessage(null);
        return;
      }
      setPendingCustomer(null);
      setSummary(result);
      setRewards(publicRewards);
      setRedemptions(customerRedemptions);
      setMarketingBanners(publicBanners);
      setStoreMarketingBanners(publicStoreBanners);
      setNotifications(customerNotifications);
      setPurchaseHistory(customerPurchases);
      setStoreBrands(publicBrands);
      setStoreProducts(publicProducts);
      setStoreOrders(customerOrders);
      setCustomerAddresses(addresses);
      syncStoreCart(activeCart);
      if (initialView === 'home' && publicBrands.length === 0 && publicProducts.length === 0) {
        setView((currentView) => currentView === 'home' ? 'points' : currentView);
      }
      void recordBannerViews([...publicBanners.slice(0, 1), ...publicStoreBanners.slice(0, 1)], result.customer.sessionId);
      window.localStorage.removeItem('clientSummary');
    } catch (error) {
      if (!isMissingClientSessionError(error)) {
        setMessage({ type: 'error', text: getErrorText(error) });
      } else {
        setMessage(null);
      }
      window.localStorage.removeItem('clientSummary');
      setAccessToken(null);
      setSummary(null);
      setPendingCustomer(null);
      setRewards([]);
      setRedemptions([]);
      setMarketingBanners([]);
      setStoreMarketingBanners([]);
      setNotifications([]);
      setPurchaseHistory([]);
      setStoreBrands([]);
      setStoreProducts([]);
      setStoreOrders([]);
      setCustomerAddresses([]);
      setCartCount(0);
      setCartProductQuantities({});
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(MIN_CLIENT_LOADER_MS - elapsed, 0);
      if (remaining > 0) {
        await wait(remaining);
      }
      if (loadSummaryRunRef.current === runId) {
        setIsLoading(false);
      }
    }
  }

  async function logout() {
    try {
      if (accessToken) {
        await apiRequest('/auth/customer/logout', { method: 'POST' });
      }
    } catch {
      // Local logout still proceeds if the token has already expired.
    }

    window.localStorage.removeItem('clientSummary');
    setAccessToken(null);
    setSummary(null);
    setPendingCustomer(null);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setRewards([]);
    setRedemptions([]);
    setMarketingBanners([]);
    setStoreMarketingBanners([]);
    setNotifications([]);
    setPurchaseHistory([]);
    setCartCount(0);
    setCartProductQuantities({});
    setView('home');
    setProfileSection('menu');
    setSelectedRedemption(null);
    setEmail('');
    setMessage(null);
  }

  async function recordBannerViews(banners: MarketingBanner[], sessionId?: string | null) {
    const untrackedBanners = banners.filter((banner) => !viewedBannerIdsRef.current.has(banner.id));
    untrackedBanners.forEach((banner) => viewedBannerIdsRef.current.add(banner.id));

    await Promise.all(untrackedBanners.map((banner) => apiRequest(`/marketing-banners/public/${banner.id}/view`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: sessionId ?? null }),
    }).catch(() => null)));
  }

  async function startQrScanner() {
    setQrResult(null);
    setQrMessage(null);
    setQrError(null);

    if (!window.BarcodeDetector) {
      setQrError('Este navegador no permite escanear códigos QR con la cámara.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      window.localStorage.setItem('qrCameraPermission', 'granted');
      qrStreamRef.current = stream;
      qrScanStopRef.current = false;
      setIsQrScanning(true);
      qrScanTimeoutRef.current = window.setTimeout(() => {
        stopQrScanner();
        setQrError('No se pudo leer el código QR. Acércalo a la cámara, mejora la iluminación e intenta de nuevo.');
      }, 20000);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const scan = async () => {
        if (qrScanStopRef.current || !videoRef.current || !context) return;
        const video = videoRef.current;

        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const codes = await detector.detect(canvas).catch(() => []);
          const rawValue = codes[0]?.rawValue;
          if (rawValue) {
            stopQrScanner();
            await submitInvoiceQr(rawValue);
            return;
          }
        }

        window.setTimeout(() => void scan(), 350);
      };

      void scan();
    } catch {
      stopQrScanner();
      window.localStorage.removeItem('qrCameraPermission');
      setQrError('No se pudo abrir la cámara. Revisa los permisos del navegador e intenta de nuevo.');
    }
  }

  function stopQrScanner() {
    qrScanStopRef.current = true;
    if (qrScanTimeoutRef.current !== null) {
      window.clearTimeout(qrScanTimeoutRef.current);
      qrScanTimeoutRef.current = null;
    }
    qrStreamRef.current?.getTracks().forEach((track) => track.stop());
    qrStreamRef.current = null;
    setIsQrScanning(false);
  }

  async function submitInvoiceQr(rawValue: string) {
    const cleanValue = rawValue.trim();
    if (!cleanValue) {
      setQrError('No se pudo leer el código QR. Intenta de nuevo.');
      return;
    }

    if (/^RDM:/i.test(cleanValue)) {
      await confirmRedemptionDelivery(cleanValue);
      return;
    }

    setIsQrSubmitting(true);
    setQrMessage(null);
    setQrResult(null);

    try {
      const result = await apiRequest<InvoiceQrResult>('/client/invoice-qr', {
        method: 'POST',
        body: JSON.stringify({ rawValue: cleanValue }),
      });
      setQrResult(result);
      await loadSummary();
    } catch (error) {
      setQrError(getErrorText(error) || 'No se pudo registrar la factura del código QR.');
    } finally {
      setIsQrSubmitting(false);
    }
  }

  async function confirmRedemptionDelivery(rawValue: string) {
    setIsQrSubmitting(true);
    setQrMessage(null);
    setQrResult(null);
    setRedemptionResult(null);

    try {
      const result = await apiRequest<RedemptionDeliveryResult>('/redemptions/customer/confirm-delivery', {
        method: 'POST',
        body: JSON.stringify({ code: rawValue }),
      });
      setRedemptionResult(result);
      await loadSummary();
    } catch (error) {
      setQrError(getErrorText(error) || 'No se pudo confirmar la entrega del canje.');
    } finally {
      setIsQrSubmitting(false);
    }
  }

  function retryQrScanner() {
    stopQrScanner();
    setQrError(null);
    setQrMessage(null);
    setQrResult(null);
    setRedemptionResult(null);
    qrAutoStartAttemptedRef.current = true;
    window.setTimeout(() => void startQrScanner(), 100);
  }

  function handleBannerClick(banner: MarketingBanner) {
    void apiRequest(`/marketing-banners/public/${banner.id}/click`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: summary?.customer.sessionId ?? null }),
    }).catch(() => null);

    if (!banner.ctaUrl) return;
    const bannerWindow = window.open(banner.ctaUrl, '_blank', 'noopener,noreferrer');
    if (bannerWindow) bannerWindow.opener = null;
  }

  async function addStoreProductToCart(productId: string) {
    setAddingProductId(productId);
    setMessage(null);
    try {
      const cart = await apiRequest<StoreCart>('/pwa-client/store/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      syncStoreCart(cart);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setAddingProductId(null);
    }
  }

  async function decreaseStoreProductInCart(productId: string) {
    const current = cartProductQuantities[productId];
    if (!current) return;
    setAddingProductId(productId);
    setMessage(null);
    try {
      const nextQuantity = current.quantity - 1;
      const cart = nextQuantity > 0
        ? await apiRequest<StoreCart>(`/pwa-client/store/cart/items/${current.itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: nextQuantity }),
          })
        : await apiRequest<StoreCart>(`/pwa-client/store/cart/items/${current.itemId}`, { method: 'DELETE' });
      syncStoreCart(cart);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setAddingProductId(null);
    }
  }

  async function refreshCustomerAddresses() {
    const addresses = await apiRequest<CustomerAddress[]>('/pwa-client/customer/addresses');
    setCustomerAddresses(addresses);
    return addresses;
  }

  function openAddressList() {
    setAddressMode('list');
    setEditingAddressId(null);
    setAddressMessage(null);
  }

  function openAddressCreate() {
    setAddressMode('create');
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm(summary?.customer));
    setAddressMessage(null);
    void loadGuatemalaDepartments();
  }

  async function openAddressEdit(address: CustomerAddress) {
    setAddressMode('edit');
    setEditingAddressId(address.id);
    setAddressForm(addressFormFromAddress(address, summary?.customer));
    setAddressMessage(null);
    await loadGuatemalaDepartments(address.department);
  }

  async function saveCustomerAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contactPhone = cleanPhone(addressForm.contactPhone);
    if (!addressForm.department.trim() || !addressForm.municipality.trim() || !addressForm.addressLine.trim()) {
      setAddressMessage({ type: 'error', text: 'Completa los campos obligatorios.' });
      return;
    }
    if (contactPhone.length !== 8) {
      setAddressMessage({ type: 'error', text: 'El teléfono de contacto debe tener 8 dígitos.' });
      return;
    }

    setIsAddressSubmitting(true);
    setAddressMessage(null);
    try {
      const payload = {
        addressType: addressForm.addressType,
        label: addressForm.label.trim() || null,
        department: addressForm.department.trim(),
        municipality: addressForm.municipality.trim(),
        zone: addressForm.zone.trim() || null,
        addressLine: addressForm.addressLine.trim(),
        reference: addressForm.reference.trim() || null,
        postalCode: addressForm.postalCode.trim() || null,
        recipientName: addressForm.recipientName.trim() || null,
        contactPhone,
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
      };
      if (addressMode === 'edit' && editingAddressId) {
        await apiRequest<CustomerAddress>(`/pwa-client/customer/addresses/${editingAddressId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<CustomerAddress>('/pwa-client/customer/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await refreshCustomerAddresses();
      setAddressMode('list');
      setEditingAddressId(null);
      setAddressMessage({ type: 'success', text: addressMode === 'edit' ? 'Dirección actualizada.' : 'Dirección guardada.' });
    } catch (error) {
      setAddressMessage({ type: 'error', text: getErrorText(error) || 'No se pudo guardar la dirección.' });
    } finally {
      setIsAddressSubmitting(false);
    }
  }

  async function setDefaultAddress(addressId: string) {
    setAddressMessage(null);
    try {
      await apiRequest<CustomerAddress>(`/pwa-client/customer/addresses/${addressId}/default`, { method: 'PATCH' });
      await refreshCustomerAddresses();
    } catch (error) {
      setAddressMessage({ type: 'error', text: getErrorText(error) || 'No se pudo establecer la dirección principal.' });
    }
  }

  async function deleteCustomerAddress(addressId: string) {
    setAddressMessage(null);
    try {
      await apiRequest<CustomerAddress>(`/pwa-client/customer/addresses/${addressId}/inactivate`, { method: 'PATCH' });
      await refreshCustomerAddresses();
    } catch (error) {
      setAddressMessage({ type: 'error', text: getErrorText(error) || 'No se pudo eliminar la dirección.' });
    }
  }

  async function useCurrentAddressLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setAddressMessage({ type: 'error', text: 'Tu navegador no permite obtener la ubicación actual.' });
      return;
    }
    setIsLocatingAddress(true);
    setAddressMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddressForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setAddressMessage({ type: 'info', text: 'Ubicación capturada. Puedes completar o ajustar la dirección manualmente.' });
        setIsLocatingAddress(false);
      },
      () => {
        setAddressMessage({ type: 'error', text: 'No se pudo obtener tu ubicación. Puedes ingresar la dirección manualmente.' });
        setIsLocatingAddress(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function goToView(nextView: ClientView, href = '/') {
    setProfileSection('menu');
    setSelectedRedemption(null);
    setSelectedNotification(null);
    setRequestingReward(null);
    setShowAllRewards(false);
    setShowAllRedemptions(false);

    if (nextView === 'qr') {
      stopQrScanner();
      setQrError(null);
      setQrMessage(null);
      setQrResult(null);
      setShowQrResultPopup(false);
      qrAutoStartAttemptedRef.current = false;

      if (view === 'qr') {
        qrAutoStartAttemptedRef.current = true;
        window.setTimeout(() => void startQrScanner(), 100);
      }
    }

    setView(nextView);
    window.history.pushState(null, '', href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void loadSummary();
  }



  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiRequest('/auth/customer/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      setPendingCustomer(null);
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      await loadSummary();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadProfilePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setMessage(null);

    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await apiRequest('/media/customer/profile-photo', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'PROFILE_PHOTO',
          filename: file.name,
          mimeType: file.type,
          dataBase64,
        }),
      });

      await loadSummary();
      setMessage({ type: 'success', text: 'Foto de perfil actualizada.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  }

  async function markNotificationRead(notification: ClientNotification) {
    if (notification.isRead) return;

    try {
      await apiRequest(`/notifications/${notification.id}/customer/read`, { method: 'POST', body: JSON.stringify({}) });
      setNotifications((current) => current.map((row) => (
        row.id === notification.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row
      )));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    }
  }

  function openNotificationDetail(notification: ClientNotification) {
    setSelectedNotification(notification);
    void markNotificationRead(notification);
  }

  async function markAllNotificationsRead() {
    if (!notifications.some((notification) => !notification.isRead)) return;

    setIsMarkingAllRead(true);

    try {
      await apiRequest('/notifications/customer/read-all', { method: 'POST' });
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((row) => (row.isRead ? row : { ...row, isRead: true, readAt })));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  function openRewardRequest(reward: Reward) {
    setRequestingReward(reward);
  }

  function closeRewardRequest() {
    setRequestingReward(null);
  }

  async function confirmRequestReward() {
    if (!requestingReward) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const redemption = await apiRequest<Redemption>('/redemptions/customer/request', {
        method: 'POST',
        body: JSON.stringify({ productId: requestingReward.id }),
      });
      closeRewardRequest();
      await loadSummary();
      setMessage({
        type: 'success',
        text: redemption.status === 'DELIVERED'
          ? `Canje aplicado. Codigo: ${redemption.requestCode}`
          : `Canje solicitado. Codigo: ${redemption.requestCode}`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedPhone = cleanPhone(profileForm.phone);

    if (cleanedPhone.length !== 8) {
      setMessage({ type: 'error', text: 'El teléfono debe tener exactamente 8 dígitos.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiRequest('/client/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...profileForm,
          country: 'Guatemala',
          zone: null,
          phone: cleanedPhone,
        }),
      });
      await loadSummary();
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadGuatemalaDepartments(departmentName = profileForm.department) {
    try {
      const countries = await apiRequest<{ id: string; name: string; code: string }[]>('/client/catalogs/PAIS');
      const guatemala = countries.find((country) => normalizeLocation(country.name) === 'guatemala' || country.code.toUpperCase() === 'GT');
      if (!guatemala) throw new Error('No se encontró Guatemala en el catálogo de países.');
      const departments = await apiRequest<{ id: string; name: string; code: string }[]>(`/client/catalogs/DEPARTAMENTO?parentItemId=${guatemala.id}`);
      setCatalogDepartments(departments);

      const currentDepartment = departments.find((department) => department.name === departmentName);
      if (currentDepartment) {
        const municipalities = await apiRequest<{ id: string; name: string; code: string }[]>(`/client/catalogs/MUNICIPIO?parentItemId=${currentDepartment.id}`);
        setCatalogMunicipalities(municipalities);
      } else {
        setCatalogMunicipalities([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error) });
    }
  }

  if (isLoading && !summary) {
    return (
      <main className="client-stage">
        <section className="client-screen client-loading">
          <img alt="" className="client-loading-logo" src="/images/logo-lealtad.png" />
        </section>
      </main>
    );
  }

  if (accessToken && pendingCustomer) {
    return (
      <main className="client-stage">
        <section className="client-screen auth-client-screen modern-auth-screen">
          <AuthHeader
            subtitle="Por seguridad, debes crear una nueva contraseña para continuar."
            title="Cambia tu contraseña"
          />

          <form className="client-login modern-auth-card" onSubmit={changePassword}>
            {message ? <StatusMessage message={message} /> : null}
            <AuthField
              autoComplete="new-password"
              icon={LockKeyhole}
              label="Nueva contraseña"
              onChange={setNewPassword}
              placeholder="Ingresa tu nueva contraseña"
              showToggle
              toggleLabel={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onToggle={() => setShowNewPassword((current) => !current)}
            />
            <AuthField
              autoComplete="new-password"
              icon={LockKeyhole}
              label="Confirmar contraseña"
              onChange={setConfirmPassword}
              placeholder="Confirma tu contraseña"
              showToggle
              toggleLabel={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
            />
            <button className="client-primary modern-auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
              Guardar contraseña
            </button>
          </form>

          <SecurityNote />
        </section>
      </main>
    );
  }

  if (!accessToken || !summary) {
    return (
      <main className="client-stage">
        <section className="client-screen auth-client-screen modern-auth-screen">
          <AuthHeader
            subtitle="Accede a tu cuenta y disfruta de tus beneficios"
            title="Inicia sesión"
          />

          <form className="client-login modern-auth-card" onSubmit={handleLogin}>
            {message ? <StatusMessage message={message} /> : null}
            <AuthField
              autoComplete="email"
              icon={Mail}
              label="Correo electrónico"
              onChange={setEmail}
              placeholder="Ingresa tu correo electrónico"
              type="email"
              value={email}
            />
            <AuthField
              autoComplete="current-password"
              icon={LockKeyhole}
              label="Contraseña"
              onChange={setPassword}
              placeholder="Ingresa tu contraseña"
              showToggle
              toggleLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onToggle={() => setShowPassword((current) => !current)}
            />
            <a className="forgot-link" href="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
            <button className="client-primary modern-auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
              Iniciar sesión
            </button>
            <div className="register-row">
              <span>¿No tienes cuenta?</span>
              <a href="/registro">Regístrate aquí</a>
            </div>
          </form>

          <SecurityNote />
        </section>
      </main>
    );
  }

  return (
    <main className="client-stage">
      <section className="client-screen">
        {isLoading ? (
          <div className="client-refresh-overlay" role="status" aria-live="polite">
            <img alt="" src="/images/logo-lealtad.png" />
          </div>
        ) : null}
        {!(view === 'profile' && profileSection === 'menu') ? (
          <ClientTopHeader
            cartCount={view === 'home' && isStoreEnabled ? cartCount : undefined}
            customerName={summary.customer.fullName}
            deliveryAddress={view === 'home' && isStoreEnabled && !showGreeting ? homeDeliveryAddress : undefined}
            showGreeting={showGreeting || (view === 'profile' && profileSection === 'address')}
            subtitle={view === 'points' || (view === 'home' && !isStoreEnabled) ? 'Tus beneficios y puntos al día' : undefined}
            unreadNotifications={unreadNotifications}
          />
        ) : null}

        <section className={`client-content${view === 'profile' && profileSection === 'menu' ? ' client-content-profile' : ''}`}>
          {message ? <StatusMessage message={message} /> : null}

          {view === 'home' ? (
          isStoreEnabled ? (
            <StoreHomeDashboard
              activeOrders={activeStoreOrders}
              addingProductId={addingProductId}
              banners={storeMarketingBanners}
              brands={featuredBrands}
              cartProductQuantities={cartProductQuantities}
              products={featuredProducts}
              search={storeSearch}
              onAddToCart={(productId) => void addStoreProductToCart(productId)}
              onBannerClick={(banner) => void handleBannerClick(banner)}
              onDecreaseCart={(productId) => void decreaseStoreProductInCart(productId)}
              onSearchChange={setStoreSearch}
              onSearchSubmit={(value) => {
                const term = value.trim();
                window.location.href = term ? `/tienda-online?q=${encodeURIComponent(term)}` : '/tienda-online';
              }}
            />
          ) : (
            <LoyaltyDashboard
              approximateBalance={approximateBalance}
              banners={marketingBanners}
              cardImageUrl={summary.brandCardImageUrl}
              cardTextColor={summary.brandCardTextColor}
              lastMovement={summary.movements[0] ?? null}
              level={summary.level}
              pointsExpiringText={pointsExpiringText}
              progressPercent={progressPercent}
              summary={summary}
              onBannerClick={(banner) => void handleBannerClick(banner)}
            />
          )
          ) : null}

          {view === 'points' ? (
          <LoyaltyDashboard
            approximateBalance={approximateBalance}
            banners={marketingBanners}
            cardImageUrl={summary.brandCardImageUrl}
            cardTextColor={summary.brandCardTextColor}
            lastMovement={summary.movements[0] ?? null}
            level={summary.level}
            pointsExpiringText={pointsExpiringText}
            progressPercent={progressPercent}
            summary={summary}
            onBannerClick={(banner) => void handleBannerClick(banner)}
          />
          ) : null}

          {view === 'qr' ? (
          <section className="invoice-qr-panel">
            <div className="client-section-head profile-section-head">
              <h2>Registro</h2>
            </div>

            <article className="qr-scanner-card">
              <div className={`qr-camera-frame${isQrScanning ? ' scanning' : ''}`}>
                <video ref={videoRef} muted playsInline />
              </div>

              <div className="qr-scan-instructions">
                <strong>Escanea el QR de tu factura</strong>
                <p>Coloca el código dentro del recuadro, mantén buena iluminación y espera unos segundos. El registro se hará automáticamente.</p>
              </div>

              {isQrSubmitting ? <div className="qr-processing"><Loader2 className="spin" size={22} /> Registrando factura...</div> : null}

              {qrMessage ? <div className={`client-status ${qrMessage.type}`}>{qrMessage.text}</div> : null}
            </article>
          </section>
          ) : null}

          {view === 'notifications' && !selectedNotification ? (
          <section>
            <div className="client-section-head profile-section-head">
              <h2>Notificaciones</h2>
              {notifications.some((notification) => !notification.isRead) ? (
                <button className="mini-action" disabled={isMarkingAllRead} onClick={() => void markAllNotificationsRead()} type="button">
                  {isMarkingAllRead ? 'Marcando...' : 'Marcar todas leidas'}
                </button>
              ) : null}
            </div>
            <article className="client-activity">
              {notifications.length ? notifications.map((notification) => (
                <button
                  className={`notification-row ${notification.isRead ? 'read' : ''}`}
                  key={notification.id}
                  onClick={() => openNotificationDetail(notification)}
                  type="button"
                >
                  <div className={`activity-icon ${notification.isRead ? 'neutral' : 'positive'}`}>
                    <Bell size={21} />
                  </div>
                  <div>
                    <strong>{notification.title}</strong>
                  </div>
                  <span>{notification.isRead ? 'Leida' : 'Nueva'}</span>
                </button>
              )) : (
                <div className="client-empty">Aun no tienes notificaciones.</div>
              )}
            </article>
          </section>
          ) : null}

          {view === 'notifications' && selectedNotification ? (
          <section>
            <div className="client-section-head profile-section-head">
              <h2>Detalle de notificacion</h2>
              <button className="mini-action" onClick={() => setSelectedNotification(null)} type="button">Regresar</button>
            </div>
            <article className="redemption-detail-card">
              <strong>{selectedNotification.title}</strong>
              <p>{selectedNotification.body}</p>
              <dl>
                <div><dt>Tipo</dt><dd>{notificationTypeLabel(selectedNotification.type)}</dd></div>
                <div><dt>Recibida</dt><dd>{formatNumericDate(selectedNotification.createdAt)}</dd></div>
                <div><dt>Estado</dt><dd>{selectedNotification.isRead ? 'Leida' : 'Nueva'}</dd></div>
                {selectedNotification.readAt ? <div><dt>Leida el</dt><dd>{formatNumericDate(selectedNotification.readAt)}</dd></div> : null}
                {selectedNotification.expiresAt ? <div><dt>Vence</dt><dd>{formatNumericDate(selectedNotification.expiresAt)}</dd></div> : null}
                {selectedNotification.metadata?.reason ? <div><dt>Motivo</dt><dd>{selectedNotification.metadata.reason}</dd></div> : null}
              </dl>
            </article>
          </section>
          ) : null}

          {view === 'benefits' ? (
          <section>
            <div className="client-section-head">
              <h2>Ofertas y promociones</h2>
              <button className="mini-action" onClick={() => setView('benefits')} type="button">Ver todas <ChevronRight size={18} /></button>
            </div>
            <div className="promo-scroll">
              {marketingBanners.length ? marketingBanners.map((banner) => (
                <article
                  className={`promo-card ${banner.tone}`}
                  key={banner.id}
                  onClick={() => void handleBannerClick(banner)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void handleBannerClick(banner);
                    }
                  }}
                  role="button"
                  style={banner.imageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58)), url(${absoluteMediaUrl(banner.imageUrl)})` } : undefined}
                  tabIndex={0}
                >
                  {banner.badge ? <span>{banner.badge}</span> : null}
                  <strong>{banner.title}</strong>
                  <p>{banner.subtitle ?? 'Disponible por tiempo limitado'}</p>
                  {banner.endsAt ? <small>Valido hasta {formatDate(banner.endsAt)}</small> : null}
                </article>
              )) : (
                <div className="client-empty">Aun no hay promociones disponibles.</div>
              )}
            </div>
          </section>
          ) : null}

          {view === 'benefits' ? (
          <section>
            <div className="client-section-head">
              <h2>Notificaciones</h2>
              <a className="mini-action" href="/notificaciones">Ver todas <ChevronRight size={18} /></a>
            </div>
            <article className="client-activity">
              {notifications.length ? notifications.slice(0, 3).map((notification) => (
                <button
                  className={`notification-row ${notification.isRead ? 'read' : ''}`}
                  key={notification.id}
                  onClick={() => void markNotificationRead(notification)}
                  type="button"
                >
                  <div className={`activity-icon ${notification.isRead ? 'neutral' : 'positive'}`}>
                    <Bell size={21} />
                  </div>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                  <span>{notification.isRead ? 'Leida' : 'Nueva'}</span>
                </button>
              )) : (
                <div className="client-empty">Aun no tienes notificaciones.</div>
              )}
            </article>
          </section>
          ) : null}

          {view === 'rewards' ? (
          <section className="catalog-section">
            <div className="catalog-header">
              <h2>Catalogo de canjes</h2>
            </div>

            <div className="catalog-search-bar">
              <Search size={18} className="catalog-search-icon" />
              <input
                placeholder="Buscar productos de canje..."
                value={rewardSearchInput}
                onChange={(e) => setRewardSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setRewardSearch(rewardSearchInput); (e.target as HTMLInputElement).blur(); } }}
              />
              {rewardSearchInput ? (
                <button
                  className="catalog-search-clear"
                  type="button"
                  onClick={() => { setRewardSearchInput(''); setRewardSearch(''); }}
                  aria-label="Limpiar"
                >✕</button>
              ) : null}
              <button className="catalog-filter-button" type="button" onClick={() => setShowRewardFilters(true)} aria-label="Filtros">
                <SlidersHorizontal size={18} />
                {(rewardFilterType ? 1 : 0) + (rewardFilterGender ? 1 : 0) > 0 ? <span className="catalog-filter-badge">{(rewardFilterType ? 1 : 0) + (rewardFilterGender ? 1 : 0)}</span> : null}
              </button>
            </div>

            <div className="catalog-grid">
              {(() => {
                const filteredRewards = rewards.filter((r) =>
                  (!rewardSearch || r.name.toLowerCase().includes(rewardSearch.toLowerCase())) &&
                  (!rewardFilterType || r.productType === rewardFilterType) &&
                  (!rewardFilterGender || r.genderTarget === rewardFilterGender),
                );
                return filteredRewards.length > 0
                ? filteredRewards
                    .map((reward, index) => {
                      const isOutOfStock = reward.availableStock !== null && reward.availableStock !== undefined && reward.availableStock <= 0;
                      const cannotAfford = summary.availablePoints < reward.pointsValue;

                      return (
                        <article className={`catalog-card${cannotAfford ? ' catalog-card-locked' : ''}`} key={reward.id}>
                          <div className="catalog-card-image">
                            {reward.imageUrl
                              ? <img src={absoluteMediaUrl(reward.imageUrl)} alt={reward.name} />
                              : <div className={`catalog-card-art ${rewardShape(index)}`} />
                            }
                          </div>
                          <div className="catalog-card-body">
                            <strong>{reward.name}</strong>
                            <p className="catalog-card-pts">
                              <Star size={14} />
                              {reward.pointsValue.toLocaleString('es-GT')} pts
                            </p>
                            {reward.category ? <span className="catalog-card-cat">{reward.category.name}</span> : null}
                            <button
                              className="catalog-card-btn"
                              disabled={isSubmitting || cannotAfford || isOutOfStock}
                              onClick={() => openRewardRequest(reward)}
                              type="button"
                            >
                              {isOutOfStock ? 'Agotado' : 'Canjear'}
                            </button>
                          </div>
                          {cannotAfford ? (
                            <div className="catalog-card-lock" aria-label="Canje bloqueado por puntos insuficientes">
                              <LockKeyhole size={28} strokeWidth={2} />
                              <strong>Canje bloqueado</strong>
                              <span>Puntos insuficientes</span>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                : <div className="client-empty" style={{ gridColumn: '1 / -1' }}>No encontramos canjes con esos filtros.</div>;
              })()}
            </div>

            {showRewardFilters ? (
              <div className="reward-modal-overlay" onClick={() => setShowRewardFilters(false)} role="presentation">
                <section className="reward-modal reward-filter-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="client-section-head reward-modal-head"><h3>Filtros</h3></div>
                  <label className="reward-filter-field">Tipo
                    <select value={rewardFilterType} onChange={(e) => setRewardFilterType(e.target.value)}>
                      <option value="">Todos</option>
                      {REWARD_TYPE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </label>
                  <label className="reward-filter-field">Género
                    <select value={rewardFilterGender} onChange={(e) => setRewardFilterGender(e.target.value)}>
                      <option value="">Todos</option>
                      {REWARD_GENDER_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </label>
                  <div className="modal-actions">
                    <button className="modal-cancel-button" type="button" onClick={() => { setRewardFilterType(''); setRewardFilterGender(''); }}>Limpiar</button>
                    <button className="modal-confirm-button" type="button" onClick={() => setShowRewardFilters(false)}>Aplicar</button>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
          ) : null}

          {view === 'profile' ? (
          <section className={profileSection === 'menu' ? 'profile-fullpage' : ''}>
            {profileSection !== 'menu' && profileSection !== 'address' ? (
              <ProfileSectionHeader
                currentSection={profileSection}
                onBack={() => {
                  setProfileSection('menu');
                  setSelectedRedemption(null);
                }}
              />
            ) : null}

            {profileSection === 'menu' ? (
              <>
                {/* Blue hero header */}
                <div className="profile-page-header">
                  <h2 className="profile-page-title">Mi perfil</h2>
                </div>

                {/* White floating card */}
                <div className="profile-info-card">
                  <div className="profile-info-avatar">
                    {summary.customer.profilePhotoUrl
                      ? <img src={absoluteMediaUrl(summary.customer.profilePhotoUrl)} alt={summary.customer.fullName} />
                      : <span>{initials(summary.customer.fullName)}</span>
                    }
                  </div>
                  <div className="profile-info-text">
                    <strong>{summary.customer.fullName}</strong>
                    <p>{summary.customer.email ?? summary.customer.phone}</p>
                    <div className="profile-info-badges">
                      <span className="profile-pill gold">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 2h10v2H7v-2z"/></svg>
                        {summary.level.name}
                      </span>
                      <span className="profile-pill blue">
                        <Star size={12} />
                        {summary.availablePoints.toLocaleString('es-GT')} puntos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Option cards */}
                <div className="profile-menu-list">
                  <button className="profile-menu-item" onClick={() => setProfileSection('personal')} type="button">
                    <span className="profile-menu-icon"><UserRound size={22} /></span>
                    <div className="profile-menu-text">
                      <strong>Datos personales</strong>
                      <small>Nombre, apellido, NIT, correo y teléfono</small>
                    </div>
                    <ChevronRight size={20} className="profile-menu-arrow" />
                  </button>
                  <button className="profile-menu-item" onClick={() => { setProfileSection('address'); void loadGuatemalaDepartments(); }} type="button">
                    <span className="profile-menu-icon"><MapPin size={22} /></span>
                    <div className="profile-menu-text">
                      <strong>Direccion</strong>
                      <small>Departamento, municipio y dirección</small>
                    </div>
                    <ChevronRight size={20} className="profile-menu-arrow" />
                  </button>
                  <button className="profile-menu-item" onClick={() => setProfileSection('redemptions')} type="button">
                    <span className="profile-menu-icon"><Gift size={22} /></span>
                    <div className="profile-menu-text">
                      <strong>Historial de canjes</strong>
                      <small>Consulta tus canjes y ver detalle</small>
                    </div>
                    <ChevronRight size={20} className="profile-menu-arrow" />
                  </button>
                  <button className="profile-menu-item" onClick={() => setProfileSection('purchases')} type="button">
                    <span className="profile-menu-icon"><Receipt size={22} /></span>
                    <div className="profile-menu-text">
                      <strong>Historial de compras</strong>
                      <small>Consulta tus facturas registradas</small>
                    </div>
                    <ChevronRight size={20} className="profile-menu-arrow" />
                  </button>
                  <button className="profile-menu-item" onClick={() => setProfileSection('password')} type="button">
                    <span className="profile-menu-icon"><LockKeyhole size={22} /></span>
                    <div className="profile-menu-text">
                      <strong>Cambiar contraseña</strong>
                      <small>Actualiza tu acceso</small>
                    </div>
                    <ChevronRight size={20} className="profile-menu-arrow" />
                  </button>
                </div>

                <BrandSocialLinksCard socialLinks={summary.brandSocialLinks} />

                <button className="profile-signout-btn" onClick={() => void logout()} type="button">
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </>
            ) : null}

            {profileSection === 'personal' ? (
              <div className="profile-form-wrap">
                <div className="profile-photo-upload-area">
                  <div className="profile-photo-upload-avatar">
                    {summary.customer.profilePhotoUrl
                      ? <img src={absoluteMediaUrl(summary.customer.profilePhotoUrl)} alt={summary.customer.fullName} />
                      : <div className="profile-photo-initials">{initials(summary.customer.fullName)}</div>
                    }
                    {isUploadingPhoto ? <div className="profile-photo-uploading"><Loader2 className="spin" size={20} /></div> : null}
                  </div>
                  <label className="profile-photo-upload-btn">
                    {isUploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                    <input accept="image/jpeg,image/png,image/webp" disabled={isUploadingPhoto} hidden type="file" onChange={uploadProfilePhoto} />
                  </label>
                </div>
                <form className="profile-form" onSubmit={updateProfile}>
                  <label>
                    Nombre
                    <input value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} />
                  </label>
                  <label>
                    Apellido
                    <input value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} />
                  </label>
                  <label>
                    NIT
                    <input disabled value={summary.customer.taxId ?? ''} />
                  </label>
                  <label>
                    Correo electrónico
                    <input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
                  </label>
                  <label className="span-2">
                    Número de teléfono
                    <input
                      inputMode="numeric"
                      maxLength={8}
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm({ ...profileForm, phone: cleanPhone(event.target.value).slice(-8) })}
                      placeholder="55554444"
                    />
                  </label>
                  <button className="client-primary span-2" disabled={isSubmitting} type="submit">
                    {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
                    Guardar datos
                  </button>
                </form>
              </div>
            ) : null}

            {profileSection === 'address' ? (
              <AddressBookPanel
                addresses={customerAddresses}
                catalogDepartments={catalogDepartments}
                catalogMunicipalities={catalogMunicipalities}
                form={addressForm}
                isLocating={isLocatingAddress}
                isSubmitting={isAddressSubmitting}
                message={addressMessage}
                mode={addressMode}
                onBack={addressMode === 'list' ? () => setProfileSection('menu') : openAddressList}
                onCreate={openAddressCreate}
                onDelete={(addressId) => void deleteCustomerAddress(addressId)}
                onEdit={(address) => void openAddressEdit(address)}
                onFormChange={setAddressForm}
                onLoadMunicipalities={(departmentId) => void apiRequest<{ id: string; name: string; code: string }[]>(`/client/catalogs/MUNICIPIO?parentItemId=${departmentId}`).then(setCatalogMunicipalities)}
                onMunicipalitiesClear={() => setCatalogMunicipalities([])}
                onSave={saveCustomerAddress}
                onSetDefault={(addressId) => void setDefaultAddress(addressId)}
                onUseLocation={() => void useCurrentAddressLocation()}
              />
            ) : null}

            {profileSection === 'password' ? (
              <form className="profile-form" onSubmit={changePassword}>
                <label className="span-2">
                  Nueva contraseña
                  <div className="pw-input-wrap">
                    <input
                      autoComplete="new-password"
                      required
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button className="pw-toggle" type="button" onClick={() => setShowNewPassword((v) => !v)} aria-label={showNewPassword ? 'Ocultar' : 'Mostrar'}>
                      <PwEyeIcon open={!showNewPassword} />
                    </button>
                  </div>
                </label>
                <label className="span-2">
                  Confirmar contraseña
                  <div className="pw-input-wrap">
                    <input
                      autoComplete="new-password"
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repetir contraseña"
                    />
                    <button className="pw-toggle" type="button" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Ocultar' : 'Mostrar'}>
                      <PwEyeIcon open={!showConfirmPassword} />
                    </button>
                  </div>
                </label>
                <button className="client-primary span-2" disabled={isSubmitting || !newPassword || !confirmPassword} type="submit">
                  {isSubmitting ? <Loader2 className="spin" size={18} /> : null}
                  Actualizar contraseña
                </button>
              </form>
            ) : null}

            {profileSection === 'redemptions' ? (
              <article className="client-activity">
                {redemptions.length > 0 ? redemptions.map((redemption) => (
                  <button
                    className="notification-row redemption-list-button"
                    key={redemption.id}
                    onClick={() => {
                      setSelectedRedemption(redemption);
                      setProfileSection('redemptionDetail');
                    }}
                    type="button"
                  >
                    <div className={`activity-icon ${redemptionStatusTone(redemption.status)}`}>
                      {redemption.productImageUrlSnapshot || redemption.product.imageUrl
                        ? <img className="redemption-history-thumb" src={absoluteMediaUrl(redemption.productImageUrlSnapshot || redemption.product.imageUrl || '')} alt="" />
                        : <Gift size={21} />}
                    </div>
                    <div>
                      <strong>{redemption.productNameSnapshot || redemption.product.name}</strong>
                      {redemption.productIsGiftCardSnapshot || redemption.product.isGiftCard ? <span className="redemption-type-pill">Tarjeta de regalo</span> : null}
                      <p>Codigo: {redemption.product.code}</p>
                      <p>{formatDate(redemption.requestedAt)}</p>
                      <p>{redemptionStatusLabel(redemption.status)} · {redemption.pointsReserved.toLocaleString('es-GT')} pts</p>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                )) : (
                  <div className="client-empty">Aun no tienes canjes solicitados.</div>
                )}
              </article>
            ) : null}

            {profileSection === 'purchases' ? (
              <article className="client-activity">
                {purchaseHistory.length > 0 ? purchaseHistory.map((purchase) => (
                  <div className="notification-row" key={purchase.id}>
                    <div className="activity-icon positive">
                      <Receipt size={21} />
                    </div>
                    <div>
                      <strong>Factura No. {purchase.invoiceNumber}</strong>
                      <p>{purchase.store.name} · {formatDate(purchase.purchasedAt)}</p>
                      <p>Q{purchase.amount} · {purchasePointsLabel(purchase)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="client-empty">Aun no tienes compras registradas.</div>
                )}
              </article>
            ) : null}

            {profileSection === 'redemptionDetail' && selectedRedemption ? (
              <article className="redemption-detail-card">
                {(selectedRedemption.productImageUrlSnapshot || selectedRedemption.product.imageUrl) ? (
                  <img
                    className="redemption-detail-image"
                    src={absoluteMediaUrl(selectedRedemption.productImageUrlSnapshot || selectedRedemption.product.imageUrl || '')}
                    alt={selectedRedemption.productNameSnapshot || selectedRedemption.product.name}
                  />
                ) : null}
                <strong>{selectedRedemption.productNameSnapshot || selectedRedemption.product.name}</strong>
                <p>{selectedRedemption.productDescriptionSnapshot || selectedRedemption.product.description || 'Sin descripcion adicional.'}</p>
                <dl>
                  <div><dt>Codigo de canje</dt><dd>{selectedRedemption.requestCode}</dd></div>
                  <div><dt>Codigo de producto</dt><dd>{selectedRedemption.product.code}</dd></div>
                  <div><dt>Tipo</dt><dd>{selectedRedemption.productIsGiftCardSnapshot || selectedRedemption.product.isGiftCard ? 'Tarjeta de regalo' : 'Producto canjeable'}</dd></div>
                  <div><dt>Fecha del canje</dt><dd>{formatNumericDate(selectedRedemption.requestedAt)}</dd></div>
                  <div><dt>Puntos utilizados</dt><dd>{selectedRedemption.pointsReserved.toLocaleString('es-GT')} pts</dd></div>
                  <div><dt>Estado</dt><dd>{redemptionStatusLabel(selectedRedemption.status)}</dd></div>
                  {selectedRedemption.expiresAt ? <div><dt>Vence</dt><dd>{formatNumericDate(selectedRedemption.expiresAt)}</dd></div> : null}
                  {selectedRedemption.rejectionReason ? <div><dt>Motivo de rechazo</dt><dd>{selectedRedemption.rejectionReason}</dd></div> : null}
                  {selectedRedemption.cancellationReason ? <div><dt>Motivo de cancelacion</dt><dd>{selectedRedemption.cancellationReason}</dd></div> : null}
                </dl>
              </article>
            ) : null}
          </section>
          ) : null}

        </section>

        {requestingReward ? (
          <div className="reward-modal-overlay" onClick={closeRewardRequest} role="presentation">
            <section className="reward-modal" onClick={(event) => event.stopPropagation()}>
              <div className="client-section-head reward-modal-head">
                <h2>Confirmar canje</h2>
              </div>

              <div className="reward-modal-product">
                <strong>{requestingReward.name}</strong>
                <p>{requestingReward.description || 'Sin descripcion adicional.'}</p>
                <p><Star size={16} /> {requestingReward.pointsValue.toLocaleString('es-GT')} pts</p>
                {requestingReward.termsConditions ? <p className="reward-modal-terms">{requestingReward.termsConditions}</p> : null}
                {requestingReward.redemptionLimitPerCustomer ? (
                  <p>Limite de canjes por cliente: {requestingReward.redemptionLimitPerCustomer}</p>
                ) : null}
              </div>

              <div className="modal-actions">
                <button className="modal-cancel-button" disabled={isSubmitting} onClick={closeRewardRequest} type="button">
                  Cancelar
                </button>
                <button
                  className="modal-confirm-button"
                  disabled={isSubmitting}
                  onClick={() => void confirmRequestReward()}
                  type="button"
                >
                  {isSubmitting ? <Loader2 className="spin" size={16} /> : null}
                  Confirmar
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <nav className="client-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            if (item.floating) {
              return (
                <a
                  className={`client-nav-floating${item.view === view ? ' active' : ''}`}
                  href={item.href}
                  key={item.label}
                  onClick={(event) => {
                    event.preventDefault();
                    goToView(item.view as ClientView, item.href);
                  }}
                >
                  <span className="client-nav-floating-icon"><Icon size={26} /></span>
                  <span className="client-nav-floating-label">{item.label}</span>
                </a>
              );
            }
            return (
              <a
                className={item.view === view ? 'active' : ''}
                href={item.href}
                key={item.label}
                onClick={(event) => {
                  event.preventDefault();
                  goToView(item.view as ClientView, item.href);
                }}
              >
                <Icon size={24} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </section>

      {showQrResultPopup && qrResult ? (
        <div className="qr-result-overlay" role="status" aria-live="polite">
          <div className="qr-result-modal">
            <CheckCircle2 size={42} />
            <strong>{qrResult.status === 'APPROVED' ? 'Registro exitoso' : 'Factura enviada a revisión'}</strong>
            <b>{qrResult.pointsCalculated.toLocaleString('es-GT')} puntos</b>
            <p>Factura No. {qrResult.purchase.invoiceNumber} · Q{qrResult.purchase.amount}</p>
            <p>{qrResult.store.name}</p>
            <small>Volveremos al inicio en unos segundos.</small>
          </div>
        </div>
      ) : null}

      {redemptionResult ? (
        <div className="qr-result-overlay" role="status" aria-live="polite">
          <div className="qr-result-modal">
            <CheckCircle2 size={42} />
            <strong>¡Canje entregado!</strong>
            <b>{redemptionResult.productName}</b>
            <p>Código {redemptionResult.requestCode}</p>
            {redemptionResult.store ? <p>{redemptionResult.store.name}</p> : null}
            <small>Volveremos al inicio en unos segundos.</small>
          </div>
        </div>
      ) : null}

      {qrError ? (
        <div className="qr-result-overlay" role="alertdialog" aria-modal="true" aria-labelledby="qr-error-title">
          <div className="qr-result-modal qr-error-modal">
            <AlertCircle size={46} />
            <strong id="qr-error-title">No se pudo registrar</strong>
            <p>{qrError}</p>
            <button type="button" onClick={retryQrScanner}>Intentar de nuevo</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="modern-auth-header">
      <img alt="Sistema de Lealtad" src="/icons/icon-512.png" />
      <strong>Sistema de Lealtad</strong>
      <p>Tus compras, tus beneficios</p>
      <h1>{title}</h1>
      <span>{subtitle}</span>
    </header>
  );
}

function ProfileSectionHeader({
  currentSection,
  onBack,
}: {
  currentSection: ProfileSection;
  onBack: () => void;
}) {
  const titles: Record<ProfileSection, string> = {
    menu: 'Mi perfil',
    personal: 'Datos personales',
    address: 'Direccion',
    redemptions: 'Historial de canjes',
    redemptionDetail: 'Detalle del canje',
    purchases: 'Historial de compras',
    password: 'Cambiar contraseña',
  };

  return (
    <div className="client-section-head profile-section-head">
      <h2>{titles[currentSection]}</h2>
      {currentSection === 'menu' ? null : (
        <button className="mini-action" onClick={onBack} type="button">Regresar</button>
      )}
    </div>
  );
}

function AuthField({
  autoComplete,
  icon: Icon,
  label,
  onChange,
  onToggle,
  placeholder,
  showToggle = false,
  toggleLabel,
  type,
  value,
}: {
  autoComplete: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  onToggle?: () => void;
  placeholder: string;
  showToggle?: boolean;
  toggleLabel?: string;
  type: 'email' | 'password' | 'text';
  value: string;
}) {
  const ToggleIcon = type === 'password' ? Eye : EyeOff;

  return (
    <label className="modern-auth-field">
      <span>{label}</span>
      <div>
        <Icon size={24} />
        <input
          autoComplete={autoComplete}
          minLength={type === 'email' ? undefined : 8}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {showToggle && onToggle ? (
          <button aria-label={toggleLabel} onClick={onToggle} type="button">
            <ToggleIcon size={24} />
          </button>
        ) : null}
      </div>
    </label>
  );
}

function SecurityNote() {
  return (
    <aside className="auth-security-note">
    </aside>
  );
}

function AddressTypeIcon({ type }: { type?: AddressType | null }) {
  const normalized = type ?? 'CASA';
  const icons: Record<AddressType, typeof Home> = {
    CASA: Home,
    TRABAJO: Briefcase,
    OFICINA: Building2,
    FAMILIA: Heart,
    OTRO: MapPin,
  };
  const Icon = icons[normalized];
  return <Icon size={31} fill={normalized === 'FAMILIA' ? 'currentColor' : 'none'} />;
}

function AddressBookPanel({
  addresses,
  catalogDepartments,
  catalogMunicipalities,
  form,
  isLocating,
  isSubmitting,
  message,
  mode,
  onBack,
  onCreate,
  onDelete,
  onEdit,
  onFormChange,
  onLoadMunicipalities,
  onMunicipalitiesClear,
  onSave,
  onSetDefault,
  onUseLocation,
}: {
  addresses: CustomerAddress[];
  catalogDepartments: ClientLocationOption[];
  catalogMunicipalities: ClientLocationOption[];
  form: AddressFormState;
  isLocating: boolean;
  isSubmitting: boolean;
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
  mode: AddressMode;
  onBack: () => void;
  onCreate: () => void;
  onDelete: (addressId: string) => void;
  onEdit: (address: CustomerAddress) => void;
  onFormChange: (form: AddressFormState) => void;
  onLoadMunicipalities: (departmentId: string) => void;
  onMunicipalitiesClear: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSetDefault: (addressId: string) => void;
  onUseLocation: () => void;
}) {
  if (mode !== 'list') {
    const editing = mode === 'edit';
    const hasMapCoordinates = typeof form.latitude === 'number' && typeof form.longitude === 'number';
    return (
      <section className="address-redesign-page">
        <div className="address-form-heading">
          <button aria-label="Volver a mis direcciones" className="address-back-button" onClick={onBack} type="button">
            <ArrowLeft size={23} />
          </button>
          <div>
            <h2>{editing ? 'Editar dirección' : 'Nueva dirección'}</h2>
            <p>{editing ? 'Actualiza los datos de tu dirección de entrega.' : 'Completa los datos de tu dirección de entrega.'}</p>
          </div>
        </div>

        {message ? <div className={`address-status ${message.type}`}>{message.text}</div> : null}

        <article className="address-location-card">
          <span className="address-location-pin"><MapPin size={34} fill="currentColor" /></span>
          <div>
            <strong>Usar ubicación actual</strong>
          </div>
          <button disabled={isLocating} onClick={onUseLocation} type="button">
            {isLocating ? <Loader2 className="spin" size={18} /> : <LocateFixed size={18} />}
            Usar ubicación
          </button>
        </article>

        <form className="address-form-card" onSubmit={onSave}>
          <div className="address-fields-grid">
            <label>
              Tipo de dirección <b>*</b>
              <span className="address-select-shell">
                <span className={`address-type-dot ${form.addressType.toLowerCase()}`}><AddressTypeIcon type={form.addressType} /></span>
                <select value={form.addressType} onChange={(event) => onFormChange({ ...form, addressType: event.target.value as AddressType })}>
                  <option value="CASA">Casa</option>
                  <option value="TRABAJO">Trabajo</option>
                  <option value="OFICINA">Oficina</option>
                  <option value="FAMILIA">Familia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </span>
            </label>

            <label>
              Etiqueta (opcional)
              <input value={form.label} onChange={(event) => onFormChange({ ...form, label: event.target.value })} placeholder="Ej. Mi casa, Casa papá, etc." />
            </label>

            <ClientCatalogSearchField
              label="Departamento"
              options={catalogDepartments}
              value={form.department}
              onChange={(value, selected) => {
                onFormChange({ ...form, department: value, municipality: '', zone: '' });
                onMunicipalitiesClear();
                if (selected) onLoadMunicipalities(selected.id);
              }}
            />

            <ClientCatalogSearchField
              disabled={!form.department}
              label="Municipio"
              options={catalogMunicipalities}
              value={form.municipality}
              onChange={(value) => onFormChange({ ...form, municipality: value, zone: '' })}
            />

            <label className="span-2">
              Dirección específica / complemento <b>*</b>
              <input required value={form.addressLine} onChange={(event) => onFormChange({ ...form, addressLine: event.target.value })} />
            </label>
            <label className="span-2">
              Referencia (opcional)
              <input value={form.reference} onChange={(event) => onFormChange({ ...form, reference: event.target.value })} />
            </label>
            <label className="span-2">
              Código postal (opcional)
              <input value={form.postalCode} onChange={(event) => onFormChange({ ...form, postalCode: event.target.value })} />
            </label>
            <label className="span-2">
              Nombre del destinatario (opcional)
              <input value={form.recipientName} onChange={(event) => onFormChange({ ...form, recipientName: event.target.value })} />
            </label>
            <label className="span-2">
              Teléfono de contacto (opcional)
              <input inputMode="numeric" maxLength={8} value={form.contactPhone} onChange={(event) => onFormChange({ ...form, contactPhone: cleanPhone(event.target.value).slice(0, 8) })} />
            </label>
          </div>

          <article className="address-map-preview">
            <strong>Vista previa de la ubicación</strong>
            {hasMapCoordinates ? (
              <div className="address-real-map">
                <iframe
                  src={addressMapEmbedUrl(form.latitude as number, form.longitude as number)}
                  title="Vista previa de la ubicación"
                />
              </div>
            ) : (
              <div className="address-map-empty">
                <MapPin size={34} fill="currentColor" />
                <span>Usa tu ubicación para ver el mapa real.</span>
              </div>
            )}
          </article>

          <article className="address-info-card">
            <span><Info size={24} /></span>
            <div>
              <strong>Información</strong>
              <p>Las coordenadas se guardarán automáticamente para mejorar la precisión de tus entregas.</p>
            </div>
          </article>

          <button className="address-save-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={20} /> : <Save size={20} />}
            {editing ? 'Guardar cambios' : 'Guardar dirección'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="address-redesign-page">
      <div className="address-list-heading">
        <div>
          <h2>Mis direcciones</h2>
        </div>
        <button onClick={onCreate} type="button"><Plus size={16} />Nueva dirección</button>
      </div>

      {message ? <div className={`address-status ${message.type}`}>{message.text}</div> : null}

      <div className="address-card-list">
        {addresses.length ? addresses.map((address) => (
          <AddressListCard
            address={address}
            key={address.id}
            onDelete={onDelete}
            onEdit={onEdit}
            onSetDefault={onSetDefault}
          />
        )) : (
          <article className="address-empty-card">
            <span><MapPin size={34} /></span>
            <strong>Aún no tienes direcciones guardadas.</strong>
            <p>Agrega una dirección para usarla automáticamente al realizar tus pedidos.</p>
            <button onClick={onCreate} type="button"><Plus size={18} />Nueva dirección</button>
          </article>
        )}
      </div>

      <article className="address-info-card">
        <span><Info size={24} /></span>
        <div>
          <strong>Información</strong>
          <p>Puedes establecer una dirección principal. Esta se usará automáticamente al realizar tus pedidos.</p>
        </div>
      </article>
    </section>
  );
}

function AddressListCard({
  address,
  onDelete,
  onEdit,
  onSetDefault,
}: {
  address: CustomerAddress;
  onDelete: (addressId: string) => void;
  onEdit: (address: CustomerAddress) => void;
  onSetDefault: (addressId: string) => void;
}) {
  const type = address.addressType ?? 'CASA';
  const displayLabel = address.label || ADDRESS_TYPE_LABELS[type];
  return (
    <article className="address-list-card">
      <div className={`address-card-type ${type.toLowerCase()}`}>
        <span><AddressTypeIcon type={type} /></span>
        <strong>{ADDRESS_TYPE_LABELS[type]}</strong>
      </div>
      <div className="address-card-body">
        <h3>{displayLabel}</h3>
      </div>
      <div className="address-card-actions">
        <button className={address.isDefault ? 'address-default-badge active' : 'address-default-badge'} onClick={() => !address.isDefault && onSetDefault(address.id)} type="button">
          <Home size={17} fill={address.isDefault ? 'currentColor' : 'none'} />
          Principal
        </button>
        <button aria-label="Editar dirección" className="address-icon-button edit" onClick={() => onEdit(address)} type="button"><Pencil size={20} /></button>
        <button aria-label="Eliminar dirección" className="address-icon-button delete" onClick={() => onDelete(address.id)} type="button"><Trash2 size={20} /></button>
      </div>
    </article>
  );
}

function ClientTopHeader({
  cartCount,
  customerName,
  deliveryAddress,
  showGreeting,
  subtitle,
  unreadNotifications,
}: {
  cartCount?: number;
  customerName: string;
  deliveryAddress?: string;
  showGreeting?: boolean;
  subtitle?: string;
  unreadNotifications: number;
}) {
  const shouldShowGreeting = showGreeting || Boolean(subtitle);
  return (
    <header className="client-mobile-header">
      <div className="client-mobile-header-main">
        <div>
          {shouldShowGreeting ? (
            <>
              <h1>¡Hola, {firstName(customerName)}! <span aria-hidden="true">👋</span></h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </>
          ) : deliveryAddress ? (
            <a className="delivery-pill in-header" href="/direcciones" aria-label="Cambiar direccion de entrega">
              <MapPin size={18} />
              <span>Entrega en: <b>{deliveryAddress}</b></span>
              <ChevronRight size={18} />
            </a>
          ) : null}
        </div>
        <div className="client-mobile-actions">
          <a className="client-icon-badge" aria-label="Notificaciones" href="/notificaciones">
            <Bell size={31} strokeWidth={2.1} />
            {unreadNotifications ? <span>{unreadNotifications}</span> : null}
          </a>
          {cartCount !== undefined ? (
            <a className="client-icon-badge" aria-label="Ver carrito" href="/tienda-online/carrito">
              <ShoppingCart size={32} strokeWidth={2.1} />
              {cartCount ? <span>{cartCount}</span> : null}
            </a>
          ) : null}
        </div>
      </div>
      {deliveryAddress && shouldShowGreeting ? (
        <a className="delivery-pill" href="/direcciones" aria-label="Cambiar direccion de entrega">
          <MapPin size={22} />
          <span>Entrega en: <b>{deliveryAddress}</b></span>
          <ChevronRight size={22} />
        </a>
      ) : null}
    </header>
  );
}

function StoreHomeDashboard({
  activeOrders,
  addingProductId,
  banners,
  brands,
  cartProductQuantities,
  products,
  search,
  onAddToCart,
  onBannerClick,
  onDecreaseCart,
  onSearchChange,
  onSearchSubmit,
}: {
  activeOrders: StoreOrderSummary[];
  addingProductId: string | null;
  banners: MarketingBanner[];
  brands: StoreBrand[];
  cartProductQuantities: Record<string, { itemId: string; quantity: number }>;
  products: StoreProduct[];
  search: string;
  onAddToCart: (productId: string) => void;
  onBannerClick: (banner: MarketingBanner) => void;
  onDecreaseCart: (productId: string) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
}) {
  return (
    <>
      <StoreSearchBar search={search} onSearchChange={onSearchChange} onSearchSubmit={onSearchSubmit} />
      <FeaturedBrands brands={brands} />
      <BannerCarousel banners={banners} onBannerClick={onBannerClick} variant="store" />
      <FeaturedProducts
        addingProductId={addingProductId}
        cartProductQuantities={cartProductQuantities}
        products={products}
        onAddToCart={onAddToCart}
        onDecreaseCart={onDecreaseCart}
      />
      <ActiveOrdersCard orders={activeOrders} />
    </>
  );
}

function LoyaltyDashboard({
  approximateBalance,
  banners,
  cardImageUrl,
  cardTextColor,
  lastMovement,
  level,
  pointsExpiringText,
  progressPercent,
  summary,
  onBannerClick,
}: {
  approximateBalance: string;
  banners: MarketingBanner[];
  cardImageUrl?: string | null;
  cardTextColor?: string | null;
  lastMovement: PointMovement | null;
  level: Summary['level'];
  pointsExpiringText: string;
  progressPercent: number;
  summary: Summary;
  onBannerClick: (banner: MarketingBanner) => void;
}) {
  return (
    <>
      <CustomerPointsCard
        availablePoints={summary.availablePoints}
        approximateBalance={approximateBalance}
        brand={summary.customer.brand}
        cardImageUrl={cardImageUrl}
        cardTextColor={cardTextColor}
        pointsExpiringText={pointsExpiringText}
      />
      <CustomerLevelCard level={level} progressPercent={progressPercent} />
      <BannerCarousel banners={banners} onBannerClick={onBannerClick} variant="loyalty" />
      <LastMovementCard movement={lastMovement} />
    </>
  );
}

function StoreSearchBar({
  search,
  onSearchChange,
  onSearchSubmit,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
}) {
  return (
    <form
      className="store-dashboard-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearchSubmit(search);
      }}
    >
      <Search size={30} />
      <input
        aria-label="Buscar productos, marcas y mas"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar productos, marcas y más..."
        value={search}
      />
    </form>
  );
}

function FeaturedBrands({ brands }: { brands: StoreBrand[] }) {
  if (!brands.length) return null;
  return (
    <section className="store-brands-section">
      <SectionTitle href="/tienda-online/marcas" title="Marcas destacadas" />
      <div className="brand-bubbles">
        {brands.map((brand) => (
          <a className="brand-bubble-link" href={`/tienda-online?marca=${encodeURIComponent(brand.id)}`} key={brand.id}>
            <span className="brand-bubble">
              {brand.logoUrl ? <img alt={brand.name} src={absoluteMediaUrl(brand.logoUrl)} /> : <b>{brand.name.slice(0, 3)}</b>}
            </span>
            <strong>{brand.name}</strong>
          </a>
        ))}
      </div>
      <p className="brand-hint">☝︎ Toca una marca para ver sus productos</p>
    </section>
  );
}

function FeaturedProducts({
  addingProductId,
  cartProductQuantities,
  products,
  onAddToCart,
  onDecreaseCart,
}: {
  addingProductId: string | null;
  cartProductQuantities: Record<string, { itemId: string; quantity: number }>;
  products: StoreProduct[];
  onAddToCart: (productId: string) => void;
  onDecreaseCart: (productId: string) => void;
}) {
  const [position, setPosition] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (products.length <= 2) return;
    const timer = window.setInterval(() => {
      setIsFading(true);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        setPosition((current) => (current + 2) % products.length);
        setIsFading(false);
      }, 650);
    }, 5200);
    return () => {
      window.clearInterval(timer);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, [products.length]);

  useEffect(() => {
    if (position >= products.length) setPosition(0);
  }, [position, products.length]);

  if (!products.length) {
    return <div className="client-empty compact">No encontramos productos disponibles.</div>;
  }

  const visibleProducts = products.length <= 2
    ? products
    : [products[position], products[(position + 1) % products.length]].filter(Boolean);

  return (
    <section className="store-products-section">
      <SectionTitle href="/tienda-online" title="Productos destacados" />
      <div className={`featured-products-row${isFading ? ' is-fading' : ''}`}>
        {visibleProducts.map((product) => {
          const imageUrl = product.mainImageUrl ? absoluteMediaUrl(product.mainImageUrl) : null;
          const isAvailable = product.stockQuantity > 0;
          const quantity = cartProductQuantities[product.id]?.quantity ?? 0;
          const isBusy = addingProductId === product.id;
          return (
            <article className="featured-product-card" key={product.id}>
              <a href={`/tienda-online/producto/${product.id}`}>
                <span className="featured-product-image">
                  {imageUrl ? <img alt={product.name} src={imageUrl} /> : <ImageOff size={26} />}
                </span>
                <strong>{product.name}</strong>
                <b>{product.hasVariants ? 'Desde ' : ''}Q{formatMoney(product.price)}</b>
              </a>
              <div className="product-quantity-stepper" aria-label={`Cantidad de ${product.name}`}>
                <button disabled={product.hasVariants || isBusy || quantity <= 0} onClick={() => onDecreaseCart(product.id)} type="button" aria-label={`Quitar ${product.name}`}>-</button>
                <span>{quantity}</span>
                <button
                  disabled={!isAvailable || isBusy || (!product.hasVariants && quantity >= product.stockQuantity)}
                  onClick={() => {
                    if (product.hasVariants) {
                      window.location.href = `/tienda-online/producto/${product.id}`;
                      return;
                    }
                    onAddToCart(product.id);
                  }}
                  type="button"
                  aria-label={`Agregar ${product.name}`}
                >
                  +
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ActiveOrdersCard({ orders }: { orders: StoreOrderSummary[] }) {
  if (!orders.length) return null;
  const first = orders[0];
  const isSingleOrder = orders.length === 1;
  const countText = orders.length === 1 ? '1 pedido en curso' : `${orders.length} pedidos en curso`;
  const orderProgress = isSingleOrder ? getActiveOrderProgress(first) : [];
  return (
    <a className={`active-order-card${isSingleOrder ? ' single-order' : ''}`} href="/tienda-online/mis-pedidos">
      <span className="active-order-icon"><Truck size={25} /></span>
      <span className="active-order-copy">
        <small>Pedido en curso</small>
        <strong>{countText}</strong>
        {isSingleOrder ? (
          <span className="active-order-progress" aria-label="Estado del pedido">
            {orderProgress.map((step) => (
              <span className={step.state} key={step.key}><i />{step.label}</span>
            ))}
          </span>
        ) : null}
      </span>
      {!isSingleOrder ? (
        <span className="active-order-status">{first.clientVisibleLabel ?? storeOrderLabel(first)}</span>
      ) : null}
      <span className="active-order-link" aria-hidden="true"><ChevronRight size={18} /></span>
    </a>
  );
}

function getActiveOrderProgress(order: StoreOrderSummary) {
  const visibleStatus = order.clientVisibleStatus ?? '';
  const visibleLabel = order.clientVisibleLabel ?? storeOrderLabel(order);
  const paymentStep = ['PAGO_PENDIENTE', 'PAGO_EN_REVISION', 'PAGO_RECHAZADO'].includes(visibleStatus)
    ? visibleLabel
    : 'Pago confirmado';
  const steps = [
    { key: 'pedido', label: 'Pedido' },
    { key: 'pago', label: paymentStep },
    { key: 'preparacion', label: visibleStatus === 'ENTREGA_PROGRAMADA' ? 'Entrega programada' : 'Preparando' },
    { key: 'camino', label: ['NO_ENTREGADO', 'CANCELADO'].includes(visibleStatus) ? visibleLabel : 'En camino' },
  ];
  const currentIndexByStatus: Record<string, number> = {
    PEDIDO_SOLICITADO: 0,
    PAGO_PENDIENTE: 1,
    PAGO_EN_REVISION: 1,
    PAGO_RECHAZADO: 1,
    PAGO_CONFIRMADO: 1,
    PREPARANDO_PEDIDO: 2,
    ENTREGA_PROGRAMADA: 2,
    EN_CAMINO: 3,
    NO_ENTREGADO: 3,
    CANCELADO: 3,
  };
  const currentIndex = currentIndexByStatus[visibleStatus] ?? (order.deliveryStatus === 'EN_RUTA' ? 3 : 2);
  return steps.map((step, index) => ({
    ...step,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
  }));
}

function LastMovementCard({ movement }: { movement: PointMovement | null }) {
  if (!movement) {
    return <article className="last-movement-card empty">Aun no tienes movimientos de puntos.</article>;
  }
  const isPositive = movement.points >= 0;
  return (
    <article className="last-movement-card">
      <span className="last-movement-icon"><ShoppingBag size={28} /></span>
      <span className="last-movement-copy">
        <small>ÚLTIMO MOVIMIENTO</small>
        <span>{movement.description ?? (movement.purchase?.store?.name ? `Compra registrada en ${movement.purchase.store.name}` : 'Movimiento de puntos')}</span>
        <em>{formatMovementDate(movement.createdAt)}</em>
      </span>
      <b className={isPositive ? 'positive' : 'negative'}>{isPositive ? '+' : ''}{movement.points.toLocaleString('es-GT')} pts</b>
      <ChevronRight size={23} />
    </article>
  );
}

function SectionTitle({ href, title }: { href: string; title: string }) {
  return (
    <div className="store-section-title">
      <h2>{title}</h2>
      <a href={href}>Ver todos <ChevronRight size={20} /></a>
    </div>
  );
}

function CustomerPointsCard({
  availablePoints,
  approximateBalance,
  pointsExpiringText,
  brand,
  cardImageUrl,
  cardTextColor,
}: {
  availablePoints: number;
  approximateBalance: string;
  pointsExpiringText: string;
  brand?: string | null;
  cardImageUrl?: string | null;
  cardTextColor?: string | null;
}) {
  const fallbackCardImg = cardImageForBrand(brand);
  const sourceCardImg = cardImageUrl ? absoluteMediaUrl(cardImageUrl) : fallbackCardImg;
  const [cardImg, setCardImg] = useState(sourceCardImg);

  useEffect(() => {
    setCardImg(sourceCardImg);
  }, [sourceCardImg]);

  return (
    <div className="loyalty-card-wrap">
      <div className="loyalty-card-blob" aria-hidden="true" />
      <article
        className="loyalty-card"
        style={{
          '--loyalty-text-color': cardTextColor ?? '#111827',
        } as React.CSSProperties & { '--loyalty-text-color': string }}
      >
        <img
          alt=""
          className="loyalty-card-image"
          decoding="async"
          onError={() => {
            if (cardImg !== fallbackCardImg) setCardImg(fallbackCardImg);
          }}
          src={cardImg}
        />
        <div className="loyalty-card-overlay">
          <p className="loyalty-label">MIS PUNTOS DISPONIBLES</p>
          <strong className="loyalty-pts">
            {availablePoints.toLocaleString('es-GT')} <span>pts</span>
          </strong>
          <div className="loyalty-divider" />
          <p className="loyalty-info">
            <CreditCard size={17} />
            <span>Equivalente aproximado&nbsp;&nbsp;Q{approximateBalance}</span>
          </p>
          <p className="loyalty-info">
            <ShoppingBag size={17} />
            {pointsExpiringText}
          </p>
        </div>
      </article>
    </div>
  );
}

function CustomerLevelCard({
  level,
  progressPercent,
}: {
  level: Summary['level'];
  progressPercent: number;
}) {
  return (
    <article className="level-card-premium">
      <div className="level-card-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#0c1b3a" stroke="rgba(212,168,75,0.5)" strokeWidth="1.5"/>
          <path d="M16 4 L17.4 13.2 L25.6 9.8 L19.8 16 L25.6 22.2 L17.4 18.8 L16 28 L14.6 18.8 L6.4 22.2 L12.2 16 L6.4 9.8 L14.6 13.2 Z" fill="#d4a84b" opacity="0.9"/>
        </svg>
      </div>
      <div className="level-card-body">
        <span className="level-card-label">TU NIVEL ACTUAL</span>
        <strong className="level-card-name">Nivel {level.name}</strong>
        <div className="level-card-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="level-card-hint">
          {level.nextLevelName
            ? `Faltan ${level.remainingPurchases.toLocaleString('es-GT')} compras para subir de nivel`
            : 'Nivel maximo alcanzado'}
        </p>
      </div>
      <div className="level-card-right">
        <span className="level-card-pct">{progressPercent}%</span>
      </div>
    </article>
  );
}

function QuickAccessGrid() {
  const quickAccess = [
    { label: 'Mis puntos', href: '/mis-puntos', icon: Star, tone: 'blue' },
    { label: 'Tienda', href: '/tienda-online', icon: ShoppingBag, tone: 'amber' },
    { label: 'Mis pedidos', href: '/tienda-online/mis-pedidos', icon: ClipboardList, tone: 'red' },
    { label: 'Canjes', href: '/premios', icon: Gift, tone: 'green' },
    { label: 'Perfil', href: '/perfil', icon: UserRound, tone: 'violet' },
  ] as const;

  return (
    <section className="quick-access-section">
      <h2>Accesos rapidos</h2>
      <div className="quick-access-grid">
        {quickAccess.map((item) => {
          const Icon = item.icon;
          return (
            <a className="quick-access-card" href={item.href} key={item.label}>
              <span className={`quick-access-icon ${item.tone}`}>
                <Icon size={25} fill={item.label === 'Mis puntos' ? 'currentColor' : 'none'} />
              </span>
              <strong>{item.label}</strong>
              <ChevronRight size={23} />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function BannerCarousel({
  banners,
  onBannerClick,
  variant = 'loyalty',
}: {
  banners: MarketingBanner[];
  onBannerClick: (banner: MarketingBanner) => void;
  variant?: 'loyalty' | 'store';
}) {
  const count = banners.length;
  const looping = count > 1;
  const [position, setPosition] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepNext = useCallback(() => {
    setPosition((p) => (count ? (p + 1) % count : 0));
  }, [count]);

  const stepPrev = useCallback(() => {
    setPosition((p) => (count ? (p - 1 + count) % count : 0));
  }, [count]);

  const jumpTo = useCallback((index: number) => {
    setPosition(index);
  }, []);

  useEffect(() => {
    if (!looping) return;
    timerRef.current = setInterval(stepNext, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [looping, stepNext]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (looping) timerRef.current = setInterval(stepNext, 4000);
  };

  useEffect(() => {
    if (position >= count) setPosition(0);
  }, [count, position]);

  if (!count) return null;

  return (
    <section className={`promo-carousel ${variant}`}>
      <div className="promo-carousel-viewport">
        <div
          className="promo-carousel-track"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(-${position * (100 / count)}%)`,
          }}
        >
          {banners.map((banner, i) => (
            <div
              className="promo-carousel-slide"
              key={banner.id}
              style={{
                width: `${100 / count}%`,
              }}
              onClick={() => onBannerClick(banner)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onBannerClick(banner); }}
            >
              {banner.imageUrl ? (
                <img
                  alt={banner.title}
                  className="promo-carousel-image"
                  decoding="async"
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={(event) => { event.currentTarget.classList.add('is-hidden'); }}
                  src={absoluteMediaUrl(banner.imageUrl)}
                />
              ) : (
                <div className="promo-carousel-text">
                  {banner.badge ? <span className="promo-badge">{banner.badge}</span> : null}
                  <strong>{banner.title}</strong>
                  {banner.subtitle ? <p>{banner.subtitle}</p> : null}
                </div>
              )}
            </div>
          ))}
        </div>
        {looping ? (
          <>
            <button className="promo-arrow left" type="button" onClick={(e) => { e.stopPropagation(); stepPrev(); resetTimer(); }} aria-label="Anterior">
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button className="promo-arrow right" type="button" onClick={(e) => { e.stopPropagation(); stepNext(); resetTimer(); }} aria-label="Siguiente">
              <ChevronRight size={20} />
            </button>
          </>
        ) : null}
      </div>
      {looping ? (
        <div className="promo-dots" aria-hidden="true">
          {banners.map((b, i) => (
            <button
              key={b.id}
              className={`promo-dot${i === position ? ' active' : ''}`}
              type="button"
              onClick={() => { jumpTo(i); resetTimer(); }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SuggestedRewardCard({
  rewards,
  availablePoints,
  isSubmitting,
  onRedeem,
}: {
  rewards: Reward[];
  availablePoints: number;
  isSubmitting: boolean;
  onRedeem: (reward: Reward) => void;
}) {
  if (!rewards.length) {
    return (
      <article className="suggested-reward-card">
        <div className="suggested-reward-header">
          <span className="suggested-reward-icon">✦</span>
          <strong>Próximo canje</strong>
        </div>
        <div className="suggested-reward-empty">
          <span className="suggested-reward-img">
            <Gift size={36} strokeWidth={1.5} />
          </span>
          <div>
            <strong>Muy pronto tendrás premios disponibles</strong>
            <p>Sigue acumulando puntos para tu próximo canje.</p>
          </div>
        </div>
      </article>
    );
  }

  const affordable = rewards.filter((r) => availablePoints >= r.pointsValue && (r.availableStock === null || r.availableStock === undefined || r.availableStock > 0));
  const suggestion = affordable.length > 0
    ? affordable.reduce((a, b) => a.pointsValue >= b.pointsValue ? a : b)
    : rewards.reduce((a, b) => a.pointsValue <= b.pointsValue ? a : b);

  const canAfford = availablePoints >= suggestion.pointsValue;
  const missing = suggestion.pointsValue - availablePoints;

  return (
    <article className="suggested-reward-card">
      <div className="suggested-reward-header">
        <span className="suggested-reward-icon">✦</span>
        <strong>Próximo canje</strong>
      </div>
      <div className="suggested-reward-body">
        <div className="suggested-reward-img">
          {suggestion.imageUrl
            ? <img src={absoluteMediaUrl(suggestion.imageUrl)} alt={suggestion.name} />
            : <Gift size={36} strokeWidth={1.5} />
          }
        </div>
        <div className="suggested-reward-info">
          <strong>{suggestion.name}</strong>
          {suggestion.category ? <span className="suggested-reward-cat">{suggestion.category.name}</span> : null}
          <p className="suggested-reward-pts">{suggestion.pointsValue.toLocaleString('es-GT')} pts</p>
          <p className="suggested-reward-hint">{canAfford ? 'Disponible para canje' : `Te faltan ${missing.toLocaleString('es-GT')} pts`}</p>
          <button
            className="suggested-reward-btn"
            disabled={isSubmitting || !canAfford}
            onClick={() => onRedeem(suggestion)}
            type="button"
          >
            Canjear
          </button>
        </div>
      </div>
    </article>
  );
}

function BrandSocialLinksCard({ socialLinks }: { socialLinks?: BrandSocialLinks | null }) {
  const visibleLinks = socialLinkDefinitions.reduce<Array<(typeof socialLinkDefinitions)[number] & { url: string }>>((links, item) => {
    const url = socialLinks?.[item.key];
    if (url && isValidExternalUrl(url)) links.push({ ...item, url });
    return links;
  }, []);

  if (!visibleLinks.length) return null;

  return (
    <article className="brand-social-card">
      <div className="brand-social-header">
        <span className="brand-social-spark">✦</span>
        <div>
          <strong>Síguenos y contáctanos</strong>
          <p>Conéctate con nosotros en nuestras redes oficiales y atención directa.</p>
        </div>
      </div>
      <div className="brand-social-list">
        {visibleLinks.map((item) => (
          <a
            aria-label={item.label}
            className={`brand-social-link ${item.key}`}
            href={item.url}
            key={item.key}
            rel="noopener noreferrer"
            target="_blank"
          >
            <item.Icon />
          </a>
        ))}
      </div>
    </article>
  );
}

const socialLinkDefinitions = [
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { key: 'x', label: 'X / Twitter', Icon: XIcon },
  { key: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon },
  { key: 'website', label: 'Página web', Icon: WebsiteIcon },
] as const satisfies Array<{ key: SocialNetworkKey; label: string; Icon: () => React.JSX.Element }>;

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.4 22v-8.1h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.2H10V22h3.4Z"/></svg>;
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.1-2.25a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/>
    </svg>
  );
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.3 3c.3 2.2 1.5 3.6 3.7 3.8v3.1a7 7 0 0 1-3.7-1.1v6.1c0 3.1-2.1 5.6-5.5 5.6-3 0-5.3-2-5.3-4.9 0-3.4 2.8-5.2 6-5v3.2c-1.4-.2-2.7.4-2.7 1.8 0 1 .8 1.7 1.9 1.7 1.3 0 2.1-.8 2.1-2.5V3h3.5Z"/></svg>;
}

function XIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 10.6 20.3 3h-1.6L13 9.6 8.4 3H3.1l7 10.1L3.1 21h1.6l6.1-7 4.9 7H21l-7.3-10.4Zm-2.2 2.5-.7-1-5.6-8h2.4l4.5 6.5.7 1 5.9 8.4h-2.4l-4.8-6.9Z"/></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.5l-1 4.9 5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.5c-1.5 0-2.9-.4-4.1-1.2l-.3-.2-2.9.8.6-2.9-.2-.3A7.8 7.8 0 1 1 12 19.7Zm4.5-5.8c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-.2-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.5l.4-.4c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.9-2-.2-.5-.5-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.2-.2-.2-.5-.4Z"/></svg>;
}

function WebsiteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.3a15.2 15.2 0 0 0-1.1-5 8.1 8.1 0 0 1 4.4 5ZM12 4.1c.7 1 1.4 3.2 1.6 6.9h-3.2c.2-3.7.9-5.9 1.6-6.9ZM4.3 13h3.9c.1 1.9.4 3.7.9 5.1A8 8 0 0 1 4.3 13Zm3.9-2H4.3a8 8 0 0 1 4.8-5.1A18.5 18.5 0 0 0 8.2 11Zm3.8 8.9c-.7-1-1.4-3.2-1.6-6.9h3.2c-.2 3.7-.9 5.9-1.6 6.9Zm2.5-1.8c.5-1.4.8-3.2.9-5.1h3.3a8.1 8.1 0 0 1-4.2 5.1Z"/></svg>;
}

function isValidExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function StatusMessage({ message }: { message: { type: 'success' | 'error' | 'info'; text: string } }) {
  const Icon = message.type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`client-status ${message.type}`}>
      <Icon size={18} />
      <span>{message.text}</span>
    </div>
  );
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operacion.';
}

function isMissingClientSessionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('refresh token no proporcionado')
    || message.includes('sesion de cliente requerida')
    || message.includes('sesión de cliente requerida')
    || message.includes('token de cliente requerido')
    || message.includes('sesion expirada')
    || message.includes('sesión expirada');
}

function absoluteMediaUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/images/')) return value;
  return `${API_BASE.replace(/\/api$/, '')}${value}`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Cliente';
}

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function cleanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('502') && digits.length > 8 ? digits.slice(3) : digits;
}

function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CL';
}

function resolvePointsExpiringText(summary: Summary | null) {
  const nextExpiration = summary?.movements
    .filter((movement) => movement.status === 'AVAILABLE' && movement.points > 0 && movement.expiresAt)
    .sort((left, right) => new Date(left.expiresAt!).getTime() - new Date(right.expiresAt!).getTime())[0];

  if (!nextExpiration?.expiresAt) {
    return 'Puntos por vencer: sin vencimientos proximos';
  }

  return `Puntos por vencer: ${nextExpiration.points.toLocaleString('es-GT')} pts el ${formatNumericDate(nextExpiration.expiresAt)}`;
}

function rewardShape(index: number) {
  const shapes = ['buds', 'coffee', 'card', 'bag'];
  return shapes[index % shapes.length];
}

function notificationTypeLabel(type: ClientNotification['type']) {
  const labels: Record<ClientNotification['type'], string> = {
    INFO: 'Informativa',
    SUCCESS: 'Exito',
    WARNING: 'Advertencia',
    PROMOTION: 'Promocion',
    SYSTEM: 'Sistema',
  };

  return labels[type];
}

function redemptionStatusLabel(status: Redemption['status']) {
  const labels: Record<Redemption['status'], string> = {
    PENDING_APPROVAL: 'Pendiente de aprobación',
    APPROVED: 'Aprobado',
    SENT_TO_STORE: 'Enviado a tienda',
    READY: 'Listo para recoger',
    DELIVERED: 'Entregado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Vencido',
  };

  return labels[status];
}

function redemptionStatusTone(status: Redemption['status']) {
  if (status === 'DELIVERED') return 'positive';
  if (status === 'APPROVED' || status === 'READY' || status === 'SENT_TO_STORE') return 'neutral';
  if (status === 'PENDING_APPROVAL') return 'neutral';
  return 'negative';
}

function purchasePointsLabel(purchase: Purchase) {
  if (purchase.status === 'PENDING_REVIEW') return `${purchase.pointsCalculated.toLocaleString('es-GT')} pts en revisión`;
  if (purchase.status === 'REJECTED') return 'Sin puntos · factura rechazada';
  if (purchase.status === 'REVERSED') return 'Puntos revertidos';
  return `+${purchase.pointsCalculated.toLocaleString('es-GT')} pts acreditados`;
}

function isFinalStoreOrder(order: StoreOrderSummary) {
  const finalStatuses = new Set(['ENTREGADO', 'CANCELADO', 'CERRADO_POR_INCIDENCIA', 'PAQUETE_DEVUELTO']);
  const finalDelivery = new Set(['ENTREGADA', 'CANCELADA', 'DEVUELTA']);
  return finalStatuses.has(order.orderStatus) || finalDelivery.has(order.deliveryStatus);
}

function storeOrderLabel(order: StoreOrderSummary) {
  const labels: Record<string, string> = {
    PEDIDO_SOLICITADO: 'Solicitado',
    EN_REVISION: 'En revisión',
    CONFIRMADO_ADMIN: 'Confirmado',
    PENDIENTE_PAGO: 'Pendiente de pago',
    PAGO_CONFIRMADO: 'Pagado',
    PREPARANDO_PEDIDO: 'Preparando',
    ASIGNADO_MOTORISTA: 'Asignado',
    EN_RUTA: 'En camino',
    ENTREGADO: 'Entregado',
    NO_ENTREGADO: 'Incidencia',
    ENTREGA_FALLIDA: 'Incidencia',
  };
  return labels[order.clientVisibleStatus ?? ''] ?? labels[order.orderStatus] ?? 'En curso';
}

function formatDeliveryAddress(address: CustomerAddress) {
  return [address.addressLine, address.zone ? `Zona ${address.zone}` : null].filter(Boolean).join(', ');
}

function formatMovementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = new Intl.DateTimeFormat('es-GT', { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${isToday ? 'Hoy' : formatDate(value)}, ${time}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatNumericDate(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

type ClientLocationOption = { id: string; name: string; code: string };

function ClientCatalogSearchField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: ClientLocationOption[];
  onChange: (value: string, selected?: ClientLocationOption) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const normalized = normalizeLocation(query);
    return options
      .filter((option) => !normalized || normalizeLocation(`${option.name} ${option.code}`).includes(normalized))
      .slice(0, 20);
  }, [options, query]);

  useEffect(() => setQuery(value), [value]);

  function select(option: ClientLocationOption) {
    setQuery(option.name);
    setOpen(false);
    onChange(option.name, option);
  }

  function commit() {
    const exact = options.find((option) => normalizeLocation(option.name) === normalizeLocation(query) || normalizeLocation(option.code) === normalizeLocation(query));
    if (exact) select(exact);
    else {
      setQuery('');
      setOpen(false);
      onChange('');
    }
  }

  return (
    <label className="client-location-search">
      {label} <b>*</b>
      <input
        autoComplete="off"
        disabled={disabled}
        placeholder={disabled ? 'Selecciona primero un departamento' : `Buscar ${label.toLowerCase()}`}
        required
        value={query}
        onBlur={() => window.setTimeout(commit, 100)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); if (!event.target.value) onChange(''); }}
        onFocus={() => !disabled && setOpen(true)}
      />
      {open && !disabled ? (
        <span className="client-location-results">
          {filtered.length ? filtered.map((option) => (
            <button key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)} type="button">
              <strong>{option.name}</strong><small>{option.code}</small>
            </button>
          )) : <small className="client-location-empty">Sin resultados</small>}
        </span>
      ) : null}
    </label>
  );
}

function normalizeLocation(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function PwEyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {open ? (
        <>
          <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3.2" stroke="#6b7280" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="1.2" fill="#6b7280"/>
        </>
      ) : (
        <>
          <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3.2" stroke="#6b7280" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="1.2" fill="#6b7280"/>
          <line x1="3" y1="3" x2="21" y2="21" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

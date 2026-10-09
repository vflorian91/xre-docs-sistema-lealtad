export interface InternalAuthUser {
  id: string;
  email: string;
  fullName: string;
  profilePhotoUrl?: string | null;
  roles: string[];
  permissions: string[];
  storeIds: string[];
  stores?: Array<{ id: string; code: string; name: string }>;
  activeStoreId?: string;
  sessionId: string;
  mustChangePassword: boolean;
}

export interface CustomerAuthUser {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string | null;
  profilePhotoUrl?: string | null;
  status: string;
  brandItemId?: string | null;
  sessionId: string;
  mustChangePassword: boolean;
}

export interface DriverAuthUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  code?: string | null;
  accessStatus: string;
  isActive: boolean;
  sessionId: string;
  mustChangePassword: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  type: 'internal_user';
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'internal_refresh';
  sessionId: string;
}

export interface CustomerAccessTokenPayload {
  sub: string;
  type: 'customer';
  sessionId: string;
}

export interface CustomerRefreshTokenPayload {
  sub: string;
  type: 'customer_refresh';
  sessionId: string;
}

export interface DriverAccessTokenPayload {
  sub: string;
  type: 'driver';
  sessionId: string;
}

export interface DriverRefreshTokenPayload {
  sub: string;
  type: 'driver_refresh';
  sessionId: string;
}

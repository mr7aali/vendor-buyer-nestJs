export enum ActivityType {
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  ORDER_CREATE_FAILED = "ORDER_CREATE_FAILED",
  VENDOR_KYC_SUBMITTED = "VENDOR_KYC_SUBMITTED",
  USER_REGISTERED = "USER_REGISTERED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
}

export enum ActorType {
  USER = "USER",
  VENDOR = "VENDOR",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
}

export interface ActivityPayload {
  type: ActivityType;
  title: string;
  description: string;
  entity?: string;
  entityId?: string;
  actorType?: ActorType;
  actorName?: string;
  meta?: any;
}

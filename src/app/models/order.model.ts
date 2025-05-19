import { Timestamp } from 'firebase/firestore';
import { Product, Variant } from './products';

export type PaymentMethod = 'cash' | 'card' | 'paypal';
export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderProduct {
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  price: number;
  product?: Product;
  variant?: Variant;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDisplay extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

import { Timestamp } from 'firebase/firestore';

export type UserRole =
  'main admin' |
  'admin' |
  'shop manager' |
  'vendor' |
  'Author' |
  'customer';

export interface Address {
  street: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface User {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  imageUrl: string;
  role: UserRole;
  address: Address[];
  wishlist: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  selected: boolean;
}

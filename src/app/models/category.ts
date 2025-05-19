import { Timestamp } from 'firebase/firestore';
import { LocalizedString } from './products';

export interface Category {
  id: string;
  categoryId: string;
  name: LocalizedString;
  slug: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface Subcategory {
  subcategoryId: string;
  name: LocalizedString;
  parentCategoryId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

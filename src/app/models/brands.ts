import { Timestamp } from 'firebase/firestore';
import { LocalizedString } from './products';

export interface Brand {
  brandId: string;
  name: LocalizedString;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

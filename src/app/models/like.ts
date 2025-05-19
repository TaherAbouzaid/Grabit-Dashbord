import { Timestamp } from 'firebase/firestore';

export interface Like {
  likeId: string;
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'reply';
  createdAt: Timestamp;
}

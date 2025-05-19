import { Timestamp } from 'firebase/firestore';

export interface Post {
  postId: string;
  title: string;
  content: string;
  authorId: string;
  views: number;
  likesCount: number;
  commentIds: string[];
  likedBy: string[];
  image?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

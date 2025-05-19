import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';
import { Like } from '../../models/like';

@Injectable({
  providedIn: 'root',
})
export class LikeService {
  constructor(private firebaseService: FirebaseService) {}

  createLike(like: Omit<Like, 'likeId' | 'createdAt'>): Observable<Like> {
    return this.firebaseService.createLike(like);
  }

  checkUserLike(
    userId: string,
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<Like | null> {
    return this.firebaseService.checkUserLike(userId, targetId, targetType);
  }

  deleteLike(
    likeId: string,
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<void> {
    return this.firebaseService.deleteLike(likeId, targetId, targetType);
  }

  getLikesByTarget(
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<Like[]> {
    return this.firebaseService.getLikesByTarget(targetId, targetType);
  }

  getLikesByUser(userId: string): Observable<Like[]> {
    return this.firebaseService.getLikesByUser(userId);
  }
}

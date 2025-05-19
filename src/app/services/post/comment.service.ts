import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { Comment } from '../../models/comment';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  constructor(private firebaseService: FirebaseService) {}

  getCommentById(commentId: string): Observable<Comment | null> {
    return this.firebaseService.getCommentById(commentId);
  }

  getCommentsByPostId(postId: string): Observable<Comment[]> {
    return this.firebaseService.getCommentsByPostId(postId);
  }

  createComment(
    comment: Omit<Comment, 'commentId' | 'createdAt' | 'updatedAt'>
  ): Observable<Comment> {
    return this.firebaseService.createComment(comment);
  }

  updateComment(
    commentId: string,
    updates: Partial<Comment>
  ): Observable<void> {
    return this.firebaseService.updateComment(commentId, updates);
  }

  deleteComment(commentId: string, postId: string): Observable<void> {
    return this.firebaseService.deleteComment(commentId, postId);
  }

  likeComment(commentId: string, userId: string): Observable<void> {
    return this.firebaseService.likeComment(commentId, userId);
  }
}

import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { Reply } from '../../models/replay';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class ReplyService {
  constructor(private firebaseService: FirebaseService) {}

  getReplyById(replyId: string): Observable<Reply | null> {
    return this.firebaseService.getReplyById(replyId);
  }

  getRepliesByCommentId(commentId: string): Observable<Reply[]> {
    return this.firebaseService.getRepliesByCommentId(commentId);
  }

  createReply(
    reply: Omit<Reply, 'replyId' | 'createdAt' | 'updatedAt'>
  ): Observable<Reply> {
    return this.firebaseService.createReply(reply);
  }

  updateReply(replyId: string, updates: Partial<Reply>): Observable<void> {
    return this.firebaseService.updateReply(replyId, updates);
  }

  deleteReply(replyId: string, commentId: string): Observable<void> {
    return this.firebaseService.deleteReply(replyId, commentId);
  }

  likeReply(replyId: string, userId: string): Observable<void> {
    return this.firebaseService.likeReply(replyId, userId);
  }
}

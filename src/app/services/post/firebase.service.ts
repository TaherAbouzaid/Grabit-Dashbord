import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  query,
  where,
  arrayRemove,
  arrayUnion,
} from '@angular/fire/firestore';
import { from, Observable, map, switchMap } from 'rxjs';

import { Post } from '../../models/post';
import { Comment } from '../../models/comment';
import { Reply } from '../../models/replay';
import { Like } from '../../models/like';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  constructor(private firestore: Firestore) {}

  // ====== Post Operations ======
  getAllPosts(): Observable<Post[]> {
    const postsRef = collection(this.firestore, 'posts');
    return from(getDocs(postsRef)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ postId: doc.id, ...doc.data() } as Post))
      )
    );
  }

  getPostById(postId: string): Observable<Post | null> {
    const postRef = doc(this.firestore, 'posts', postId);
    return from(getDoc(postRef)).pipe(
      map((snapshot) =>
        snapshot.exists()
          ? ({ postId: snapshot.id, ...snapshot.data() } as Post)
          : null
      )
    );
  }

  getPostsByUser(userId: string): Observable<Post[]> {
    const postsRef = collection(this.firestore, 'posts');
    const q = query(postsRef, where('authorId', '==', userId));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ postId: doc.id, ...doc.data() } as Post))
      )
    );
  }

  createPost(
    post: Omit<Post, 'postId' | 'createdAt' | 'updatedAt'>
  ): Observable<Post> {
    const postsRef = collection(this.firestore, 'posts');
    return from(
      addDoc(postsRef, {
        ...post,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).pipe(
      map((docRef) => ({
        postId: docRef.id,
        ...post,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      }))
    );
  }

  updatePost(postId: string, updates: Partial<Post>): Observable<void> {
    const postRef = doc(this.firestore, 'posts', postId);
    return from(
      updateDoc(postRef, {
        ...updates,
        updatedAt: new Date(),
      })
    );
  }

  deletePost(postId: string): Observable<void> {
    const postRef = doc(this.firestore, 'posts', postId);
    return from(deleteDoc(postRef));
  }

  incrementPostViews(postId: string): Observable<void> {
    const postRef = doc(this.firestore, 'posts', postId);
    return from(updateDoc(postRef, { views: increment(1) }));
  }

  // ====== Comment Operations ======
  getCommentById(commentId: string): Observable<Comment | null> {
    const commentRef = doc(this.firestore, 'comments', commentId);
    return from(getDoc(commentRef)).pipe(
      map((snapshot) =>
        snapshot.exists()
          ? ({ commentId: snapshot.id, ...snapshot.data() } as Comment)
          : null
      )
    );
  }

  getCommentsByPostId(postId: string): Observable<Comment[]> {
    const commentsRef = collection(this.firestore, 'comments');
    const q = query(commentsRef, where('postId', '==', postId));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map(
          (doc) => ({ commentId: doc.id, ...doc.data() } as Comment)
        )
      )
    );
  }

  createComment(
    comment: Omit<Comment, 'commentId' | 'createdAt' | 'updatedAt'>
  ): Observable<Comment> {
    const commentsRef = collection(this.firestore, 'comments');
    return from(
      addDoc(commentsRef, {
        ...comment,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).pipe(
      switchMap(async (docRef) => {
        const postRef = doc(this.firestore, 'posts', comment.postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
          const post = postDoc.data() as Post;
          const commentIds = post.commentIds || [];
          await updateDoc(postRef, {
            commentIds: [...commentIds, docRef.id],
            updatedAt: new Date()
          });
        }

        return {
          commentId: docRef.id,
          ...comment,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        } as Comment;
      })
    );
  }

  updateComment(
    commentId: string,
    updates: Partial<Comment>
  ): Observable<void> {
    const commentRef = doc(this.firestore, 'comments', commentId);
    return from(
      updateDoc(commentRef, {
        ...updates,
        updatedAt: new Date(),
      })
    );
  }

  deleteComment(commentId: string, postId: string): Observable<void> {
    const commentRef = doc(this.firestore, 'comments', commentId);
    const postRef = doc(this.firestore, 'posts', postId);
    
    return from(
      getDoc(postRef).then(async (postDoc) => {
        if (postDoc.exists()) {
          const post = postDoc.data() as Post;
          const commentIds = post.commentIds || [];
          const updatedCommentIds = commentIds.filter(id => id !== commentId);
          
          // Update post's commentIds array
          await updateDoc(postRef, {
            commentIds: updatedCommentIds,
            updatedAt: new Date()
          });
        }
        
        // Delete the comment
        return deleteDoc(commentRef);
      })
    );
  }

  // ====== Reply Operations ======
  getReplyById(replyId: string): Observable<Reply | null> {
    const replyRef = doc(this.firestore, 'replies', replyId);
    return from(getDoc(replyRef)).pipe(
      map((snapshot) =>
        snapshot.exists()
          ? ({ replyId: snapshot.id, ...snapshot.data() } as Reply)
          : null
      )
    );
  }

  getRepliesByCommentId(commentId: string): Observable<Reply[]> {
    const repliesRef = collection(this.firestore, 'replies');
    const q = query(repliesRef, where('commentId', '==', commentId));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map(
          (doc) => ({ replyId: doc.id, ...doc.data() } as Reply)
        )
      )
    );
  }

  createReply(
    reply: Omit<Reply, 'replyId' | 'createdAt' | 'updatedAt'>
  ): Observable<Reply> {
    const repliesRef = collection(this.firestore, 'replies');
    return from(
      addDoc(repliesRef, {
        ...reply,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).pipe(
      map((docRef) => ({
        replyId: docRef.id,
        ...reply,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      }))
    );
  }

  updateReply(replyId: string, updates: Partial<Reply>): Observable<void> {
    const replyRef = doc(this.firestore, 'replies', replyId);
    return from(
      updateDoc(replyRef, {
        ...updates,
        updatedAt: new Date(),
      })
    );
  }

  deleteReply(replyId: string, commentId: string): Observable<void> {
    const replyRef = doc(this.firestore, 'replies', replyId);
    return from(deleteDoc(replyRef));
  }

  // ====== Like Operations ======
  createLike(like: Omit<Like, 'likeId' | 'createdAt'>): Observable<Like> {
    const likesRef = collection(this.firestore, 'likes');
    return from(
      addDoc(likesRef, {
        ...like,
        createdAt: new Date(),
      })
    ).pipe(
      map((docRef) => ({
        likeId: docRef.id,
        ...like,
        createdAt: new Date() as any,
      }))
    );
  }

  checkUserLike(
    userId: string,
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<Like | null> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(
      likesRef,
      where('userId', '==', userId),
      where('targetId', '==', targetId),
      where('targetType', '==', targetType)
    );
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.empty
          ? null
          : ({
              likeId: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
            } as Like)
      )
    );
  }

  deleteLike(
    likeId: string,
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<void> {
    const likeRef = doc(this.firestore, 'likes', likeId);
    return from(deleteDoc(likeRef));
  }

  getLikesByTarget(
    targetId: string,
    targetType: 'post' | 'comment' | 'reply'
  ): Observable<Like[]> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(
      likesRef,
      where('targetId', '==', targetId),
      where('targetType', '==', targetType)
    );
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ likeId: doc.id, ...doc.data() } as Like))
      )
    );
  }

  getLikesByUser(userId: string): Observable<Like[]> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(likesRef, where('userId', '==', userId));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ likeId: doc.id, ...doc.data() } as Like))
      )
    );
  }

  likeComment(commentId: string, userId: string): Observable<void> {
    const commentRef = doc(this.firestore, 'comments', commentId);
    return from(getDoc(commentRef)).pipe(
      switchMap(async (commentDoc) => {
        if (!commentDoc.exists()) {
          throw new Error('Comment not found');
        }
        const comment = commentDoc.data() as Comment;
        const likedBy = comment.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        if (isLiked) {
          // Unlike
          await updateDoc(commentRef, {
            likesCount: increment(-1),
            likedBy: arrayRemove(userId)
          });
        } else {
          // Like
          await updateDoc(commentRef, {
            likesCount: increment(1),
            likedBy: arrayUnion(userId)
          });
        }
      })
    );
  }

  likeReply(replyId: string, userId: string): Observable<void> {
    const replyRef = doc(this.firestore, 'replies', replyId);
    return from(getDoc(replyRef)).pipe(
      switchMap(async (replyDoc) => {
        if (!replyDoc.exists()) {
          throw new Error('Reply not found');
        }
        const reply = replyDoc.data() as Reply;
        const likedBy = reply.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        if (isLiked) {
          // Unlike
          await updateDoc(replyRef, {
            likesCount: increment(-1),
            likedBy: arrayRemove(userId)
          });
        } else {
          // Like
          await updateDoc(replyRef, {
            likesCount: increment(1),
            likedBy: arrayUnion(userId)
          });
        }
      })
    );
  }

  likePost(postId: string, userId: string): Observable<void> {
    const postRef = doc(this.firestore, 'posts', postId);
    return from(getDoc(postRef)).pipe(
      switchMap(async (postDoc) => {
        if (!postDoc.exists()) {
          throw new Error('Post not found');
        }
        const post = postDoc.data() as Post;
        const likedBy = post.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        if (isLiked) {
          // Unlike
          await updateDoc(postRef, {
            likesCount: increment(-1),
            likedBy: arrayRemove(userId)
          });
        } else {
          // Like
          await updateDoc(postRef, {
            likesCount: increment(1),
            likedBy: arrayUnion(userId)
          });
        }
      })
    );
  }
}

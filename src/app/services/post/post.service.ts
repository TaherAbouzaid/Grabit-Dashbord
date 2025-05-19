import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Post } from '../../models/post';
import { FirebaseService } from './firebase.service';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
@Injectable({
  providedIn: 'root',
})
export class PostService {
  constructor(
    private firebaseService: FirebaseService,
    private storage: Storage
  ) {}

  getAllPosts(): Observable<Post[]> {
    return this.firebaseService.getAllPosts();
  }

  getPostById(postId: string): Observable<Post | null> {
    return this.firebaseService.getPostById(postId);
  }

  getPostsByUser(userId: string): Observable<Post[]> {
    return this.firebaseService.getPostsByUser(userId);
  }

  createPost(
    post: Omit<Post, 'postId' | 'createdAt' | 'updatedAt'>
  ): Observable<Post> {
    return this.firebaseService.createPost(post);
  }

  updatePost(postId: string, updates: Partial<Post>): Observable<void> {
    return this.firebaseService.updatePost(postId, updates);
  }

  deletePost(postId: string): Observable<void> {
    return this.firebaseService.deletePost(postId);
  }

  incrementPostViews(postId: string): Observable<void> {
    return this.firebaseService.incrementPostViews(postId);
  }

  async uploadImage(file: File, path: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed.');
    }
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  likePost(postId: string, userId: string): Observable<void> {
    return this.firebaseService.likePost(postId, userId);
  }
}

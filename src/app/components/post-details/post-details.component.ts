import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostService } from '../../services/post/post.service';
import { CommentService } from '../../services/post/comment.service';
import { ReplyService } from '../../services/post/reply.service';
import { Post } from '../../models/post';
import { Comment } from '../../models/comment';
import { Reply } from '../../models/replay';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { UserService } from '../../services/user/user.service';
import { User } from '../../models/user.model';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { map, firstValueFrom } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-post-details',
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DividerModule,
    DialogModule,
    InputTextModule,
    InputTextarea,
    ToastModule,
    FormsModule,
    AvatarModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
})
export class PostDetailsComponent implements OnInit {
  post: Post | null = null;
  commentsWithReplies: { comment: Comment; replies: Reply[] }[] = [];
  isLoading = true;
  errorMessage = '';
  author: User | null = null;
  showEditCommentDialog = false;
  showEditReplyDialog = false;
  editingComment: Comment | null = null;
  editingReply: Reply | null = null;
  editedCommentContent = '';
  editedReplyContent = '';
  private userCache: { [key: string]: string } = {};
  newCommentContent = '';
  newReplyContent = '';
  replyingToComment: Comment | null = null;
  private userProfileCache: { [key: string]: { name: string; photoURL: string } } = {};
  private userAdminStatus: { [key: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private commentService: CommentService,
    private replyService: ReplyService,
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public auth: Auth
  ) {}

  ngOnInit(): void {
    const postId = this.route.snapshot.paramMap.get('postId');
    if (postId) {
      this.loadPostDetails(postId);
      this.postService.incrementPostViews(postId).subscribe();
    } else {
      this.errorMessage = 'No post ID provided.';
      this.isLoading = false;
    }
  }

  private loadPostDetails(postId: string): void {
    this.isLoading = true;
    this.postService.getPostById(postId).subscribe({
      next: (post) => {
        if (!post) {
          this.errorMessage = 'Post not found.';
          this.isLoading = false;
          return;
        }
        this.post = post;
        this.loadAuthorDetails(post.authorId);
        this.loadCommentsAndReplies(postId);
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.errorMessage = 'Error loading post.';
        this.isLoading = false;
      },
    });
  }

  private loadAuthorDetails(authorId: string): void {
    this.userService.getUserById(authorId).subscribe({
      next: (user) => {
        this.author = user || null;
      },
      error: (err) => {
        console.error('Error loading author details:', err);
        this.author = null;
      }
    });
  }

  private loadCommentsAndReplies(postId: string): void {
    this.isLoading = true;
    this.commentService.getCommentsByPostId(postId).subscribe({
      next: async (comments) => {
        if (!comments.length) {
          this.commentsWithReplies = [];
          this.isLoading = false;
          return;
        }

        try {
          // Preload all user names and profile pictures
          const userIds = new Set<string>();
          comments.forEach(comment => {
            userIds.add(comment.userId);
          });

          // Load all user data
          await Promise.all(
            Array.from(userIds).map(async userId => {
              try {
                const user = await firstValueFrom(this.userService.getUserById(userId));
                this.userProfileCache[userId] = {
                  name: user?.fullName || 'Unknown User',
                  photoURL: user?.profileImage || 'assets/default-avatar.png',
                };
              } catch {
                this.userProfileCache[userId] = {
                  name: 'Unknown User',
                  photoURL: 'assets/default-avatar.png'
                };
              }
            })
          );

          // Load all comments with replies
          const commentsWithReplies = await Promise.all(
            comments.map(async comment => {
              try {
                const replies = await firstValueFrom(
                  this.replyService.getRepliesByCommentId(comment.commentId)
                );
                return { comment, replies: replies || [] };
              } catch {
                return { comment, replies: [] };
              }
            })
          );

          this.commentsWithReplies = commentsWithReplies;
        } catch (error) {
          console.error('Error loading data:', error);
          this.commentsWithReplies = comments.map(comment => ({
            comment,
            replies: []
          }));
        } finally {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.commentsWithReplies = [];
        this.isLoading = false;
      }
    });
  }

  getUserProfile(userId: string): { name: string; photoURL: string } {
    return this.userProfileCache[userId] || {
      name: 'Loading...',
      photoURL: 'assets/default-avatar.png'
    };
  }

  editComment(comment: Comment): void {
    this.editingComment = comment;
    this.editedCommentContent = comment.content;
    this.showEditCommentDialog = true;
  }

  async saveCommentEdit(): Promise<void> {
    if (this.editingComment && this.editedCommentContent.trim()) {
      try {
        await this.commentService.updateComment(this.editingComment.commentId, {
          content: this.editedCommentContent.trim()
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Comment updated successfully'
        });
        this.showEditCommentDialog = false;
        this.editingComment = null;
        this.editedCommentContent = '';
        if (this.post) {
          await this.loadCommentsAndReplies(this.post.postId);
        }
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update comment'
        });
      }
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    // Find the comment to check ownership
    const commentToDelete = this.commentsWithReplies.find(item =>
      item.comment.commentId === commentId
    )?.comment;

    if (!commentToDelete) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Comment not found'
      });
      return;
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to delete comments'
      });
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this comment?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.commentService.deleteComment(commentId, this.post?.postId || '');
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Comment deleted successfully'
          });
          if (this.post) {
            await this.loadCommentsAndReplies(this.post.postId);
          }
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete comment'
          });
        }
      }
    });
  }

  editReply(reply: Reply): void {
    this.editingReply = reply;
    this.editedReplyContent = reply.content;
    this.showEditReplyDialog = true;
  }

  async saveReplyEdit(): Promise<void> {
    if (this.editingReply && this.editedReplyContent.trim()) {
      try {
        await this.replyService.updateReply(this.editingReply.replyId, {
          content: this.editedReplyContent.trim()
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Reply updated successfully'
        });
        this.showEditReplyDialog = false;
        this.editingReply = null;
        this.editedReplyContent = '';
        if (this.post) {
          await this.loadCommentsAndReplies(this.post.postId);
        }
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update reply'
        });
      }
    }
  }

  async deleteReply(replyId: string): Promise<void> {
    // Find the reply to check ownership
    const replyToDelete = this.commentsWithReplies
      .flatMap(item => item.replies)
      .find(reply => reply.replyId === replyId);

    if (!replyToDelete) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Reply not found'
      });
      return;
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to delete replies'
      });
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this reply?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          // Find the parent comment ID
          const parentComment = this.commentsWithReplies.find(item =>
            item.replies.some(reply => reply.replyId === replyId)
          )?.comment;

          await this.replyService.deleteReply(replyId, parentComment?.commentId || '');
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Reply deleted successfully'
          });
          if (this.post) {
            await this.loadCommentsAndReplies(this.post.postId);
          }
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete reply'
          });
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/list-posts']);
  }

  async addComment(): Promise<void> {
    if (!this.newCommentContent.trim() || !this.post) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to comment'
      });
      return;
    }

    try {
      const comment: Omit<Comment, 'commentId' | 'createdAt' | 'updatedAt'> = {
        postId: this.post.postId,
        userId: currentUser.uid,
        content: this.newCommentContent.trim(),
        likesCount: 0,
        replyIds: [],
        likedBy: []
      };

      await firstValueFrom(this.commentService.createComment(comment));
      this.newCommentContent = '';
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Comment added successfully'
      });
      await this.loadCommentsAndReplies(this.post.postId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add comment'
      });
    }
  }

  async addReply(): Promise<void> {
    if (!this.newReplyContent.trim() || !this.replyingToComment || !this.post) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to reply'
      });
      return;
    }

    try {
      const reply: Omit<Reply, 'replyId' | 'createdAt' | 'updatedAt'> = {
        commentId: this.replyingToComment.commentId,
        userId: currentUser.uid,
        content: this.newReplyContent.trim(),
        likesCount: 0,
        likedBy: []
      };

      await firstValueFrom(this.replyService.createReply(reply));
      this.newReplyContent = '';
      this.replyingToComment = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Reply added successfully'
      });
      await this.loadCommentsAndReplies(this.post.postId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add reply'
      });
    }
  }

  startReply(comment: Comment): void {
    this.replyingToComment = comment;
    this.newReplyContent = '';
  }

  cancelReply(): void {
    this.replyingToComment = null;
    this.newReplyContent = '';
  }

  formatDate(timestamp: any): Date {
    return timestamp?.toDate?.() || timestamp;
  }

  async likeComment(comment: Comment): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to like comments'
      });
      return;
    }

    try {
      await firstValueFrom(this.commentService.likeComment(comment.commentId, currentUser.uid));
      if (this.post) {
        await this.loadCommentsAndReplies(this.post.postId);
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to like comment'
      });
    }
  }

  async likeReply(reply: Reply): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to like replies'
      });
      return;
    }

    try {
      await firstValueFrom(this.replyService.likeReply(reply.replyId, currentUser.uid));
      if (this.post) {
        await this.loadCommentsAndReplies(this.post.postId);
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to like reply'
      });
    }
  }

  isCommentLiked(comment: Comment): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser ? comment.likedBy?.includes(currentUser.uid) : false;
  }

  isReplyLiked(reply: Reply): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser ? reply.likedBy?.includes(currentUser.uid) : false;
  }

  async likePost(): Promise<void> {
    if (!this.post) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to like posts'
      });
      return;
    }

    try {
      await firstValueFrom(this.postService.likePost(this.post.postId, currentUser.uid));
      await this.loadPostDetails(this.post.postId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to like post'
      });
    }
  }

  isPostLiked(): boolean {
    if (!this.post || !this.auth.currentUser) return false;
    return this.post.likedBy?.includes(this.auth.currentUser.uid) || false;
  }

  isUserAdminOrAuthor(userId: string | undefined): boolean {
    if (!userId) return false;

    // If we've already checked this user, return cached result
    if (this.userAdminStatus[userId] !== undefined) {
      return this.userAdminStatus[userId];
    }

    // If not checked yet, default to false and check asynchronously
    this.userAdminStatus[userId] = false;

    // Check admin or author status asynchronously
    this.userService.getUserById(userId).subscribe(user => {
      this.userAdminStatus[userId] = user?.role === 'admin' || user?.role === 'Author';
    });

    return this.userAdminStatus[userId];
  }
}

import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Post } from '../../models/post';
import { Comment } from '../../models/comment';
import { Reply } from '../../models/replay';
import { PostService } from '../../services/post/post.service';
import { CommentService } from '../../services/post/comment.service';
import { ReplyService } from '../../services/post/reply.service';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user/user.service';
import { User } from '../../models/user.model';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-post-list',
  standalone: true,
  templateUrl: './post-list.component.html',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    ToastModule,
    ConfirmDialogModule,
    DropdownModule,
    RouterModule
  ],
  providers: [MessageService, ConfirmationService],
})
export class PostListComponent implements OnInit {
  postsWithCommentsAndReplies: {
    post: Post;
    comments: {
      comment: Comment;
      replies: Reply[];
    }[];
    isEditing: boolean;
    editData: {
      title: string;
      content: string;
    };
  }[] = [];
  filteredPosts: any[] = [];
  users: User[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  selectedFilter: string = 'all';
  selectedSort: string = 'newest';
  sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Most Viewed', value: 'views' },
    { label: 'Most Liked', value: 'likes' },
    { label: 'Most Commented', value: 'comments' }
  ];

  constructor(
    private postService: PostService,
    private commentService: CommentService,
    private replyService: ReplyService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadPostsWithCommentsAndReplies();
  }

  filterPosts(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.applyFilters(searchTerm);
  }

  filterByStatus(status: string): void {
    this.selectedFilter = status;
    this.applyFilters('');
  }

  sortPosts(): void {
    this.applyFilters('');
  }

  private applyFilters(searchTerm: string): void {
    let filtered = [...this.postsWithCommentsAndReplies];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.post.title.toLowerCase().includes(searchTerm) ||
        item.post.content.toLowerCase().includes(searchTerm) ||
        this.getAuthorName(item.post.authorId).toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (this.selectedFilter !== 'all') {
      switch (this.selectedFilter) {
        case 'views':
          filtered.sort((a, b) => b.post.views - a.post.views);
          break;
        case 'likes':
          filtered.sort((a, b) => b.post.likesCount - a.post.likesCount);
          break;
        case 'comments':
          filtered.sort((a, b) => b.comments.length - a.comments.length);
          break;
      }
    }

    // Apply sorting
    switch (this.selectedSort) {
      case 'newest':
        filtered.sort((a, b) => b.post.createdAt.toDate().getTime() - a.post.createdAt.toDate().getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.post.createdAt.toDate().getTime() - b.post.createdAt.toDate().getTime());
        break;
      case 'views':
        filtered.sort((a, b) => b.post.views - a.post.views);
        break;
      case 'likes':
        filtered.sort((a, b) => b.post.likesCount - a.post.likesCount);
        break;
      case 'comments':
        filtered.sort((a, b) => b.comments.length - a.comments.length);
        break;
    }

    this.filteredPosts = filtered;
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users: User[]) => (this.users = users),
      error: (err: any) => console.error('Error loading users:', err),
    });
  }

  getAuthorName(authorId: string): string {
    const user = this.users.find((u) => u.userId === authorId);
    return user ? user.fullName : 'User';
  }

  private loadPostsWithCommentsAndReplies(): void {
    this.postService
      .getAllPosts()
      .pipe(
        switchMap((posts) => {
          const postObservables = posts.map((post) =>
            this.commentService.getCommentsByPostId(post.postId).pipe(
              switchMap((comments) => {
                if (comments.length === 0) {
                  return of({
                    post,
                    comments: [],
                    isEditing: false,
                    editData: {
                      title: post.title,
                      content: post.content,
                    },
                  });
                }

                const commentObservables = comments.map((comment) =>
                  this.replyService
                    .getRepliesByCommentId(comment.commentId)
                    .pipe(
                      map((replies) => ({
                        comment,
                        replies: replies || [],
                      }))
                    )
                );

                return forkJoin(commentObservables).pipe(
                  map((commentsWithReplies) => ({
                    post,
                    comments: commentsWithReplies,
                    isEditing: false,
                    editData: {
                      title: post.title,
                      content: post.content,
                    },
                  }))
                );
              })
            )
          );
          return postObservables.length > 0
            ? forkJoin(postObservables)
            : of([]);
        })
      )
      .subscribe({
        next: (postsWithCommentsAndReplies) => {
          this.postsWithCommentsAndReplies = postsWithCommentsAndReplies;
          this.filteredPosts = postsWithCommentsAndReplies;
          this.applyFilters('');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error loading posts:', error);
          this.errorMessage = 'حدث خطأ أثناء تحميل البوستات.';
          this.isLoading = false;
        },
      });
  }

  toggleEdit(postIndex: number): void {
    const post = this.postsWithCommentsAndReplies[postIndex];
    this.router.navigate(['dashboard/add-post'], { state: { post: post.post } });
  }

  updatePost(postIndex: number): void {
    const post = this.postsWithCommentsAndReplies[postIndex];
    const updates = {
      title: post.editData.title,
      content: post.editData.content,
    };

    this.postService.updatePost(post.post.postId, updates).subscribe({
      next: () => {
        post.post.title = updates.title;
        post.post.content = updates.content;
        post.isEditing = false;
      },
      error: (err) => console.error('Error updating post:', err),
    });
  }

  addPost(): void {
    this.router.navigate(['/add-post']);
  }

  deletePost(postId: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this post?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.postService.deletePost(postId).subscribe({
          next: () => {
            console.log('Post deleted');
            this.loadPostsWithCommentsAndReplies();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Post deleted successfully',
              life: 3000,
            });
          },
          error: (err) => console.error('Error deleting post:', err),
        });
      },
    });
  }

  viewPost(post: Post): void {
    this.router.navigate(['/dashboard/post-details', post.postId]);
  }
}
//post-list.component.ts

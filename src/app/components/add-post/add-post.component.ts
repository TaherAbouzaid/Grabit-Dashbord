import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../services/post/post.service';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-add-post',
  templateUrl: './add-post.component.html',
  styleUrls: ['./add-post.component.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class AddPostComponent implements OnInit {
  postForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private router: Router,
    public auth: Auth
  ) {
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      image: [null],
    });
  }

  ngOnInit() {
    const post = history.state.post;
    if (post) {
      this.isEditMode = true;
      this.postForm.patchValue({
        title: post.title,
        content: post.content,
        image: post.image,
      });
    }
  }

  onSubmit() {
    if (this.postForm.invalid) {
      return;
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.errorMessage = 'You must be logged in to create a post';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const post = history.state.post;
    const postData = {
      title: this.postForm.value.title,
      content: this.postForm.value.content,
      image: this.postForm.value.image,
      authorId: currentUser.uid,
      views: 0,
      likesCount: 0,
      commentIds: [],
      likedBy: []
    };

    if (post) {
      this.postService
        .updatePost(post.postId, {
          ...postData,
          image: this.postForm.value.image,
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/posts']);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage =
              'An error occurred while updating the post. Please try again.';
            console.error('Error updating post:', error);
          },
        });
    } else {
      this.postService.createPost(postData).subscribe({
        next: (createdPost) => {
          this.isLoading = false;
          this.router.navigate(['/posts']);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            'An error occurred while creating the post. Please try again.';
          console.error('Error creating post:', error);
        },
      });
    }
  }

  get title() {
    return this.postForm.get('title');
  }

  get content() {
    return this.postForm.get('content');
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const path = `posts/${Date.now()}_${file.name}`;
      const url = await this.postService.uploadImage(file, path);
      this.postForm.get('image')?.setValue(url);
    }
  }
}

import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Auth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [MessageService]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  emailError: string = '';
  passwordError: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    // Subscribe to form control changes
    this.loginForm.get('email')?.valueChanges.subscribe(() => {
      this.emailError = '';
    });
    this.loginForm.get('password')?.valueChanges.subscribe(() => {
      this.passwordError = '';
    });
  }

  ngOnInit() {
    this.auth.onAuthStateChanged(async (user) => {
      if (user && this.router.url !== '/logout') {
        console.log('User detected, checking role');

        const userRef = doc(this.firestore, `users/${user.uid}`);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData: any = userSnap.data();
            const role = userData.role;
            console.log('User role:', role);

            if (
              role === 'admin' ||
              role === 'shop manager' ||
              role === 'vendor' ||
              role === 'Author'
            ) {
              localStorage.setItem('userUID', user.uid);
              if (this.router.url === '/') {
                this.router.navigate(['/dashboard']);
              }
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'You do not have permission to access the dashboard'
              });
              this.router.navigate(['/unauthorized']);
            }
          } else {
            console.error('No user data found in Firestore');
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'User data not found'
            });
            await this.auth.signOut();
            localStorage.removeItem('userUID');
            this.router.navigate(['/']);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error checking user permissions'
          });
        }
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  private handleAuthError(error: any): string {
    switch (error.code) {
      case 'auth/wrong-password':
        this.passwordError = 'Incorrect password';
        return 'Incorrect password';
      case 'auth/user-not-found':
        this.emailError = 'Email not found';
        return 'Email not found';
      case 'auth/invalid-email':
        this.emailError = 'Invalid email format';
        return 'Invalid email format';
      case 'auth/too-many-requests':
        return 'Too many login attempts. Please try again later';
      case 'auth/missing-email':
        this.emailError = 'Email is required';
        return 'Please enter your email';
      default:
        return 'Email or password is incorrect';
    }
  }

  async forgotPassword() {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.emailError = 'Email is required';
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter your email address first'
      });
      return;
    }

    try {
      this.isLoading = true;
      await sendPasswordResetEmail(this.auth, email);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Password reset email sent. Please check your inbox'
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.handleAuthError(error)
      });
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      if (this.loginForm.get('email')?.errors?.['required']) {
        this.emailError = 'Email is required';
      }
      if (this.loginForm.get('email')?.errors?.['email']) {
        this.emailError = 'Please enter a valid email address';
      }
      if (this.loginForm.get('password')?.errors?.['required']) {
        this.passwordError = 'Password is required';
      }
      if (this.loginForm.get('password')?.errors?.['minlength']) {
        this.passwordError = 'Password must be at least 6 characters';
      }
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill in all required fields correctly'
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.emailError = '';
    this.passwordError = '';

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      await setPersistence(
        this.auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const uid = userCredential.user.uid;
      const userRef = doc(this.firestore, `users/${uid}`);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData: any = userSnap.data();
        const role = userData.role;
        localStorage.setItem('userUID', uid);

        console.log('User role:', role);

        if (
          role === 'admin' ||
          role === 'shop manager' ||
          role === 'vendor' ||
          role === 'Author'
        ) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Login successful. Redirecting to dashboard...'
          });
          this.router.navigate(['/dashboard']);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: 'You do not have permission to access the dashboard'
          });
          this.router.navigate(['/unauthorized']);
        }
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User data not found'
        });
        await this.auth.signOut();
        localStorage.removeItem('userUID');
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = this.handleAuthError(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Login Error',
        detail: this.errorMessage
      });
    } finally {
      this.isLoading = false;
    }
  }
}

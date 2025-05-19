import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  template: '<p>جاري تسجيل الخروج...</p>',
})
export class LogoutComponent implements OnInit {
  constructor(private auth: Auth, private router: Router) {}

  ngOnInit() {
    this.logout();
  }

  async logout() {
    try {
      await this.auth.signOut();
      localStorage.removeItem('userUID');
      console.log('User logged out successfully');

      this.auth.onAuthStateChanged((user) => {
        if (!user) {
          console.log('No user detected, redirecting to login');
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}

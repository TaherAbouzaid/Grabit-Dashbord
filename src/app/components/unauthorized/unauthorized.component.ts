import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.css'],
})
export class UnauthorizedComponent {
  constructor(private auth: Auth, private router: Router){}

  async handleLogout() {
    try {
      await this.auth.signOut();
      localStorage.removeItem('userUID');
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}

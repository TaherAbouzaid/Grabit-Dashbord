import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarModule, MenuModule]
})
export class HeaderComponent implements OnInit {
  userEmail: string | null = null;
  userImage: string | null = null;
  userName: string = '';
  userRole: string = '';
  menuItems: MenuItem[] = [];

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) { }

  async ngOnInit() {
    this.menuItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        routerLink: ['/dashboard/profile']
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        routerLink: ['/dashboard/settings']
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];

    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.userEmail = user.email;
        this.userImage = user.photoURL;
        
        // Get user data from Firestore
        const userRef = doc(this.firestore, `users/${user.uid}`);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          this.userName = userData['fullName'] || '';
          this.userRole = userData['role'] || '';
        }
      } else {
        this.userEmail = null;
        this.userImage = null;
        this.userName = '';
        this.userRole = '';
      }
    });
  }

  async logout() {
    try {
      await this.auth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { PanelMenu } from 'primeng/panelmenu';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css'],
  imports: [PanelMenu],
  standalone: true,
})
export class SideBarComponent implements OnInit {
  items!: MenuItem[];
  userRole: string = '';

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore
  ) {}

  async handleLogout() {
    try {
      await this.auth.signOut();
      localStorage.removeItem('userUID');
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async ngOnInit() {
    await this.getUserRole();
    this.loadMenuItems();
  }

  async getUserRole() {
    try {
      const userUID = localStorage.getItem('userUID');
      if (userUID) {
        const userRef = doc(this.firestore, `users/${userUID}`);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          this.userRole = userData['role'] || '';
          console.log('User role loaded:', this.userRole);
        } else {
          console.log('User document does not exist');
        }
      } else {
        console.log('No userUID found in localStorage');
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
  }

  loadMenuItems() {
    // Common menu items for all roles
    const commonItems: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/dashboard'],
      },
      {
        label: 'Profile',
        icon: 'pi pi-user',
        routerLink: ['/dashboard/profile'],
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      }
    ];

    // Role-specific menu items
    switch (this.userRole) {
      case 'admin':
        this.items = [
          ...commonItems,
          {
            label: 'Analytics',
            icon: 'pi pi-chart-line',
            routerLink: ['/dashboard/analytics'],
          },
          {
            label: 'Products',
            icon: 'pi pi-box',
            items: [
              {
                label: 'All Products',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/products'],
              },
              {
                label: 'Add Product',
                icon: 'pi pi-plus',
                routerLink: ['/dashboard/add-product'],
              },
              {
                label: 'Orders',
                icon: 'pi pi-shopping-cart',
                routerLink: ['/dashboard/orders'],
              },
              {
                label: 'Stock',
                icon: 'pi pi-briefcase',
                routerLink: ['/dashboard/stock'],
              },
            ],
          },
          {
            label: 'Categories',
            icon: 'pi pi-tags',
            routerLink: ['/dashboard/category'],
          },
          {
            label: 'Brands',
            icon: 'pi pi-tag',
            routerLink: ['/dashboard/brand'],
          },
          {
            label: 'Users',
            icon: 'pi pi-users',
            items: [
              {
                label: 'All Users',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/users'],
              },
              {
                label: 'Add User',
                icon: 'pi pi-user-plus',
                routerLink: ['/dashboard/add-user'],
              },
            ],
          },
          {
            label: 'Posts',
            items: [
              {
                label: 'Posts',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/list-posts'],
              },
              {
                label: 'Add Post',
                icon: 'pi pi-plus',
                routerLink: ['/dashboard/add-post'],
              },
              
            ],
            icon: 'pi pi-file',
          },
        ];
        break;

      case 'shop manager':
        this.items = [
          ...commonItems,
          {
            label: 'Analytics',
            icon: 'pi pi-chart-line',
            routerLink: ['/dashboard/analytics'],
          },
          {
            label: 'Products',
            icon: 'pi pi-box',
            items: [
              {
                label: 'All Products',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/products'],
              },
              {
                label: 'Add Product',
                icon: 'pi pi-plus',
                routerLink: ['/dashboard/add-product'],
              },
              {
                label: 'Orders',
                icon: 'pi pi-shopping-cart',
                routerLink: ['/dashboard/orders'],
              },
              {
                label: 'Stock',
                icon: 'pi pi-briefcase',
                routerLink: ['/dashboard/stock'],
              },
            ],
          },
          {
            label: 'Categories',
            icon: 'pi pi-tags',
            routerLink: ['/dashboard/category'],
          },
          {
            label: 'Brands',
            icon: 'pi pi-tag',
            routerLink: ['/dashboard/brand'],
          },
        ];
        break;

      case 'vendor':
        this.items = [
          ...commonItems,
          {
            label: 'Analytics',
            icon: 'pi pi-chart-line',
            routerLink: ['/dashboard/analytics'],
          },
          {
            label: 'Products',
            icon: 'pi pi-box',
            items: [
              {
                label: 'All Products',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/products'],
              },
              {
                label: 'Add Product',
                icon: 'pi pi-plus',
                routerLink: ['/dashboard/add-product'],
              },
            ],
          },
        ];
        break;

      case 'Author':
        this.items = [
          ...commonItems,
          {
            label: 'Posts',
            items: [
              {
                label: 'Posts',
                icon: 'pi pi-list',
                routerLink: ['/dashboard/list-posts'],
              },
              {
                label: 'Add Post',
                icon: 'pi pi-plus',
                routerLink: ['/dashboard/add-post'],
              },

            ],
            icon: 'pi pi-file',
          },
        ];
        break;

      default:
        // For unknown roles or customers, show only common items
        this.items = commonItems;
        break;
    }
  }
}

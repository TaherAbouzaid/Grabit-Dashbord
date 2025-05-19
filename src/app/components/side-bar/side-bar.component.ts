import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { PanelMenu } from 'primeng/panelmenu';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css'],
  imports: [PanelMenu],
  standalone: true,
})
export class SideBarComponent implements OnInit {
  items!: MenuItem[];

  constructor(private auth: Auth, private router: Router) {}

  async handleLogout() {
    try {
      await this.auth.signOut();
      localStorage.removeItem('userUID');
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  ngOnInit() {
    this.items = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/dashboard'],
      },
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
        label: 'Reports',
        icon: 'pi pi-chart-line',
        routerLink: ['/dashboard/reports'],
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
            icon: 'pi pi-list',
            routerLink: ['/dashboard/add-post'],
          },
        ],

        icon: 'pi pi-file',
      },

      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.handleLogout(),
      },
    ];
  }
}

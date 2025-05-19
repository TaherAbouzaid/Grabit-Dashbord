import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { AddProductComponent } from './components/add-product/add-product.component';
import { MainComponent } from './components/main/main.component';
import { UsersComponent } from './components/users/users.component';
import { BrandComponent } from './components/brand/brand.component';
import { CategoryComponent } from './components/category/category.component';
import { PostListComponent } from './components/post-list/post-list.component';
import { CommentListComponent } from './components/comment-list/comment-list.component';
import { AddPostComponent } from './components/add-post/add-post.component';
import { AddUserComponent } from './components/add-user/add-user.component';
import { LoginComponent } from './components/login/login.component';
import { UnauthorizedComponent } from './components/unauthorized/unauthorized.component';
import { OrderListComponent } from './components/order-list/order-list.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { PostDetailsComponent } from './components/post-details/post-details.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AuthGuard } from './guards/auth.guard';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StockListComponent } from './components/stock-list/stock-list.component';
export const routes: Routes = [
  {
    path: '',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: MainComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'shop manager', 'vendor', 'Author'] },
    children: [
      {
        path: '',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor', 'Author'] }
      },
      {
        path: 'profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor', 'Author'] }
      },
      {
        path: 'products',
        component: ProductListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor'] }
      },
      {
        path: 'orders/:id',
        component: OrderDetailsComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager'] }
      },
      {
        path: 'add-product',
        component: AddProductComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor'] }
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'add-user',
        component: AddUserComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'brand',
        component: BrandComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager'] }
      },
      {
        path: 'category',
        component: CategoryComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager'] }
      },
      {
        path: 'products/edit/:id',
        component: AddProductComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor'] }
      },
      {
        path: 'orders',
        component: OrderListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager'] }
      },
      {
        path: 'stock',
        component: StockListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager'] }
      },

      {
        path: 'list-posts',
        component: PostListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'Author'] }
      },
      {
        path: 'post-details/:postId',
        component: PostDetailsComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'Author'] }
      },
      {
        path: 'comment-list',
        component: CommentListComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'Author'] }
      },
      {
        path: 'add-post',
        component: AddPostComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'Author'] }
      },
      {
        path: 'analytics',
        component: AnalyticsComponent,
        canActivate: [AuthGuard],
        data: { roles: ['admin', 'shop manager', 'vendor'] }
      }
    ]
  },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '404' }
];

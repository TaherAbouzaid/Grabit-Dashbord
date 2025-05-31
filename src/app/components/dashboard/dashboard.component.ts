import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/Product/product.service';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, getDocs, query, where, collectionData } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    CardModule,
    MessageModule,
    TableModule,
    TagModule,
    CalendarModule,
    ButtonModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styles: [`
    :host ::ng-deep .p-card {
      margin: 1rem;
      height: 100%;
    }
    .grid {
      margin: 0;
    }
  `]
})
export class DashboardComponent implements OnInit {
    salesData: any;
    categoryData: any;
    topProductsData: any;
    inventoryData: any;
    trendingProducts: any[] = [];
    chartOptions: any;
    userRole: string = '';
    vendorId: string = '';

    // New properties for detailed analytics
    dateRange: Date[] = [];
    totalSales: number = 0;
    averageOrderValue: number = 0;
    categoryDetails: any[] = [];
    productDetails: any[] = [];
    lowStockCount: number = 0;
    outOfStockCount: number = 0;
    inventoryValue: number = 0;

    // Overview metrics
    totalProducts: number = 0;
    totalOrders: number = 0;

    constructor(
      private productService: ProductService,
      private auth: Auth,
      private firestore: Firestore
    ) {
      this.chartOptions = {
        plugins: {
          legend: {
            labels: {
              color: '#495057',
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#495057',
            },
            grid: {
              color: '#ebedef',
            },
          },
          y: {
            ticks: {
              color: '#495057',
            },
            grid: {
              color: '#ebedef',
            },
          },
        },
      };
    }

    async ngOnInit() {
      console.log('Starting dashboard initialization...');
      await this.loadUserData();
      console.log('User data loaded:', { userRole: this.userRole, vendorId: this.vendorId });
      await this.loadAnalyticsData();
      console.log('Analytics data loaded:', { salesData: this.salesData, categoryData: this.categoryData });
      await this.loadTrendingProducts();
      console.log('Trending products loaded:', this.trendingProducts);
      await this.loadDetailedAnalytics();
      console.log('Detailed analytics loaded:', {
        totalSales: this.totalSales,
        averageOrderValue: this.averageOrderValue,
        categoryDetails: this.categoryDetails
      });
      await this.loadOverviewData();
      console.log('Overview data loaded:', {
        totalProducts: this.totalProducts,
        totalOrders: this.totalOrders,
        lowStockCount: this.lowStockCount
      });
      const ordersRef = collection(this.firestore, 'orders');
      let ordersQuery = query(ordersRef);

      // Add vendor filter if not admin
      if (this.userRole !== 'admin') {
        ordersQuery = query(ordersRef, where('vendorId', '==', this.vendorId));
      }

      collectionData(ordersQuery, { idField: 'id' }).subscribe((orders: any[]) => {
        this.totalSales = orders
          .filter(order =>
            order.status !== 'cancelled' &&
            order.paymentMethod !== 'cash'
          )
          .reduce((sum, order) => sum + Number(order.finalTotal || 0), 0);
      });
    }

    async loadUserData() {
      console.log('Loading user data...');
      const currentUser = this.auth.currentUser;
      console.log('Current user:', currentUser);
      if (currentUser) {
        const userRef = doc(this.firestore, `users/${currentUser.uid}`);
        const userSnap = await getDoc(userRef);
        console.log('User snapshot:', userSnap.exists());
        if (userSnap.exists()) {
          const userData = userSnap.data();
          this.userRole = userData['role'] || '';
          this.vendorId = currentUser.uid;
          console.log('User data set:', { userRole: this.userRole, vendorId: this.vendorId });
        }
      }
    }

    async loadAnalyticsData() {
      try {
        console.log('Loading analytics data...');
        // Load Sales Data
        const salesAnalytics = await this.productService.getSalesAnalytics(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        console.log('Sales analytics:', salesAnalytics);
        this.salesData = {
          labels: salesAnalytics.labels,
          datasets: [
            {
              label: 'Sales',
              data: salesAnalytics.data,
              fill: false,
              borderColor: '#42A5F5',
              tension: 0.4,
            },
          ],
        };

        // Load Category Data
        const categoryAnalytics = await this.productService.getCategoryAnalytics(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        console.log('Category analytics:', categoryAnalytics);
        this.categoryData = {
          labels: categoryAnalytics.labels,
          datasets: [
            {
              data: categoryAnalytics.data,
              backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0',
                '#9966FF',
              ],
            },
          ],
        };

        // Load Top Products Data
        const topProducts = await this.productService.getTopProducts(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        console.log('Top products:', topProducts);
        this.topProductsData = {
          labels: topProducts.labels,
          datasets: [
            {
              label: 'Sales',
              data: topProducts.data,
              backgroundColor: '#42A5F5',
            },
          ],
        };

        // Load Inventory Status
        const inventoryStatus = await this.productService.getInventoryStatus(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        console.log('Inventory status:', inventoryStatus);
        this.inventoryData = {
          labels: inventoryStatus.labels,
          datasets: [
            {
              data: inventoryStatus.data,
              backgroundColor: ['#4BC0C0', '#FFCE56', '#FF6384'],
            },
          ],
        };
      } catch (error) {
        console.error('Error loading analytics data:', error);
      }
    }

    async loadTrendingProducts() {
      try {
        const products = await this.productService.getTrendingProducts(10);
        this.trendingProducts = products.map((product) => ({
          ...product,
          trendingScore: Math.round(product.trendingScore || 0),
          views: product.views || 0,
          wishlistCount: product.wishlistCount || 0,
          cartAdds: product.cartAdds || 0,
          soldCount: product.soldCount || 0,
          updatedAt: product.updatedAt?.toDate() || new Date(),
          mainImage: product.mainImage || 'assets/images/no-image.png',
          title: product.title || { en: 'No Title' },
        }));
      } catch (error) {
        console.error('Error loading trending products:', error);
        this.trendingProducts = [];
      }
    }

    async loadDetailedAnalytics() {
      try {
        // Load detailed sales data
        const salesData = await this.productService.getSalesAnalytics(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        this.totalSales = salesData.data.reduce(
          (a: number, b: number) => a + b,
          0
        );
        this.averageOrderValue = this.totalSales / (salesData.data.length || 1);

        // Load category details
        const categoryData = await this.productService.getCategoryAnalytics(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        this.categoryDetails = categoryData.labels.map(
          (label: string, index: number) => ({
            name: label,
            products: Math.floor(Math.random() * 50) + 10, // Placeholder data
            sales: categoryData.data[index] * 100, // Placeholder calculation
            growth: Math.floor(Math.random() * 40) - 10, // Placeholder growth
          })
        );

        // Load product details
        const products = await this.productService.getTrendingProducts(5);
        this.productDetails = products.map((product) => ({
          name: product.title?.en || 'Unknown',
          revenue: (product.price || 0) * (product.soldCount || 0),
          unitsSold: product.soldCount || 0,
          profitMargin: Math.floor(Math.random() * 30) + 10, // Placeholder margin
        }));

        // Load inventory details
        const inventoryStatus = await this.productService.getInventoryStatus(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        this.lowStockCount = inventoryStatus.data[1] || 0;
        this.outOfStockCount = inventoryStatus.data[2] || 0;
        this.inventoryValue = this.totalSales * 0.3; // Placeholder calculation
      } catch (error) {
        console.error('Error loading detailed analytics:', error);
      }
    }

    async loadOverviewData() {
      try {
        // Load basic metrics
        const products = await firstValueFrom(this.productService.getProducts(this.userRole, this.vendorId));
        this.totalProducts = products?.length || 0;

        // Calculate total sales
        const salesData = await this.productService.getSalesAnalytics(
          this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
        );
        this.totalSales = salesData.data.reduce((a: number, b: number) => a + b, 0);

        // Calculate total orders - using actual orders data
        const ordersData = await this.productService.getOrdersAnalytics(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        this.totalOrders = ordersData.data.reduce((a: number, b: number) => a + b, 0);

        // Calculate low stock items
        const inventoryStatus = await this.productService.getInventoryStatus(
          this.userRole !== 'admin' ? this.vendorId : undefined
        );
        this.lowStockCount = inventoryStatus.data[1] || 0;

        console.log('Debug Info:', {
          totalProducts: this.totalProducts,
          totalOrders: this.totalOrders,
          userRole: this.userRole,
          vendorId: this.vendorId
        });
      } catch (error) {
        console.error('Error loading overview data:', error);
      }
    }

    async applyDateFilter() {
      if (this.dateRange && this.dateRange.length === 2) {
        // Implement date filtering logic here
        await this.loadAnalyticsData();
        await this.loadDetailedAnalytics();
      }
    }

    async exportData() {
      // Implement data export logic here
      console.log('Exporting data...');
    }
  }

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/Product/product.service';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';

interface Order {
  id: string;
  status: string;
  paymentMethod: string;
  finalTotal: number;
  vendorId?: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    CardModule,
    TableModule,
    TagModule,
    CalendarModule,
    ButtonModule,
    FormsModule,
  ],
  templateUrl: './analytics.component.html',
  styles: [
    `
      :host ::ng-deep .p-card {
        margin: 1rem;
        height: 100%;
      }
      .grid {
        margin: 0;
      }
    `,
  ],
})
export class AnalyticsComponent implements OnInit {
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
    await this.loadUserData();
    await this.loadAnalyticsData();
    await this.loadTrendingProducts();
    await this.loadDetailedAnalytics();
  }

  async loadUserData() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      const userRef = doc(this.firestore, `users/${currentUser.uid}`);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        this.userRole = userData['role'] || '';
        this.vendorId = currentUser.uid;
      }
    }
  }

  async loadAnalyticsData() {
    try {
      // Load Sales Data directly from orders
      const ordersRef = collection(this.firestore, 'orders');
      let ordersQuery = query(ordersRef);
      
      // Add vendor filter if not admin
      if (this.userRole !== 'admin') {
        ordersQuery = query(ordersRef, where('vendorId', '==', this.vendorId));
      }
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      
      // Filter valid orders
      const validOrders = orders.filter(order => 
        order.status !== 'cancelled' && 
        order.paymentMethod !== 'cash'
      );
      
      // Calculate total sales
      this.totalSales = validOrders.reduce((sum, order) => sum + Number(order.finalTotal || 0), 0);
      
      // Calculate average order value
      this.averageOrderValue = validOrders.length > 0 ? this.totalSales / validOrders.length : 0;

      // Prepare sales data for chart
      this.salesData = {
        labels: ['Total Sales'],
        datasets: [
          {
            label: 'Sales',
            data: [this.totalSales],
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
      const products = await this.productService.getTrendingProducts(
        10,
        this.userRole !== 'admin' ? this.vendorId : undefined
      );
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
      // Use the totalSales calculated in loadAnalyticsData
      // Calculate average order value based on valid orders
      const ordersRef = collection(this.firestore, 'orders');
      let ordersQuery = query(ordersRef);
      
      if (this.userRole !== 'admin') {
        ordersQuery = query(ordersRef, where('vendorId', '==', this.vendorId));
      }
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      
      const validOrders = orders.filter(order => 
        order.status !== 'cancelled' && 
        order.paymentMethod !== 'cash'
      );
      
      this.averageOrderValue = validOrders.length > 0 ? this.totalSales / validOrders.length : 0;

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
      const products = await this.productService.getTrendingProducts(
        5,
        this.userRole !== 'admin' ? this.vendorId : undefined
      );
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

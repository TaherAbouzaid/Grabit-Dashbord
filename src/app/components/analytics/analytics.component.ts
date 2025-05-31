import { Component, OnInit, ViewChild, ChangeDetectorRef, AfterViewChecked, OnDestroy } from '@angular/core';
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
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Order {
  id: string;
  status: string;
  paymentMethod: string;
  finalTotal: number;
  vendorId?: string;
  createdAt?: any; // Add createdAt property
  updatedAt?: any; // Add updatedAt property for completeness
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
export class AnalyticsComponent implements OnInit, OnDestroy {
  // Add destroy subject for cleanup
  private destroy$ = new Subject<void>();

  // Chart visibility flags
  showProductChart = false;
  chartDataReady = false;

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

  // Create separate chart options for different chart types
  lineChartOptions: any;
  pieChartOptions: any;
  barChartOptions: any;

  @ViewChild('productChart') productChart: any;

  private dataLoaded = false;

  constructor(
    private productService: ProductService,
    private auth: Auth,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) {
    this.initChartOptions();
  }

  ngOnInit() {
    // Initialize with empty data
    this.initializeEmptyChartData();

    // Load data
    this.loadUserData().then(() => {
      this.loadAnalyticsData();
      this.loadTrendingProducts();
      this.loadDetailedAnalytics();
      this.loadTopProductsData();
    });
  }

  initChartOptions() {
    // Line chart options
    this.lineChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: '#495057'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#495057'
          },
          grid: {
            color: '#ebedef'
          }
        },
        y: {
          ticks: {
            color: '#495057'
          },
          grid: {
            color: '#ebedef'
          }
        }
      }
    };

    // Pie chart options
    this.pieChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: '#495057'
          }
        }
      }
    };

    // Bar chart options
    this.barChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: '#495057'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#495057'
          },
          grid: {
            color: '#ebedef'
          }
        },
        y: {
          ticks: {
            color: '#495057'
          },
          grid: {
            color: '#ebedef'
          }
        }
      }
    };
  }

  // Initialize empty chart data
  private initializeEmptyChartData() {
    this.topProductsData = {
      labels: ['Loading...'],
      datasets: [{ label: 'Sales', data: [0], backgroundColor: '#42A5F5' }]
    };
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
      if (this.userRole !== 'admin' && this.userRole !== 'shop manager') {
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

      // Get last 6 months for sales data
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toLocaleString('default', { month: 'short' });
      }).reverse();

      // Calculate sales per month
      const salesByMonth = months.map(month => {
        const monthOrders = validOrders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate && orderDate.toLocaleString('default', { month: 'short' }) === month;
        });

        return monthOrders.reduce((sum, order) => sum + Number(order.finalTotal || 0), 0);
      });

      // Prepare sales data for chart with monthly data
      this.salesData = {
        labels: months,
        datasets: [
          {
            label: 'Monthly Sales',
            data: salesByMonth,
            fill: false,
            borderColor: '#42A5F5',
            tension: 0.4,
            backgroundColor: '#42A5F5',
          }
        ],
      };

      // Load Category Data
      const categoryAnalytics = await this.productService.getCategoryAnalytics(
        this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
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

      // Load Top Products Data with variants
      await this.loadTopProductsData();

      // Load Inventory Status
      const inventoryStatus = await this.productService.getInventoryStatus(
        this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
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
        this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
      );

      // Load variants for each product
      this.trendingProducts = await Promise.all(products.map(async (product) => {
        // If product is variant type, load its variants
        if (product.productType === 'variant' && product.id) {
          product.variants = await this.productService.getVariantsForProduct(product.id);

          // Use variant title if available
          if (product.variants && product.variants.length > 0) {
            (product as any).displayTitle = product.variants[0].title?.en || product.title?.en || 'Unknown';
          }
        } else {
          (product as any).displayTitle = product.title?.en || 'Unknown';
        }

        return {
          ...product,
          displayTitle: (product as any).displayTitle || product.title?.en || 'Unknown',
          trendingScore: Math.round(product.trendingScore || 0),
          views: product.views || 0,
          wishlistCount: product.wishlistCount || 0,
          cartAdds: product.cartAdds || 0,
          soldCount: product.soldCount || 0,
          updatedAt: this.convertToDate(product.updatedAt),
          mainImage: product.productType === 'variant' && product.variants?.length > 0
            ? product.variants[0]?.mainImage || product.mainImage || 'assets/images/no-image.png'
            : product.mainImage || 'assets/images/no-image.png'
        };
      }));
    } catch (error) {
      console.error('Error loading trending products:', error);
    }
  }

  async loadDetailedAnalytics() {
    try {
      // Use the totalSales calculated in loadAnalyticsData
      // Calculate average order value based on valid orders
      const ordersRef = collection(this.firestore, 'orders');
      let ordersQuery = query(ordersRef);

      if (this.userRole !== 'admin' && this.userRole !== 'shop manager') {
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
        this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
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

  // Load Top Products Data
  async loadTopProductsData() {
    try {
      console.log('Loading top products data...');

      // Hide chart while loading
      this.showProductChart = false;
      this.chartDataReady = false;

      // Get top product IDs
      const topProductIds = await this.productService.getTopProductIds(
        this.userRole !== 'admin' && this.userRole !== 'shop manager' ? this.vendorId : undefined
      );

      if (topProductIds.length === 0) {
        console.log('No top products found');
        this.topProductsData = {
          labels: ['No Products'],
          datasets: [{ label: 'Sales', data: [0], backgroundColor: '#42A5F5' }]
        };
      } else {
        // Get product details
        const topProductsWithVariants = await Promise.all(
          topProductIds.map(async (productId) => {
            const product = await this.productService.getProductById(productId);
            if (product && product.productType === 'variant' && product.id) {
              product.variants = await this.productService.getVariantsForProduct(product.id);
            }
            return product;
          })
        );

        // Create labels and data
        const labels = topProductsWithVariants.map(product =>
          product?.productType === 'variant' && product?.variants?.length > 0
            ? (product?.variants[0]?.title?.en || product?.title?.en || 'Unknown').substring(0, 20) + '...'
            : (product?.title?.en || 'Unknown').substring(0, 20) + '...'
        );

        const data = topProductsWithVariants.map(product => product?.soldCount || 0);

        // Set chart data
        this.topProductsData = {
          labels: labels,
          datasets: [
            {
              label: 'Sales',
              data: data,
              backgroundColor: '#42A5F5',
            },
          ],
        };
      }

      // Set data ready flag
      this.chartDataReady = true;

      // Use timer to delay showing the chart
      timer(500)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.showProductChart = true;
          this.cdr.detectChanges();
        });

    } catch (error) {
      console.error('Error loading top products data:', error);
      this.topProductsData = {
        labels: ['Error'],
        datasets: [{ label: 'Sales', data: [0], backgroundColor: '#42A5F5' }]
      };

      // Set data ready flag even on error
      this.chartDataReady = true;

      // Use timer to delay showing the chart
      timer(500)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.showProductChart = true;
          this.cdr.detectChanges();
        });
    }
  }

  // Helper method to convert various date formats to Date object
  private convertToDate(dateValue: any): Date {
    if (!dateValue) {
      return new Date();
    }

    if (typeof dateValue.toDate === 'function') {
      // It's a Firestore Timestamp
      return dateValue.toDate();
    }

    if (dateValue instanceof Date) {
      // It's already a Date object
      return dateValue;
    }

    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      // It's a string or number that can be parsed to Date
      try {
        return new Date(dateValue);
      } catch (e) {
        console.error('Error converting to date:', e);
        return new Date();
      }
    }

    // Default fallback
    return new Date();
  }

  // Add this method to update charts after view changes
  ngAfterViewChecked() {
    if (this.dataLoaded && this.productChart && this.productChart.chart) {
      this.productChart.chart.update();
    }
  }

  ngOnDestroy() {
    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }
}

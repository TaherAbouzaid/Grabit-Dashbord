import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OrderService } from '../../services/order/order.service';
import { Order, OrderStatus, OrderDisplay } from '../../models/order.model';
import { Observable, switchMap, map, tap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    DropdownModule,
    FormsModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css',
})
export class OrderDetailsComponent implements OnInit {
  order$: Observable<OrderDisplay | null> = of(null);
  loading: boolean = true;
  order: OrderDisplay | null = null;
  selectedStatus: OrderStatus = 'pending';
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private messageService: MessageService
  ) {
    this.loadOrder();
  }

  ngOnInit(): void {
    // Initial loading is handled in constructor
  }

  private loadOrder(): void {
    this.loading = true;
    this.order$ = this.route.params.pipe(
      switchMap((params) => {
        const orderId = params['id'];
        console.log('Route params:', params); // Debug log
        if (!orderId) {
          console.log('No order ID found in params'); // Debug log
          this.router.navigate(['/orders']);
          return of(null);
        }
        console.log('Loading order with ID:', orderId); // Debug log
        return this.orderService.getOrderById(orderId).pipe(
          tap((order) => {
            console.log('Raw order data from service:', order); // Debug log
            if (!order) {
              console.log('No order data received from service'); // Debug log
            }
          }),
          catchError((error) => {
            console.error('Error loading order:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'فشل في تحميل بيانات الطلب',
            });
            return of(null);
          })
        );
      })
    );

    this.order$.subscribe({
      next: (order) => {
        console.log('Setting order in component:', order); // Debug log
        this.order = order;
        if (order) {
          console.log('Order status:', order.status); // Debug log
          this.selectedStatus = order.status;
        } else {
          console.log('No order data to set'); // Debug log
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error in order subscription:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل بيانات الطلب',
        });
      },
    });
  }

  getStatusSeverity(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'shipped':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: OrderStatus): string {
    return status;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    if (!orderId) return;
    this.loading = true;
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تحديث حالة الطلب بنجاح',
        });
        if (this.order) {
          this.order.status = status;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تحديث حالة الطلب',
        });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/orders']);
  }
}

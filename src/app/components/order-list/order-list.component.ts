import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { OrderService } from '../../services/order/order.service';
import { OrderDisplay, OrderStatus } from '../../models/order.model';
import { Observable, tap, catchError, of } from 'rxjs';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule, DropdownModule, FormsModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.css'
})
export class OrderListComponent implements OnInit {
  orders$: Observable<OrderDisplay[]> = of([]);
  loading: boolean = true;
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  constructor(
    private orderService: OrderService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.loadOrders();
  }

  ngOnInit(): void {
  }

  private loadOrders(): void {
    this.loading = true;
    this.orderService.getAllOrders().then(orders => {
      this.orders$ = of(orders);
      this.loading = false;
    }).catch(error => {
      console.error('Error loading orders:', error);
      this.orders$ = of([]);
      this.loading = false;
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

  deleteOrder(orderId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد أنك تريد حذف هذا الطلب؟',
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.orderService.deleteOrder(orderId).subscribe({
          next: () => {
            this.loadOrders();
            this.messageService.add({
              severity: 'success',
              summary: 'تم الحذف',
              detail: 'تم حذف الطلب بنجاح',
              life: 3000
            });
          },
          error: (err) => {
            console.error('Error deleting order:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف الطلب',
              life: 3000
            });
          }
        });
      }
    });
  }

  updateOrderStatus(order: OrderDisplay, status: OrderStatus): void {
    if (!order.id) return;
    this.loading = true;
    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Order status updated successfully',
          life: 2000
        });
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update order status',
          life: 2000
        });
      }
    });
  }
}

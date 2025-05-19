import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp, collectionData, docData, getDoc } from '@angular/fire/firestore';
import { Order, OrderStatus, OrderDisplay } from '../../models/order.model';
import { Observable, from, map, take, tap, catchError, of, forkJoin, switchMap, mergeMap, firstValueFrom, defer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly COLLECTION_NAME = 'orders';
  private readonly USERS_COLLECTION = 'users';
  private readonly PRODUCTS_COLLECTION = 'allproducts';
  totalSales: number = 0;
  constructor(private firestore: Firestore) { }


  // ngOnInit() {
   
  // }


  private async getUserData(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(this.firestore, this.USERS_COLLECTION, userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  private async getProductData(productId: string): Promise<any> {
    try {
      console.log('getProductData: Starting to fetch product...');
      console.log('getProductData: Collection name:', this.PRODUCTS_COLLECTION);
      console.log('getProductData: Product ID:', productId);
      
      const productRef = doc(this.firestore, this.PRODUCTS_COLLECTION, productId);
      console.log('getProductData: Product reference created');
      
      const productDoc = await getDoc(productRef);
      console.log('getProductData: Document exists:', productDoc.exists());
      
      if (productDoc.exists()) {
        const productData = productDoc.data();
        console.log('getProductData: Product data retrieved:', productData);
        return productData;
      }
      
      console.log('getProductData: No product data found for ID:', productId);
      return null;
    } catch (error: any) {
      console.error('getProductData: Error fetching product data:', error);
      console.error('getProductData: Error details:', {
        productId,
        collection: this.PRODUCTS_COLLECTION,
        error: error.message
      });
      return null;
    }
  }

  private async transformOrderData(doc: any): Promise<OrderDisplay> {
    try {
      const data = doc.data();
      console.log('Transform: Raw data from Firestore:', data);

      if (!data) {
        console.log('Transform: No data found in document');
        return this.getDefaultOrderDisplay(doc.id);
      }

      // Get user data
      const userData = await this.getUserData(data.userId);
      console.log('User data:', userData);

      // Transform products
      console.log('Transform: Starting to process products array:', data.products);
      const itemsWithProductData = await Promise.all(
        (data.products || []).map(async (item: any) => {
          console.log('Transform: Processing product item:', item);
          console.log('Transform: Product ID to fetch:', item.productId);
          
          const productData = await this.getProductData(item.productId);
          console.log('Transform: Received product data:', productData);
          
          const transformedItem = {
            productId: item.productId,
            nameEn: productData?.name?.en || productData?.title?.en || 'Unknown Product',
            nameAr: productData?.name?.ar || productData?.title?.ar || 'منتج غير معروف',
            price: Number(productData?.price) || Number(productData?.discountPrice) || 0,
            quantity: item.quantity || 0,
            sku: productData?.sku || '',
            variantId: item.variantId || '',
            mainImage: productData?.mainImage || ''
          };
          console.log('Transform: Transformed item:', transformedItem);
          return transformedItem;
        })
      );
      console.log('Transform: All products processed:', itemsWithProductData);

      const transformedOrder: OrderDisplay = {
        id: data.orderId || doc.id,
        customerId: data.userId || '',
        customerName: data.shippingAddress?.name || 'Unknown Customer',
        customerEmail: userData?.email || 'No Email',
        customerPhone: data.shippingAddress?.phone || 'No Phone',
        items: itemsWithProductData,
        totalAmount: Number(data.finalTotal) || 0,
        status: this.validateStatus(data.status),
        paymentMethod: data.paymentMethod || 'cash',
        paymentStatus: 'pending',
        shippingAddress: data.shippingAddress ? 
          `${data.shippingAddress.address}, ${data.shippingAddress.city}, ${data.shippingAddress.country}` : 
          'No Address',
        createdAt: this.parseDate(data.createdAt),
        updatedAt: this.parseDate(data.updatedAt)
      };

      console.log('Transform: Final transformed order:', transformedOrder);
      return transformedOrder;
    } catch (error) {
      console.error('Transform: Error transforming order data:', error);
      return this.getDefaultOrderDisplay(doc.id);
    }
  }

  private getDefaultOrderDisplay(id: string): OrderDisplay {
    return {
      id,
      customerId: '',
      customerName: 'Unknown Customer',
      customerEmail: 'No Email',
      customerPhone: 'No Phone',
      items: [],
      totalAmount: 0,
      status: 'pending',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      shippingAddress: 'No Address',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private validateStatus(status: any): OrderStatus {
    const validStatuses: OrderStatus[] = ['pending', 'shipped', 'delivered', 'cancelled'];
    return validStatuses.includes(status) ? status : 'pending';
  }

  private parseDate(date: any): Date {
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    if (typeof date === 'number') {
      return new Date(date);
    }
    return new Date();
  }

  // Create new order
  createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    const orderData = {
      ...order,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    return from(addDoc(collection(this.firestore, this.COLLECTION_NAME), orderData))
      .pipe(map(docRef => docRef.id));
  }

  // Get all orders
  async getAllOrders(): Promise<OrderDisplay[]> {
    try {
      const ordersRef = collection(this.firestore, this.COLLECTION_NAME);
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orders = await Promise.all(snapshot.docs.map(doc => this.transformOrderData(doc)));
      return orders;
    } catch (error) {
      console.error('Error getting all orders:', error);
      return [];
    }
  }

  // Get orders by user ID
  async getOrdersByUserId(userId: string): Promise<OrderDisplay[]> {
    try {
      const ordersRef = collection(this.firestore, this.COLLECTION_NAME);
      const q = query(
        ordersRef,
        where('customerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const orders = await Promise.all(snapshot.docs.map(doc => this.transformOrderData(doc)));
      return orders;
    } catch (error) {
      console.error('Error getting orders by user ID:', error);
      return [];
    }
  }

  // Get order by ID
  getOrderById(id: string): Observable<OrderDisplay | null> {
    console.log('Service: Getting order by ID:', id);
    if (!id) {
      console.log('Service: Invalid order ID provided');
      return of(null);
    }

    const orderRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(getDoc(orderRef)).pipe(
      switchMap(async (doc) => {
        if (doc.exists()) {
          const transformedOrder = await this.transformOrderData(doc);
          return transformedOrder;
        }
        return null;
      }),
      catchError(error => {
        console.error('Service: Error getting order:', error);
        return of(null);
      })
    );
  }

  // Update order status
  updateOrderStatus(id: string, status: OrderStatus): Observable<void> {
    const orderRef = doc(this.firestore, this.COLLECTION_NAME, id);
    return from(updateDoc(orderRef, { 
      status,
      updatedAt: Timestamp.now()
    }));
  }

  // Delete order
  deleteOrder(orderId: string): Observable<void> {
    const orderRef = doc(this.firestore, this.COLLECTION_NAME, orderId);
    return from(deleteDoc(orderRef));
  }
}

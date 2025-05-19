import { Injectable } from '@angular/core';
import { Firestore, collection, updateDoc, deleteDoc, addDoc, getDoc, getDocs, collectionData, doc, Timestamp, writeBatch, query, where, Query, orderBy, limit } from '@angular/fire/firestore';
import { runTransaction } from 'firebase/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from } from 'rxjs';
import { Product, Variant } from '../../models/products';
import { query as firestoreQuery } from 'firebase/firestore/lite';
import { Order } from '../../models/order.model';
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private firestore: Firestore, private storage: Storage) {}

  async addProduct(product: Product, variants: Variant[]): Promise<string> {
    const productRef = collection(this.firestore, 'allproducts');
    const batch = writeBatch(this.firestore);

    try {
      const defaultFields = {
        ratingSummary: { average: 0, count: 0 },
        wishlistCount: 0,
        trendingScore: 0,
        cartAdds: 0,
        soldCount: 0,
        views: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const newProductDoc = doc(productRef);
      batch.set(newProductDoc, { ...defaultFields, ...product });

      if (variants?.length) {
        const variantsRef = collection(
          this.firestore,
          `allproducts/${newProductDoc.id}/variants`
        );
        variants.forEach((variant) => {
          const variantDoc = doc(variantsRef);
          batch.set(variantDoc, variant);
        });
      }

      await batch.commit();

      // Add product to vendor's productIds
      if (product.vendorId) {
        await this.addProductToVendor(newProductDoc.id, product.vendorId);
      }

      return newProductDoc.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  getProducts(userRole: string, vendorId?: string): Observable<Product[]> {
    const productsRef = collection(this.firestore, 'allproducts');
    let q;

    // If user is admin or shop manager, show all products
    if (userRole === 'admin' || userRole === 'shop manager') {
      q = productsRef;
    } else {
      // For vendors, get their productIds first
      const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
      return new Observable<Product[]>((observer) => {
        getDoc(vendorRef)
          .then((vendorSnap) => {
            if (vendorSnap.exists()) {
              const vendorData = vendorSnap.data();
              const productIds = vendorData['productIds'] || [];

              if (productIds.length === 0) {
                observer.next([]);
                observer.complete();
                return;
              }

              // Create a query to get only the vendor's products
              q = query(productsRef, where('__name__', 'in', productIds));
              collectionData(q, { idField: 'id' }).subscribe(
                (products) => {
                  observer.next(products as Product[]);
                  observer.complete();
                },
                (error) => {
                  observer.error(error);
                }
              );
            } else {
              observer.next([]);
              observer.complete();
            }
          })
          .catch((error) => {
            observer.error(error);
          });
      });
    }

    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }

  getProductsByVendorId(vendorId: string): Observable<Product[]> {
    const productsRef = collection(this.firestore, 'allproducts');
    const vendorRef = doc(this.firestore, `vendors/${vendorId}`);

    return new Observable<Product[]>((observer) => {
      getDoc(vendorRef)
        .then((vendorSnap) => {
          if (vendorSnap.exists()) {
            const vendorData = vendorSnap.data();
            const productIds = vendorData['productIds'] || [];

            if (productIds.length === 0) {
              observer.next([]);
              observer.complete();
              return;
            }

            // Create a query to get only the vendor's products
            const q = query(productsRef, where('__name__', 'in', productIds));
            collectionData(q, { idField: 'id' }).subscribe(
              (products) => {
                observer.next(products as Product[]);
                observer.complete();
              },
              (error) => {
                observer.error(error);
              }
            );
          } else {
            observer.next([]);
            observer.complete();
          }
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  async getProductVariants(productId: string): Promise<Variant[]> {
    try {
      const variantsRef = collection(
        this.firestore,
        `allproducts/${productId}/variants`
      );
      const variantsQuery = query(variantsRef);
      const variantsSnapshot = await getDocs(variantsQuery);
      return variantsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Variant)
      );
    } catch (error) {
      console.error('Error fetching variants:', error);
      throw error;
    }
  }

  async uploadImage(file: File, path: string): Promise<string> {
    try {
      console.log('Starting image upload...', { file, path });
      
      if (!file) {
        throw new Error('No file provided');
      }

    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed.');
    }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size too large. Maximum size is 5MB');
      }

    const storageRef = ref(this.storage, path);
      console.log('Storage reference created');

      const uploadResult = await uploadBytes(storageRef, file);
      console.log('File uploaded successfully', uploadResult);

      const url = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', url);

      return url;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      throw error;
    }
  }

  async uploadImages(files: File[], basePath: string): Promise<string[]> {
    return await Promise.all(
      files.map((file, index) => {
        const path = `${basePath}/${Date.now()}_${index}_${file.name}`;
        return this.uploadImage(file, path);
      })
    );
  }

  // //get product by id
  async getProductById(productId: string): Promise<Product | undefined> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    const productSnap = await getDoc(productDoc);
    if (productSnap.exists()) {
      return { id: productSnap.id, ...productSnap.data() } as Product;
    }
    return undefined;
  }

  //update product

  async updateProduct(
    productId: string,
    data: Partial<Product>
  ): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const productSnap = await transaction.get(productDoc);

      if (!productSnap.exists()) {
        throw new Error('Product does not exist.');
      }

      const currentProduct = productSnap.data();
      const updatedProduct = {
        ...currentProduct,
        ...data,
        updatedAt: Timestamp.now(),
      };

      // Calculate new trending score
      const trendingScore = this.calculateTrendingScore(updatedProduct);

      transaction.update(productDoc, {
        ...data,
        trendingScore,
        updatedAt: Timestamp.now(),
      });
    });
  }

  // ..............................................
  //update with vraint
  async updateProductWithVariants(
    productId: string,
    productData: Partial<Product>,
    variants: Variant[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    try {
      // Update product
      const productDoc = doc(this.firestore, `allproducts/${productId}`);
      batch.update(productDoc, { ...productData, updatedAt: Timestamp.now() });

      // Delete old variants
      const variantsRef = collection(
        this.firestore,
        `allproducts/${productId}/variants`
      );
      const variantsSnapshot = await getDocs(variantsRef);
      variantsSnapshot.docs.forEach((variant) => batch.delete(variant.ref));

      // Add new variants
      variants.forEach((variant) => {
        const variantDoc = doc(variantsRef);
        batch.set(variantDoc, variant);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating product with variants:', error);
      throw error;
    }
  }
  //...........................

  //delete product
  async deleteProduct(productId: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    try {
      const productDoc = doc(this.firestore, `allproducts/${productId}`);
      const productSnap = await getDoc(productDoc);
      const productData = productSnap.data();
      const vendorId = productData?.['vendorId'];

      const variantsRef = collection(
        this.firestore,
        `allproducts/${productId}/variants`
      );
      const variantsSnapshot = await getDocs(variantsRef);

      // Delete variants
      variantsSnapshot.docs.forEach((variant) => batch.delete(variant.ref));

      // Delete product
      batch.delete(productDoc);

      await batch.commit();

      // Remove product from vendor's productIds
      if (vendorId) {
        await this.removeProductFromVendor(productId, vendorId);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getSalesAnalytics(vendorId?: string): Promise<any> {
    const ordersRef = collection(this.firestore, 'orders');
    let q: any = ordersRef;

    if (vendorId) {
      q = query(ordersRef, where('vendorId', '==', vendorId));
    }

    console.log('Query:', q);
    const snapshot = await getDocs(q);
    console.log('Snapshot size:', snapshot.size);
    let totalSales = 0;

    snapshot.forEach((doc) => {
      const order = doc.data() as Order;
      console.log('Order Data:', {
        status: order.status,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount
      });
      if (
        order.status !== 'cancelled' &&
        order.paymentMethod !== 'cod'
      ) {
        totalSales += Number(order.totalAmount || 0);
      }
    });
    console.log('Final Total Sales:', totalSales);

    return {
      data: [totalSales],
      labels: ['Total Sales']
    };
  }

  async getCategoryAnalytics(vendorId?: string): Promise<any> {
    const productsRef = collection(this.firestore, 'allproducts');
    let q: Query = productsRef;

    if (vendorId) {
      q = query(productsRef, where('vendorId', '==', vendorId));
    }

    const snapshot = await getDocs(q);
    const categoryCount: { [key: string]: number } = {};

    if (snapshot.empty) {
      return {
        labels: ['No Categories'],
        data: [1],
      };
    }

    snapshot.forEach((doc) => {
      const product = doc.data();
      const category = product['categoryId']?.name?.en || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return {
      labels: Object.keys(categoryCount),
      data: Object.values(categoryCount),
    };
  }

  async getTopProducts(vendorId?: string): Promise<any> {
    const productsRef = collection(this.firestore, 'allproducts');
    let q: Query = productsRef;

    if (vendorId) {
      // Get vendor's salesProducts
      const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const salesProducts = vendorData['salesProducts'] || [];

        if (salesProducts.length === 0) {
          return {
            labels: ['No Products'],
            data: [0],
          };
        }

        // Query only the products in salesProducts array
        q = query(productsRef, where('__name__', 'in', salesProducts));
      }
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        labels: ['No Products'],
        data: [0],
      };
    }

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Product & { id: string })[];

    // Sort products by soldCount
    const topProducts = products
      .sort((a, b) => (b['soldCount'] || 0) - (a['soldCount'] || 0))
      .slice(0, 5);

    return {
      labels: topProducts.map((p) => p['title']?.en || 'Unknown'),
      data: topProducts.map((p) => p['soldCount'] || 0),
    };
  }

  async getInventoryStatus(vendorId?: string): Promise<any> {
    const productsRef = collection(this.firestore, 'allproducts');
    let q: Query = productsRef;

    if (vendorId) {
      // Get vendor's productIds
      const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const productIds = vendorData['productIds'] || [];

        if (productIds.length === 0) {
          return {
            labels: ['In Stock', 'Low Stock', 'Out of Stock'],
            data: [0, 0, 0],
          };
        }

        // Query only the products in productIds array
        q = query(productsRef, where('__name__', 'in', productIds));
      }
    }

    const snapshot = await getDocs(q);
    const status = {
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
    };

    if (snapshot.empty) {
      return {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        data: [0, 0, 0],
      };
    }

    snapshot.forEach((doc) => {
      const product = doc.data();
      const quantity = product['quantity'] || 0;
      if (quantity === 0) {
        status.outOfStock++;
      } else if (quantity < 5) {
        status.lowStock++;
      } else {
        status.inStock++;
      }
    });

    return {
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      data: [status.inStock, status.lowStock, status.outOfStock],
    };
  }

  async updateTrendingScore(productId: string): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    const productSnap = await getDoc(productDoc);

    if (productSnap.exists()) {
      const product = productSnap.data();
      const trendingScore = this.calculateTrendingScore(product);
      await updateDoc(productDoc, {
        trendingScore,
        lastTrendingUpdate: Timestamp.now(),
      });
    }
  }

  private calculateTrendingScore(product: any): number {
    // Base engagement metrics
    const views = product['views'] || 0;
    const wishlistCount = product['wishlistCount'] || 0;
    const cartAdds = product['cartAdds'] || 0;
    const soldCount = product['soldCount'] || 0;

    // Time factors
    const createdAt = product['createdAt']?.toDate() || new Date();
    const updatedAt = product['updatedAt']?.toDate() || new Date();
    const now = new Date();

    // Calculate time decay factors
    const daysSinceCreation = Math.max(
      1,
      Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysSinceUpdate = Math.max(
      1,
      Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Recency factor (more weight to recently updated products)
    const recencyFactor = 1 / Math.log(daysSinceUpdate + 1);

    // Age factor (slight penalty for very old products)
    const ageFactor = 1 / Math.log(daysSinceCreation + 1);

    // Engagement score
    const engagementScore =
      views * 1 + // Basic view weight
      wishlistCount * 2 + // Higher weight for wishlist adds
      cartAdds * 2 + // Higher weight for cart adds
      soldCount * 3; // Highest weight for actual sales

    // Stock factor (penalize out of stock products)
    const quantity = product['quantity'] || 0;
    const stockFactor = quantity > 0 ? 1 : 0.5;

    // Price competitiveness factor
    const price = product['price'] || 0;
    const discountPrice = product['discountPrice'] || 0;
    const discountFactor = discountPrice > 0 ? 1.2 : 1; // Boost score for products with discounts

    // Rating factor
    const ratingAverage = product['ratingSummary']?.average || 0;
    const ratingCount = product['ratingSummary']?.count || 0;
    const ratingFactor = ratingCount > 0 ? 1 + ratingAverage / 5 : 1;

    // Calculate final score
    const finalScore = Math.round(
      engagementScore *
        recencyFactor *
        ageFactor *
        stockFactor *
        discountFactor *
        ratingFactor
    );

    return finalScore;
  }

  async incrementViews(productId: string): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const productSnap = await transaction.get(productDoc);
      if (productSnap.exists()) {
        const product = productSnap.data();
        const currentViews = product['views'] || 0;
        const newViews = currentViews + 1;

        // Calculate new trending score
        const updatedProduct = {
          ...product,
          views: newViews,
          updatedAt: Timestamp.now(),
        };
        const trendingScore = this.calculateTrendingScore(updatedProduct);

        transaction.update(productDoc, {
          views: newViews,
          trendingScore,
          updatedAt: Timestamp.now(),
        });
      }
    });
  }

  async updateWishlistCount(
    productId: string,
    increment: boolean = true
  ): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const productSnap = await transaction.get(productDoc);
      if (productSnap.exists()) {
        const product = productSnap.data();
        const currentCount = product['wishlistCount'] || 0;
        const newCount = increment ? currentCount + 1 : currentCount - 1;

        // Calculate new trending score
        const updatedProduct = {
          ...product,
          wishlistCount: newCount,
          updatedAt: Timestamp.now(),
        };
        const trendingScore = this.calculateTrendingScore(updatedProduct);

        transaction.update(productDoc, {
          wishlistCount: newCount,
          trendingScore,
          updatedAt: Timestamp.now(),
        });
      }
    });
  }

  async incrementCartAdds(productId: string): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const productSnap = await transaction.get(productDoc);
      if (productSnap.exists()) {
        const product = productSnap.data();
        const currentAdds = product['cartAdds'] || 0;
        const newAdds = currentAdds + 1;

        // Calculate new trending score
        const updatedProduct = {
          ...product,
          cartAdds: newAdds,
          updatedAt: Timestamp.now(),
        };
        const trendingScore = this.calculateTrendingScore(updatedProduct);

        transaction.update(productDoc, {
          cartAdds: newAdds,
          trendingScore,
          updatedAt: Timestamp.now(),
        });
      }
    });
  }

  async incrementSoldCount(productId: string): Promise<void> {
    const productDoc = doc(this.firestore, `allproducts/${productId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const productSnap = await transaction.get(productDoc);
      if (productSnap.exists()) {
        const product = productSnap.data();
        const currentSold = product['soldCount'] || 0;
        const newSold = currentSold + 1;
        const vendorId = product['vendorId'];

        // Calculate new trending score
        const updatedProduct = {
          ...product,
          soldCount: newSold,
          updatedAt: Timestamp.now(),
        };
        const trendingScore = this.calculateTrendingScore(updatedProduct);

        transaction.update(productDoc, {
          soldCount: newSold,
          trendingScore,
          updatedAt: Timestamp.now(),
        });

        // Update vendor's salesProducts array
        if (vendorId) {
          const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
          const vendorSnap = await transaction.get(vendorRef);
          if (vendorSnap.exists()) {
            const vendorData = vendorSnap.data();
            const salesProducts = vendorData['salesProducts'] || [];
            if (!salesProducts.includes(productId)) {
              const newSalesProducts = [...salesProducts, productId];
              transaction.update(vendorRef, {
                salesProducts: newSalesProducts,
                updatedAt: Timestamp.now(),
              });
            }
          }
        }
      }
    });
  }

  // Add method to get trending products
  async getTrendingProducts(
    productsLimit: number = 10,
    vendorId?: string
  ): Promise<Product[]> {
    const productsRef = collection(this.firestore, 'allproducts'); // المرجع للكولكشن

    let q = query(productsRef); // استعلام مبدأي

    if (vendorId) {
      // لو في vendorId، فلتر المنتجات الخاصة بيه فقط
      q = query(
        productsRef,
        where('vendorId', '==', vendorId),
        orderBy('trendingScore', 'desc'),
        limit(productsLimit)
      );
    } else {
      // لو مفيش vendorId، هات أفضل المنتجات بترتيب التريند
      q = query(
        productsRef,
        orderBy('trendingScore', 'desc'),
        limit(productsLimit)
      );
    }

    const snapshot = await getDocs(q); // نفذ الاستعلام
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Product)
    ); // رجع البيانات بشكل مصفوفة من Product
  }

  async updateAllProductsTrendingScores(): Promise<void> {
    const productsRef = collection(this.firestore, 'allproducts');
    const snapshot = await getDocs(productsRef);

    const batch = writeBatch(this.firestore);
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit

    for (const doc of snapshot.docs) {
      const product = doc.data();
      const trendingScore = this.calculateTrendingScore(product);

      batch.update(doc.ref, {
        trendingScore,
        lastTrendingUpdate: Timestamp.now(),
      });

      batchCount++;

      // Firestore has a limit of 500 operations per batch
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  async getOrdersAnalytics(vendorId?: string): Promise<any> {
    const ordersRef = collection(this.firestore, 'orders');
    let q: Query = ordersRef;

    if (vendorId) {
      // Get vendor's salesProducts
      const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const salesProducts = vendorData['salesProducts'] || [];

        if (salesProducts.length === 0) {
          return {
            labels: ['No Orders'],
            data: [0],
          };
        }

        // Get all orders first
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.filter((doc) => {
          const orderData = doc.data();
          const products = orderData['products'] || [];
          // Check if any product's productId is in salesProducts
          return products.some((product: any) =>
            salesProducts.includes(product.productId)
          );
        });

        // Get last 6 months
        const months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date.toLocaleString('default', { month: 'short' });
        }).reverse();

        const ordersByMonth = months.map((month) => {
          return orders.filter((doc) => {
            const orderDate = doc.data()['createdAt']?.toDate();
            return (
              orderDate &&
              orderDate.toLocaleString('default', { month: 'short' }) === month
            );
          }).length;
        });

        return {
          labels: months,
          data: ordersByMonth,
        };
      }
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        labels: ['No Orders'],
        data: [0],
      };
    }

    // Get last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toLocaleString('default', { month: 'short' });
    }).reverse();

    const ordersByMonth = months.map((month) => {
      return snapshot.docs.filter((doc) => {
        const orderDate = doc.data()['createdAt']?.toDate();
        return (
          orderDate &&
          orderDate.toLocaleString('default', { month: 'short' }) === month
        );
      }).length;
    });

    return {
      labels: months,
      data: ordersByMonth,
    };
  }

  async updateVendorProductCount(vendorId: string): Promise<void> {
    const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const vendorSnap = await transaction.get(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const productIds = vendorData['productIds'] || [];
        transaction.update(vendorRef, {
          numberOfProducts: productIds.length,
          updatedAt: Timestamp.now(),
        });
      }
    });
  }

  // Update addProductToVendor method
  async addProductToVendor(productId: string, vendorId: string): Promise<void> {
    const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const vendorSnap = await transaction.get(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const productIds = vendorData['productIds'] || [];
        if (!productIds.includes(productId)) {
          const newProductIds = [...productIds, productId];
          transaction.update(vendorRef, {
            productIds: newProductIds,
            updatedAt: Timestamp.now(),
          });
        }
      }
    });
  }

  async removeProductFromVendor(
    productId: string,
    vendorId: string
  ): Promise<void> {
    const vendorRef = doc(this.firestore, `vendors/${vendorId}`);
    await runTransaction(this.firestore, async (transaction) => {
      const vendorSnap = await transaction.get(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const productIds = vendorData['productIds'] || [];
        const newProductIds = productIds.filter(
          (id: string) => id !== productId
        );
        transaction.update(vendorRef, {
          productIds: newProductIds,
          updatedAt: Timestamp.now(),
        });
      }
    });
  }

  async getVariantsForProduct(productId: string): Promise<any[]> {
    const variantsRef = collection(this.firestore, `allproducts/${productId}/variants`);
    const snapshot = await getDocs(variantsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

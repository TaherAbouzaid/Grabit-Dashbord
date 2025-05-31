import { Category } from './../../models/category';
import { Product } from './../../models/products';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ProductService } from '../../services/Product/product.service';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
// import { FileUpload } from 'primeng/fileupload';
import { SelectModule } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { RadioButton } from 'primeng/radiobutton';
import { Rating } from 'primeng/rating';
import { FormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Table } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { Router, RouterModule } from '@angular/router';
import { Breadcrumb } from 'primeng/breadcrumb';
import { CategoryService } from '../../services/category/category.service';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  imports: [TableModule,
     Dialog,
      SelectModule,
      ButtonModule,
       ToastModule,
        ToolbarModule,
         ConfirmDialog,
         InputTextModule,
         TextareaModule,
         CommonModule,
         DropdownModule,
         Tag,
         RadioButton,
         Rating,
         InputTextModule,
         FormsModule,
         InputNumber,
         IconFieldModule,
        InputIconModule,
        Breadcrumb,
       RouterModule

        ],
  providers: [MessageService, ConfirmationService, ProductService,CategoryService],
  styles: [
    `:host ::ng-deep .p-dialog .product-image {
        width: 150px;
        margin: 0 auto 2rem auto;
        display: block;
    }`
]
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  product: any = {};
  productDialog: boolean = false;
  submitted: boolean = false;
  selectedProducts: any[] = [];
  statuses: any[] = [];
  categories: any[] = [];
  subCategories: any[] = [];
  userRole: string = '';
  vendorId: string = '';
  variantsDialog: boolean = false;
  selectedProduct: any = null;

  @ViewChild('dt') dt!: Table;

  cols!: Column[];

  exportColumns!: ExportColumn[];
  items: MenuItem[] = [];

  constructor(
    private productService: ProductService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private categoryService: CategoryService,
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.statuses = [
      { label: 'INSTOCK', value: 'INSTOCK' },
      { label: 'LOWSTOCK', value: 'LOWSTOCK' },
      { label: 'OUTOFSTOCK', value: 'OUTOFSTOCK' }
    ];
  }

  async ngOnInit() {
    await this.loadUserData();
    this.loadDemoData();
    this.loadCategories();
    this.loadSubCategories();

    this.items = [
      { icon: 'pi pi-home', route: '/dashboard' },
      { label: 'All Product', route: '/dashboard/products' }
    ];
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

  loadDemoData() {
    this.productService.getProducts(this.userRole, this.vendorId).subscribe(async (data) => {
      this.products = await Promise.all(data.map(async product => {
        if (product.productType === 'variant' && product.id) {
          product.variants = await this.productService.getVariantsForProduct(product.id);
        }

        // Safely convert updatedAt to a JavaScript Date object
        let updatedAtDate = null;
        if (product.updatedAt) {
          if (typeof product.updatedAt.toDate === 'function') {
            // It's a Firestore Timestamp
            updatedAtDate = product.updatedAt.toDate();
          } else if (product.updatedAt instanceof Date) {
            // It's already a Date object
            updatedAtDate = product.updatedAt;
          } else if (typeof product.updatedAt === 'string') {
            // It's a string, try to parse it
            updatedAtDate = new Date(product.updatedAt);
          } else if (typeof product.updatedAt === 'number') {
            // It's a timestamp in milliseconds
            updatedAtDate = new Date(product.updatedAt);
          }
        }

        console.log('Product:', product.title?.en, 'updatedAt:', updatedAtDate);

        return {
          ...product,
          name: product.title?.en || 'No title',
          category: product.categoryId?.name?.en || 'No category',
          categoryId: product.categoryId?.categoryId || '',
          subCategory: product.subCategoryId?.name?.en || 'No sub category',
          subCategoryId: product.subCategoryId?.subcategoryId || '',
          inventoryStatus: this.getStatus(product.quantity || 0),
          rating: product.ratingSummary?.average || 0,
          updatedAt: updatedAtDate
        };
      }));

      // Sort products by updatedAt in descending order (newest first)
      this.products.sort((a, b) => {
        if (!a.updatedAt) return 1;  // null dates go to the end
        if (!b.updatedAt) return -1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });

      console.log('All products with dates (after sorting):', this.products.map(p => ({
        name: p.name,
        updatedAt: p.updatedAt
      })));

      this.cd.markForCheck();
    });
  }

  exportCSV() {
    this.dt.exportCSV();
}

  // items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  hideDialog() {
    this.productDialog = false;
    this.submitted = false;
  }

  deleteProduct(productId: string): void {
      this.confirmationService.confirm({
          message: 'Are you sure you want to delete ?',
          header: 'Confirm',
          icon: 'pi pi-exclamation-triangle',
          accept: () => {
            this.productService.deleteProduct(productId).then(() => {
              this.products = this.products.filter((val) => val.id !==productId);
              this.messageService.add({
                  severity: 'success',
                  summary: 'Successful',
                  detail: 'Product Deleted',
                  life: 3000
              });
            }).catch(error => {
              alert('something went wrong');
              console.error('Error deleting product:', error);
            });
          }
          }
      );
    }

  findIndexById(id: string): number {
    let index = -1;
    for (let i = 0; i < this.products.length; i++) {
        if (this.products[i].id === id) {
            index = i;
            break;
        }
    }

    return index;
  }

  getSeverity(quantity: number): 'success' | 'warn' | 'danger' | 'secondary' {
    if (quantity > 10) return 'success';
    else if (quantity > 0) return 'warn';
    else if (quantity === 0) return 'danger';
    return 'secondary'; // Map 'unKnown' to 'secondary'
  }

  getStatus( quantity: number) {
    if (quantity === 0) {
        return 'outofstock';
    }
    else if (quantity < 5) {
        return 'lowstock';
    } else {
        return 'instock';
    }
  }

  getProductName(product: Product): string {
    return product.title.en || 'Unknown Product';
  }

  get productName():string{
    return this.product.title.en

  }

  filterGlobal(event: Event, matchMode: string) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.dt.filterGlobal(target.value, matchMode);
    }
  }

  filterColumn(value: any, field: string, mode: string) {
    if (value === null || value === undefined) {
      this.dt.filter(null, field, mode);
    } else {
      this.dt.filter(value, field, mode);
    }
  }
  createProduct(): void {
    this.router.navigate(['/dashboard/add-product']);
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.map(cat => ({
          label: cat.name?.en || 'Unknown',
          value: cat.categoryId
        }));
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load categories'
        });
      }
    });
  }

  loadSubCategories(categoryId?: string) {
    this.categoryService.getSubcategories().subscribe({
      next: (subCategories) => {
        let filteredSubCategories = subCategories;
        if (categoryId) {
          filteredSubCategories = subCategories.filter(subCat => subCat.parentCategoryId === categoryId);
        }
        this.subCategories = filteredSubCategories.map((subCat: any) => ({
          label: subCat.name?.en || 'Unknown',
          value: subCat.subcategoryId
        }));
      },
      error: (error: any) => {
        console.error('Error loading subcategories:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load subcategories'
        });
      }
    });
  }

  onCategoryChange(event: any) {
    this.loadSubCategories(event.value);
    this.filterColumn(event.value, 'categoryId', 'equals');
  }

  onSubCategoryChange(event: any) {
    this.filterColumn(event.value, 'subCategoryId', 'equals');
  }

  filterProducts(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dt.filter(value, 'title.en', 'contains');
  }

  editProduct(productId: string): void {
    this.router.navigate(['/dashboard/products/edit', productId]);
  }

  async updateTrendingScores() {
    try {
      await this.productService.updateAllProductsTrendingScores();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Trending scores updated successfully'
      });
      // Reload the product list to show updated scores
      this.loadDemoData();
    } catch (error) {
      console.error('Error updating trending scores:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update trending scores'
      });
    }
  }

  showVariants(product: any) {
    this.selectedProduct = product;
    this.variantsDialog = true;
  }

  hideVariantsDialog() {
    this.variantsDialog = false;
    this.selectedProduct = null;
  }
}













































































import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProductService } from '../../services/Product/product.service';
import { Product, Variant } from '../../models/products';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    CardModule,
    SkeletonModule,
  ],
  styleUrls: ['./stock-list.component.css'],
})
export class StockListComponent implements OnInit {
  stockRows: any[] = [];
  loading = true;
  filterText = '';
  filterType: 'all' | 'simple' | 'variant' = 'all';

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStockData();
  }

  async loadStockData() {
    this.loading = true;
    this.stockRows = [];
    this.productService
      .getProducts('admin')
      .subscribe(async (products: Product[]) => {
        const rows: any[] = [];
        for (const product of products) {
          if (product.productType === 'variant' && product.id) {
            const variants = await this.productService.getVariantsForProduct(
              product.id
            );
            console.log('Variants for product', product.id, variants);
            for (const variant of variants) {
              rows.push({
                productName: product.title?.en || '',
                variantName: variant.title?.en || '',
                image: variant.mainImage || '',
                quantity: variant.quantity,
                type: 'variant',
                productId: product.id,
                variantId: variant.id,
                attributes: variant.attributes || [],
              });
            }
          } else {
            rows.push({
              productName: product.title?.en || '',
              variantName: '',
              image: product.mainImage || '',
              quantity: product.quantity,
              type: 'simple',
              productId: product.id,
              variantId: null,
              attributes: [],
            });
          }
        }
        this.stockRows = rows;
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  get filteredRows() {
    let rows = this.stockRows;
    if (this.filterType !== 'all') {
      rows = rows.filter((row) => row.type === this.filterType);
    }
    if (this.filterText.trim()) {
      const text = this.filterText.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.productName.toLowerCase().includes(text) ||
          row.variantName.toLowerCase().includes(text)
      );
    }
    return rows;
  }

  editProduct(productId: string) {
    this.router.navigate(['/dashboard/products/edit', productId]);
  }
}

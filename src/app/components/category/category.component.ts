import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category/category.service';
import { Category } from '../../models/category';
import { Subcategory } from '../../models/category';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { Timestamp } from 'firebase/firestore';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    ToolbarModule,
  ],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css'],
  providers: [ConfirmationService, MessageService],
  encapsulation: ViewEncapsulation.None
})
export class CategoryComponent implements OnInit {
  categoryForm: FormGroup;
  subcategoryForm: FormGroup;
  categories: Category[] = [];
  subcategories: Subcategory[] = [];
  displayCategoryDialog: boolean = false;
  displaySubcategoryDialog: boolean = false;
  selectedCategory: Category | null = null;
  selectedSubcategory: Subcategory | null = null;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.categoryForm = this.fb.group({
      name: this.fb.group({
        en: ['', Validators.required],
        ar: ['', Validators.required],
      }),
      slug: ['', Validators.required]
    });

    this.subcategoryForm = this.fb.group({
      name: this.fb.group({
        en: ['', Validators.required],
        ar: ['', Validators.required],
      }),
      parentCategoryId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fetchCategories();
    this.fetchSubcategories();
  }

  fetchCategories() {
    this.categoryService.getCategories().subscribe((data) => {
      this.categories = data;
    });
  }

  fetchSubcategories() {
    this.categoryService.getSubcategories().subscribe((data) => {
      this.subcategories = data;
    });
  }

  openNewCategory() {
    this.categoryForm.reset();
    this.selectedCategory = null;
    this.displayCategoryDialog = true;
  }

  openNewSubcategory() {
    this.subcategoryForm.reset();
    this.selectedSubcategory = null;
    this.displaySubcategoryDialog = true;
  }

  editCategory(category: Category) {
    this.selectedCategory = { ...category };
    this.categoryForm.patchValue({
      name: {
        en: category.name.en,
        ar: category.name.ar,
      },
      slug: category.slug
    });
    this.displayCategoryDialog = true;
  }

  editSubcategory(subcategory: Subcategory) {
    this.selectedSubcategory = { ...subcategory };
    this.subcategoryForm.patchValue({
      name: {
        en: subcategory.name.en,
        ar: subcategory.name.ar,
      },
      parentCategoryId: subcategory.parentCategoryId,
    });
    this.displaySubcategoryDialog = true;
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;
    const formValue = this.categoryForm.value;
    const categoryData: Category = {
      id: this.selectedCategory?.id || '',
      categoryId: this.selectedCategory?.categoryId || '',
      name: formValue.name,
      slug: formValue.slug,
      createdAt: this.selectedCategory?.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (this.selectedCategory) {
      this.categoryService.updateCategory(this.selectedCategory.categoryId, categoryData)
        .then(() => {
          this.messageService.add({
            severity: 'success', summary: 'Success', detail: 'Category Updated'
          });
          this.fetchCategories();
        });
    } else {
      this.categoryService.addCategory(categoryData)
        .then(() => {
          this.messageService.add({
            severity: 'success', summary: 'Success', detail: 'Category Added'
          });
          this.fetchCategories();
        });
    }
    this.displayCategoryDialog = false;
  }

  saveSubcategory() {
    if (this.subcategoryForm.invalid) return;
    const subcategoryData = this.subcategoryForm.value;

    if (this.selectedSubcategory) {
      this.categoryService.updateSubcategory(this.selectedSubcategory.subcategoryId, subcategoryData)
        .then(() => {
          this.messageService.add({
            severity: 'success', summary: 'Success', detail: 'Subcategory Updated'
          });
          this.fetchSubcategories();
        });
    } else {
      this.categoryService.addSubcategory(subcategoryData)
        .then(() => {
          this.messageService.add({
            severity: 'success', summary: 'Success', detail: 'Subcategory Added'
          });
          this.fetchSubcategories();
        });
    }
    this.displaySubcategoryDialog = false;
  }

  deleteCategory(category: Category) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this category?',
      accept: () => {
        this.categoryService.deleteCategory(category.categoryId)
          .then(() => {
            this.messageService.add({
              severity: 'success', summary: 'Success', detail: 'Category Deleted'
            });
            this.fetchCategories();
          });
      },
    });
  }

  deleteSubcategory(subcategory: Subcategory) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this subcategory?',
      accept: () => {
        this.categoryService.deleteSubcategory(subcategory.subcategoryId)
          .then(() => {
            this.messageService.add({
              severity: 'success', summary: 'Success', detail: 'Subcategory Deleted'
            });
            this.fetchSubcategories();
          });
      },
    });
  }

  getCategoryName(id: string): string {
    const cat = this.categories.find(c => c.categoryId === id);
    return cat ? cat.name.en : '';
  }
}



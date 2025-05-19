import { CategoryService } from './../../services/category/category.service';
import { Category, Subcategory } from './../../models/category';
import { BrandService } from './../../services/brand/brand.service';
import { Brand } from './../../models/brands';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormsModule,
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { ProductService } from '../../services/Product/product.service';
import { CommonModule } from '@angular/common';
import { Product, Variant } from '../../models/products';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Editor } from 'primeng/editor';
import { InputNumber } from 'primeng/inputnumber';
import { Fluid } from 'primeng/fluid';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { FieldsetModule } from 'primeng/fieldset';
import { Validators } from '@angular/forms';
import { Toast } from 'primeng/toast';
import { Ripple } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { Select, SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { Auth } from '@angular/fire/auth';

// import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ToastModule,
    ButtonModule,
    CommonModule,
    FloatLabelModule,
    FieldsetModule,
    InputTextModule,
    FormsModule,
    Editor,
    InputNumber,
    Fluid,
    InputTextModule,
    DropdownModule,
    Toast,
    Ripple,
    Breadcrumb,
    RouterModule,
    Select,
    SelectModule,
    MessageModule,
    FormsModule,
  ],
  providers: [MessageService, BrandService, CategoryService],

  templateUrl: './add-product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProductComponent implements OnInit {
  productForm!: FormGroup;
  brands: Brand[] = [];
  catagory: Category[] = [];
  subcategory: Subcategory[] = [];
  isFormInvalid: boolean = true;
  productId: string | null = null;
  isEditMode = false;
  existingVariants: Variant[] = [];

  removeImage(imageUrl: string) {
    const images = this.productForm.get('images')?.value || [];
    const updatedImages = images.filter((url: string) => url !== imageUrl);
    this.productForm.get('images')?.setValue(updatedImages);
    this.cdr.markForCheck();
  }

  removeVariantImage(variantIndex: number, imageUrl: string) {
    const variant = this.variants.at(variantIndex) as FormGroup;
    const images = variant.get('images')?.value || [];
    const updatedImages = images.filter((url: string) => url !== imageUrl);
    variant.get('images')?.setValue(updatedImages);
    this.cdr.markForCheck();
  }

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private messageService: MessageService,
    private brandService: BrandService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth
  ) {
    // this.productForm = this.fb.group(
    //   {
    //     productType: ['simple'],
    //     title: this.fb.group({
    //       en: [''],
    //       ar: [''],
    //     }),
    //     description: this.fb.group({
    //       en: [''],
    //       ar: [''],
    //     }),
    //     price: [1, Validators.required],
    //     discountPrice: [null],
    //     quantity: [1, Validators.required],
    //     sku: [''],
    //     brandId: [''],
    //     categoryId: [''],
    //     subCategoryId: [''],
    //     mainImage: [''],
    //     images: [[]],
    //     tags: [''],
    //     vendorId: [''],
    //     ratingSummary: this.fb.group({
    //       average: [0],
    //       count: [0],
    //     }),
    //     views: [0],
    //     soldCount: [0],
    //     wishlistCount: [0],
    //     trendingScore: [0],
    //     cartAdds: [0],
    //     variants: this.fb.array([]),
    //   },
    //   {
    //     validators: [this.discountPriceValidator, this.variantsValidator()],
    //   }
    // );

    // this.productForm
    //   .get('productType')
    //   ?.valueChanges.subscribe((type: string) => {
    //     const variants = this.variants;
    //     while (variants.length) {
    //       variants.removeAt(0);
    //     }
    //     if (type === 'variant') {
    //       // variants.setValidators([Validators.minLength(1)]);
    //     } else {
    //     }
    //     variants.clearValidators();
    //     variants.updateValueAndValidity();
    //     this.updateFormValidity();
    //     this.cdr.markForCheck();
    //   });

    // this.productForm.valueChanges.subscribe(() => {
    //   this.updateFormValidity();
    // });
  }

  discountPriceValidator: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const productType = control.get('productType')?.value;

    // لو المنتج نوعه variant، ما تطبقش الفاليديتر
    if (productType === 'variant') {
      return null;
    }

    const price = control.get('price')?.value;
    const discountPrice = control.get('discountPrice')?.value;

    if (price != null && discountPrice != null && discountPrice >= price) {
      return { discountInvalid: true };
    }

    return null;
  };

  discountLessThanPriceValidator(
    group: AbstractControl
  ): ValidationErrors | null {
    const price = group.get('price')?.value;
    const discount = group.get('discountPrice')?.value;
    if (discount != null && discount >= price) {
      return { discountTooHigh: true };
    }
    return null;
  }

  variantsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      if (!(formArray instanceof FormArray) || formArray.length === 0) {
        return null;
      }

      const hasValidVariant = formArray.controls.every((variant) => {
        const attributes = variant.get('attributes') as FormArray;
        if (attributes.length === 0) {
          return true;
        }
        return attributes.controls.every((attr) => {
          const key = attr.get('key')?.value?.trim();
          const value = attr.get('value')?.value?.trim();
          return key && value;
        });
      });

      return hasValidVariant ? null : { noValidVariants: true };
    };
  }
  ngOnInit(): void {
    // إنشاء الفورم
    this.productForm = this.fb.group(
      {
        productType: ['simple'],
        title: this.fb.group({
          en: [''],
          ar: [''],
        }),
        description: this.fb.group({
          en: [''],
          ar: [''],
        }),
        price: [1, Validators.required],
        discountPrice: [null],
        quantity: [1, Validators.required],
        sku: [''],
        brandId: [''],
        categoryId: [''],
        subCategoryId: [''],
        mainImage: [''],
        images: [[]],
        tags: [''],
        vendorId: [''],
        ratingSummary: this.fb.group({
          average: [0],
          count: [0],
        }),
        views: [0],
        soldCount: [0],
        wishlistCount: [0],
        trendingScore: [0],
        cartAdds: [0],
        variants: this.fb.array([]),
      },
      {
        validators: [this.discountPriceValidator, this.variantsValidator()],
      }
    );

    // استدعاء اللوجيك اللي بيخفي أو يظهر الفيلدات
    this.toggleMainFieldsByType();

    this.productForm.get('productType')?.valueChanges.subscribe((type: string) => {
      const variants = this.variants;
      while (variants.length) {
        variants.removeAt(0);
      }

      variants.clearValidators();
      variants.updateValueAndValidity();
      this.updateFormValidity();
      this.toggleMainFieldsByType(); // نادينا هنا تاني للتأكد من تفعيل/تعطيل الحقول
      this.cdr.markForCheck();
    });

    this.productForm.valueChanges.subscribe(() => {
      this.updateFormValidity();
    });

    // تحميل بيانات التعديل لو فيه id
    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.productId;

    if (this.isEditMode) {
      this.loadProductForEdit();
    }

    this.getBrands();
    this.getCatagory();
    this.getSubCatagory();
  }

//القديم
  // ngOnInit(): void {
  //   // إنشاء الفورم
  //   this.productForm = this.fb.group(
  //     {
  //       productType: ['simple'],
  //       title: this.fb.group({
  //         en: [''],
  //         ar: [''],
  //       }),
  //       description: this.fb.group({
  //         en: [''],
  //         ar: [''],
  //       }),
  //       price: [1, Validators.required],
  //       discountPrice: [null],
  //       quantity: [1, Validators.required],
  //       sku: [''],
  //       brandId: [''],
  //       categoryId: [''],
  //       subCategoryId: [''],
  //       mainImage: [''],
  //       images: [[]],
  //       tags: [''],
  //       vendorId: [''],
  //       ratingSummary: this.fb.group({
  //         average: [0],
  //         count: [0],
  //       }),
  //       views: [0],
  //       soldCount: [0],
  //       wishlistCount: [0],
  //       trendingScore: [0],
  //       cartAdds: [0],
  //       variants: this.fb.array([]),
  //     },
  //     {
  //       validators: [this.discountPriceValidator, this.variantsValidator()],
  //     }
  //   );

  //   // استدعاء اللوجيك اللي بيخفي أو يظهر الفيلدات
  //   this.toggleMainFieldsByType();

  //   // لو النوع اتغير، نعيد التحقق
  //   this.productForm.get('productType')?.valueChanges.subscribe(() => {
  //     this.toggleMainFieldsByType();
  //   });
  // }
  preventUploadIfVariant(event: Event): void {
    if (this.productForm.get('productType')?.value === 'variant') {
      event.preventDefault();
    }
  }


  toggleMainFieldsByType(): void {
    const productType = this.productForm.get('productType')?.value;

    const titleGroup = this.productForm.get('title') as FormGroup;
    const priceControl = this.productForm.get('price');
    const discountPriceControl = this.productForm.get('discountPrice');
    const quantityControl = this.productForm.get('quantity');
    const mainImageControl = this.productForm.get('mainImage');
    const imagesControl = this.productForm.get('images');

    if (productType === 'variant') {
      // نخليهم غير قابلين للإدخال
      titleGroup.get('en')?.disable();
      titleGroup.get('ar')?.disable();
      priceControl?.disable();
      discountPriceControl?.disable();
      quantityControl?.disable();
      mainImageControl?.disable();
      imagesControl?.disable();
    } else {
      // نخليهم شغالين
      titleGroup.get('en')?.enable();
      titleGroup.get('ar')?.enable();
      priceControl?.enable();
      discountPriceControl?.enable();
      quantityControl?.enable();
      mainImageControl?.enable();
      imagesControl?.enable();
    }
  }

  items: MenuItem[] | undefined;

  home: MenuItem | undefined;

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  addVariant() {
    const newVariant = this.createVariant();
    this.variants.push(newVariant);
    this.updateFormValidity();
    this.cdr.markForCheck();
  }

  removeVariant(index: number) {
    this.variants.removeAt(index);
    this.updateFormValidity();
    this.cdr.markForCheck();
  }

  getAttributes(variantIndex: number): FormArray {
    const variant = this.variants.at(variantIndex) as FormGroup;
    const attributes = variant.get('attributes') as FormArray;
    return attributes;
  }

  createVariant(): FormGroup {
    const variant = this.fb.group(
      {
        title: this.fb.group({
          en: ['', Validators.required],
          ar: ['', Validators.required],
        }),
        attributes: this.fb.array(
          [],
          [Validators.required, Validators.minLength(1)]
        ),
        price: [null, Validators.required],
        discountPrice: [null],
        quantity: [null, Validators.required],
        mainImage: [''],
        images: [[]],
        sku: [''],
      },
      { validators: this.discountLessThanPriceValidator }
    );
    return variant;
  }

  createAttribute(): FormGroup {
    const attribute = this.fb.group({
      key: ['', [Validators.required, Validators.minLength(1)]],
      value: ['', [Validators.required, Validators.minLength(1)]],
    });
    return attribute;
  }

  addAttribute(variantIndex: number) {
    const attributes = this.getAttributes(variantIndex);
    attributes.push(this.createAttribute());

    // ✅ تحديث الحالة والـ validity
    attributes.markAsTouched();
    attributes.updateValueAndValidity();
    this.productForm.updateValueAndValidity();
    // this.updateFormValidity();
    this.variants.updateValueAndValidity();
    // this.productForm.updateValueAndValidity();
    this.updateFormValidity();
    // this.cdr.markForCheck();
    this.cdr.markForCheck();
  }

  // removeAttribute(variantIndex: number, attrIndex: number) {
  //   const attributes = this.getAttributes(variantIndex);
  //   attributes.removeAt(attrIndex);

  //   // ✅ تحديث الحالة والـ validity
  //   attributes.updateValueAndValidity();
  //   this.productForm.updateValueAndValidity();
  //   this.updateFormValidity();
  //   this.cdr.markForCheck();
  // }
  removeAttribute(variantIndex: number, attrIndex: number) {
    const attributes = this.getAttributes(variantIndex);
    attributes.removeAt(attrIndex);

    // ✅ تحديث الحالة والـ validity
    attributes.updateValueAndValidity();
    // this.productForm.updateValueAndValidity();
    this.updateFormValidity();
    this.variants.updateValueAndValidity();
    this.productForm.updateValueAndValidity();
    // this.updateFormValidity();
    // this.cdr.markForCheck();

    this.cdr.markForCheck();
  }

  saveAttribute(variantIndex: number, attrIndex: number) {
    const attributes = this.getAttributes(variantIndex);
    const attribute = attributes.at(attrIndex) as FormGroup;
    const keyControl = attribute.get('key');
    const valueControl = attribute.get('value');

    if (attribute.valid) {
      this.messageService.add({
        severity: 'success',
        summary: 'Successfully',
        detail: 'The attribute was added successfully',
      });
      attributes.markAsPristine();
      this.updateFormValidity();
      this.cdr.markForCheck();
    } else {
      let errorMessage = 'Please enter key and value correctly';
      if (keyControl?.errors) {
        errorMessage =
          'Invalid key: ' +
          (keyControl.errors['required']
            ? 'Key is required'
            : 'Key is too short');
      } else if (valueControl?.errors) {
        errorMessage =
          'Invalid value: ' +
          (valueControl.errors['required']
            ? 'Value is required'
            : 'Value is too short');
      }
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: errorMessage,
      });
      attribute.markAsTouched();
    }
  }

  async uploadImage(event: Event, controlName: string, variantIndex?: number) {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'لم يتم اختيار ملف',
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت',
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'يُسمح فقط بملفات الصور',
        });
        return;
      }

      this.messageService.add({
        severity: 'info',
        summary: 'جاري الرفع',
        detail: 'جاري رفع الصورة...',
      });

      const path = `products/${Date.now()}_${file.name}`;
      const url = await this.productService.uploadImage(file, path);

      if (variantIndex !== undefined) {
        const variant = this.variants.at(variantIndex) as FormGroup;
        variant.get(controlName)?.setValue(url);
      } else {
        this.productForm.get(controlName)?.setValue(url);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'تم الرفع',
        detail: 'تم رفع الصورة بنجاح',
      });

      // Reset the file input
      (event.target as HTMLInputElement).value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'فشل في رفع الصورة. يرجى المحاولة مرة أخرى',
      });
    }
  }

  async uploadImages(event: Event, controlName: string, variantIndex?: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const uploadPromises = files.map((file) => {
        const path = `products/${Date.now()}_${file.name}`;
        return this.productService.uploadImage(file, path);
      });
      const urls = await Promise.all(uploadPromises);
      if (variantIndex !== undefined) {
        const variant = this.variants.at(variantIndex) as FormGroup;
        variant.get(controlName)?.setValue(urls);
      } else {
        this.productForm.get(controlName)?.setValue(urls);
      }
      this.updateFormValidity();
      this.cdr.markForCheck();
    }
  }

  logInput(
    event: Event,
    field: string,
    variantIndex: number,
    attrIndex: number
  ) {
    const input = event.target as HTMLInputElement;
    console.log(
      `Input ${field} for variant ${variantIndex}, attribute ${attrIndex}:`,
      input.value
    );
  }

  //..................update............
  async loadProductForEdit() {
    if (!this.productId) return;

    try {
      // جلب بيانات المنتج
      const product = await this.productService.getProductById(this.productId);
      if (!product) return;

      // جلب الـ Variants
      this.existingVariants = await this.productService.getProductVariants(
        this.productId
      );

      // تعبئة النموذج
      this.productForm.patchValue({
        ...product,
        tags: product.tags?.join(',') || '',
      });

      // تعبئة الـ Variants
      if (product.productType === 'variant' && this.existingVariants.length) {
        this.existingVariants.forEach((variant) => {
          const newVariant = this.createVariant();

          // Patch باقي الحقول العادية
          newVariant.patchValue({
            title: variant.title,
            price: variant.price,
            discountPrice: variant.discountPrice,
            quantity: variant.quantity,
            sku: variant.sku,
            mainImage: variant.mainImage || '',
            images: variant.images || [],
          });



          // التعامل مع attributes كـ FormArray
          const attrs = newVariant.get('attributes') as FormArray;
          if (variant.attributes && Array.isArray(variant.attributes)) {
            variant.attributes.forEach((attr: any) => {
              const attrGroup = this.fb.group({
                key: [attr.key || ''],
                value: [attr.value || '']
              });
              attrs.push(attrGroup);
            });
          }

          this.variants.push(newVariant);
        });

      }

      this.cdr.markForCheck();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load product for editing',
      });
    }
  }

  //....................................................................

  async onSubmit() {
    // Temporarily remove validators for variants to check base form validity
    const variants = this.variants;
    const originalValidators = variants.validator;
    variants.clearValidators();
    variants.updateValueAndValidity();

    if (this.productForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields correctly',
      });
      variants.setValidators(originalValidators);
      variants.updateValueAndValidity();
      return;
    }

    variants.setValidators(originalValidators);
    variants.updateValueAndValidity();

    const productData = { ...this.productForm.value };
    const variantsData: Variant[] = Array.isArray(productData.variants)
      ? productData.variants
      : [];

    const variantsToSave = variantsData
      .map((variant: Variant) => {
        const attributes = Array.isArray(variant.attributes)
          ? variant.attributes.filter((attr) => {
              const key = attr.key ? attr.key.trim() : null;
              const value = attr.value ? attr.value.trim() : null;
              return key && value && key !== '' && value !== '';
            })
          : [];
        return { ...variant, attributes };
      })
      .filter((variant: Variant) => {
        return (
          variant.title.en &&
          variant.title.ar &&
          variant.price != null &&
          variant.quantity != null
        );
      });

    if (productData.productType === 'variant' && variantsToSave.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Enter at least one valid variant',
      });
      return;
    }

    delete productData.variants;

    if (typeof productData.tags === 'string' && productData.tags.trim()) {
      productData.tags = productData.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: any) => tag);
    } else {
      productData.tags = [];
    }

    // Set vendorId from current user
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not authenticated',
      });
      return;
    }
    productData.vendorId = currentUser.uid;

    try {
      if (this.isEditMode && this.productId) {
        await this.productService.updateProductWithVariants(
          this.productId,
          productData as Product,
          variantsToSave as Variant[]
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Product updated successfully',
        });
        setTimeout(() => {
          this.router.navigate(['/dashboard/products']);
        }, 1200);
      } else {
        await this.productService.addProduct(
          productData as Product,
          variantsToSave as Variant[]
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Product added successfully',
        });
        this.productForm.reset();
        this.variants.clear();
        setTimeout(() => {
          this.router.navigate(['/dashboard/products']);
        }, 1200);
      }
      this.updateFormValidity();
      this.cdr.markForCheck();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.isEditMode
          ? 'Failed to update product'
          : 'Failed to add product',
      });
    }
  }

  updateFormValidity() {
    const productType = this.productForm.get('productType')?.value;
    if (productType === 'variant') {
      const hasValidVariants = this.variants.controls.every((variant) => {
        const title = variant.get('title') as FormGroup;
        const price = variant.get('price')?.value;
        const quantity = variant.get('quantity')?.value;
        const attributes = variant.get('attributes') as FormArray;

        // Check if variant has at least one valid attribute
        const hasValidAttributes =
          attributes.length > 0 &&
          attributes.controls.every((attr) => {
            const key = attr.get('key')?.value?.trim();
            const value = attr.get('value')?.value?.trim();
            return key && value;
          });

        return (
          title.valid && price != null && quantity != null && hasValidAttributes
        );
      });
      this.isFormInvalid = !hasValidVariants;
    } else {
      // For simple products, check basic required fields
      const title = this.productForm.get('title') as FormGroup;
      const price = this.productForm.get('price')?.value;
      const quantity = this.productForm.get('quantity')?.value;
      const mainImage = this.productForm.get('mainImage')?.value;

      this.isFormInvalid = !title.valid || !price || !quantity || !mainImage;
    }
    const invalidControls: string[] = [];

    const recursiveCheck = (
      formGroup: FormGroup | FormArray,
      path: string = ''
    ) => {
      Object.keys(formGroup.controls).forEach((key) => {
        const control = formGroup.get(key);
        const currentPath = path ? `${path} -> ${key}` : key;

        if (control instanceof FormGroup || control instanceof FormArray) {
          recursiveCheck(control, currentPath);
        } else if (control && control.invalid) {
          invalidControls.push(currentPath);
        }
      });
    };

    recursiveCheck(this.productForm);

    console.log('❌ Invalid controls:', invalidControls);
    console.log('isFormInvalid:', this.isFormInvalid);
    console.log('productForm.valid:', this.productForm.valid);
    console.log('Form Group Errors:', this.productForm.errors);

    this.cdr.markForCheck();
  }

  trackByFn(index: number, item: any): number {
    return index;
  }

  showSuccess() {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product add succesfuly',
    });
  }

  getBrands(): void {
    this.brandService.getBrands().subscribe((brands) => {
      this.brands = brands;
      console.log(this.brands);
    });
  }

  onBrandChange(event: any) {
    this.productForm.patchValue({ brandId: event.value });
    this.productForm.get('brandId')?.setValue(event.value);

    console.log('Selected brand:', event.value);
  }

  getCatagory(): void {
    // this.categoryService.getCategories().subscribe((catagory) => {
    //   this.catagory = catagory;
    // });
    this.categoryService.getCategories().subscribe((data: Category[]) => {
      this.catagory = data;
      // this.cdr.markForCheck();
    });
  }

  getSubCatagory(): void {
    // this.categoryService.getSubcategories().subscribe((subcategory)=>{
    //   this.subcategory = subcategory;
    // })
    this.categoryService.getSubcategories().subscribe((data: Subcategory[]) => {
      this.subcategory = data;
      // this.cdr.markForCheck();
    });
  }
}

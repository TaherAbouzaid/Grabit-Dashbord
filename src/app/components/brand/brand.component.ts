import { Component, OnInit, ViewChild, ChangeDetectorRef, input, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Brand } from '../../models/brands';
import { BrandService } from '../../services/brand/brand.service';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { Table } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DropdownModule } from 'primeng/dropdown';
import { Breadcrumb } from 'primeng/breadcrumb';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-brand',
  templateUrl: './brand.component.html',
  styleUrls: ['./brand.component.css'],
  imports: [TableModule,
    Dialog,
    ButtonModule,
    SelectModule,
    ToastModule,
    ToolbarModule,
    ConfirmDialog,
    InputTextModule,
    TextareaModule,
    CommonModule,
    DropdownModule,
    InputTextModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    TextareaModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    Breadcrumb,
    RouterModule,
    InputIconModule,
    IconFieldModule

  ],

  providers: [MessageService, ConfirmationService, BrandService]
})
export class BrandComponent implements OnInit {
  brandForm: FormGroup;
  brands: Brand[] = [];
  selectedBrands: Brand[] = [];
  brandDialog: boolean = false;
  submitted: boolean = false;
  editMode = false;
  currentBrandId: string | null = null;

  @ViewChild('dt') dt!: Table;

  constructor(
    private fb: FormBuilder,
    private brandService: BrandService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef,

  ) {
    this.brandForm = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.getBrands();

    this.items = [
      { icon: 'pi pi-home', route: '/' },
      { label: 'Brand', route: '/brand' }
    ];
  }

  items: MenuItem[] | undefined;

  home: MenuItem | undefined;


  getBrands(): void {
    this.brandService.getBrands().subscribe((brands) => {
      this.brands = brands;
      this.cd.markForCheck();
    });
  }

  openNew(): void {
    this.brandForm.reset();
    this.submitted = false;
    this.brandDialog = true;
    this.editMode = false;
    this.currentBrandId = null;
  }

  editBrand(brand: Brand): void {
    this.brandForm.setValue({
      nameEn: brand.name.en,
      nameAr: brand.name.ar
    });
    this.currentBrandId = brand.brandId;
    this.brandDialog = true;
    this.editMode = true;
  }

  deleteBrand(brandId: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this brand?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.brandService.deleteBrand(brandId).then(() => {
          this.brands = this.brands.filter((b) => b.brandId !== brandId);
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Brand Deleted', life: 3000 });
        });
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.brandForm.invalid) return;

    const brandData = {
      name: {
        en: this.brandForm.value.nameEn,
        ar: this.brandForm.value.nameAr
      }
    };

    if (this.editMode && this.currentBrandId) {
      this.brandService.updateBrand(this.currentBrandId, brandData).then(() => {
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Brand Updated', life: 3000 });
        this.getBrands();
      });
    } else {
      this.brandService.addBrand(brandData).then(() => {
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Brand Created', life: 3000 });
        this.getBrands();
      });
    }

    this.brandDialog = false;
    this.brandForm.reset();
  }

  hideDialog(): void {
    this.brandDialog = false;
    this.brandForm.reset();
    this.submitted = false;
  }


}






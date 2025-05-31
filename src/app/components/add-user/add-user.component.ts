import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UserService } from '../../services/user/user.service';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Storage } from '@angular/fire/storage';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-add-user',
  standalone: true,
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css'],
  providers: [MessageService],
  imports: [
    ReactiveFormsModule,
    DropdownModule,
    FileUploadModule,
    InputTextModule,
    ButtonModule,
    CommonModule,
    HttpClientModule,
    PasswordModule,
    ToastModule,
  ],
})
export class AddUserComponent {
  userForm: FormGroup;
  selectedFile: File | null = null;

  roles = [
    { label: 'Admin', value: 'admin' },
    { label: 'Shop Manager', value: 'shop manager' },
    { label: 'Vendor', value: 'vendor' },
    { label: 'Author', value: 'Author' },
    { label: 'Customer', value: 'customer' },
  ];

  defaultprofileImage =
    'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private storage: Storage,
    private messageService: MessageService
  ) {
    this.userForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      phone: [''],
      role: ['', Validators.required],
      city: [''],
      country: [''],
      street: [''],
      postalCode: [''],
    });
  }

  // onFileSelected(event: any) {
  //   const file = event?.files?.[0] || event?.target?.files?.[0];
  //   if (file) {
  //     this.selectedFile = file;
  //   }
  // }

  async onSubmit() {
    if (this.userForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Form Error',
        detail: 'Please fill all required fields.',
      });
      return;
    }

    const formData = this.userForm.value;
    // const userId = Date.now().toString();
    let profileImage = this.defaultprofileImage;

    try {
      // if (this.selectedFile) {
      //   const filePath = `users/${userId}_${this.selectedFile.name}`;
      //   const storageRef = ref(this.storage, filePath);
      //   await uploadBytes(storageRef, this.selectedFile);
      //   profileImage = await getDownloadURL(storageRef);
      // }

      const uid = await this.userService.createUserByAdmin(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
        profileImage
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'User added successfully!',
      });

      this.userForm.reset();
      this.selectedFile = null;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error saving user: ' + (error as any).message,
      });
    }
  }
}

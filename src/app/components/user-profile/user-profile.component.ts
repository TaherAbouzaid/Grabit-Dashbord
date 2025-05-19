import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, setDoc } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextarea } from 'primeng/inputtextarea';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';
import { User } from '../../models/user.model';
import { Timestamp } from 'firebase/firestore';
import { HttpClientModule } from '@angular/common/http';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth, updateProfile } from '@angular/fire/auth';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

interface VendorInfo {
  vendorId: string;
  storeName: {
    en: string;
    ar: string;
  };
  ownerName: string;
  phone: string;
  email: string;
  productIds: string[];
  salesProducts: string[];
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  logo: string;
  aboutUs: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    InputTextarea,
    FileUploadModule,
    HttpClientModule
  ],
  providers: [MessageService],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  userForm: FormGroup;
  vendorForm: FormGroup;
  passwordForm: FormGroup;
  user: User | null = null;
  vendorInfo: VendorInfo | null = null;
  isVendor: boolean = false;
  isLoading: boolean = true;
  profileImageUrl: string = '';
  vendorLogoUrl: string = '';
  isUploading: boolean = false;
  selectedProfileFile: File | null = null;
  tempProfileImageUrl: string = '';
  selectedLogoFile: File | null = null;
  tempLogoUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private storage: Storage,
    private messageService: MessageService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      fullName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      phone: ['', Validators.required],
      profileImage: [''],
      address: this.fb.group({
        street: [''],
        city: [''],
        country: [''],
        postalCode: ['']
      })
    });

    this.vendorForm = this.fb.group({
      storeName: this.fb.group({
        en: ['', Validators.required],
        ar: ['', Validators.required]
      }),
      ownerName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        country: ['', Validators.required],
        postalCode: ['', Validators.required]
      }),
      logo: [''],
      aboutUs: ['', Validators.required]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user) {
      try {
        const userRef = doc(this.firestore, `users/${user.uid}`);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          this.user = userData;
          this.isVendor = userData.role === 'vendor';
          this.profileImageUrl = userData.imageUrl || '';
          
          // Fill user form
          this.userForm.patchValue({
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            profileImage: userData.imageUrl,
            address: userData.address?.[0] || {}
          });

          // If vendor, get and fill vendor info
          if (this.isVendor) {
            const vendorRef = doc(this.firestore, `vendors/${user.uid}`);
            const vendorSnap = await getDoc(vendorRef);
            
            if (vendorSnap.exists()) {
              this.vendorInfo = vendorSnap.data() as VendorInfo;
              this.vendorLogoUrl = this.vendorInfo.logo || '';
              this.vendorForm.patchValue({
                storeName: this.vendorInfo.storeName,
                ownerName: this.vendorInfo.ownerName,
                phone: this.vendorInfo.phone,
                email: this.vendorInfo.email,
                address: this.vendorInfo.address,
                logo: this.vendorInfo.logo,
                aboutUs: this.vendorInfo.aboutUs
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load user data'
        });
      }
    }
    this.isLoading = false;
  }

  onImageSelected(event: Event, type: 'user' | 'vendor') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (type === 'user') {
      this.selectedProfileFile = file;
      // Create a temporary URL for preview
      this.tempProfileImageUrl = URL.createObjectURL(file);
    } else {
      this.selectedLogoFile = file;
      // Create a temporary URL for preview
      this.tempLogoUrl = URL.createObjectURL(file);
    }
  }

  async onUserSubmit() {
    if (this.userForm.valid) {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User not authenticated'
        });
        return;
      }

      try {
        let imageUrl = this.profileImageUrl;

        // Upload new image if selected
        if (this.selectedProfileFile) {
          // Delete old image if exists
          if (this.profileImageUrl) {
            try {
              const oldImageRef = ref(this.storage, this.profileImageUrl);
              await deleteObject(oldImageRef);
              console.log('Old profile image deleted successfully');
            } catch (error) {
              console.warn('Error deleting old profile image:', error);
            }
          }

          // Upload new image
          const timestamp = new Date().getTime();
          const path = `profile-images/${currentUser.uid}_${timestamp}_${this.selectedProfileFile.name}`;
          const storageRef = ref(this.storage, path);
          const snapshot = await uploadBytes(storageRef, this.selectedProfileFile);
          imageUrl = await getDownloadURL(snapshot.ref);

          // Update Firebase Auth profile
          await updateProfile(currentUser, {
            photoURL: imageUrl,
            displayName: this.userForm.get('fullName')?.value
          });

          // Force refresh the auth token
          await currentUser.getIdToken(true);
        }

        const userRef = doc(this.firestore, `users/${currentUser.uid}`);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'User document not found'
          });
          return;
        }

        const updateData: any = {
          updatedAt: Timestamp.now()
        };

        if (this.userForm.get('fullName')?.value) {
          updateData.fullName = this.userForm.get('fullName')?.value;
        }
        if (this.userForm.get('phone')?.value) {
          updateData.phone = this.userForm.get('phone')?.value;
        }
        if (imageUrl) {
          updateData.imageUrl = imageUrl;
        }

        const addressGroup = this.userForm.get('address');
        if (addressGroup?.valid) {
          const addressData = addressGroup.value;
          if (Object.values(addressData).some(value => value)) {
            updateData.address = [addressData];
          }
        }

        await updateDoc(userRef, updateData);
        
        // Refresh user data
        const updatedUserSnap = await getDoc(userRef);
        if (updatedUserSnap.exists()) {
          this.user = updatedUserSnap.data() as User;
          this.profileImageUrl = this.user.imageUrl || '';
          
          // Update form with new values
          this.userForm.patchValue({
            fullName: this.user.fullName,
            email: this.user.email,
            phone: this.user.phone,
            profileImage: this.user.imageUrl,
            address: this.user.address?.[0] || {}
          });

          // Force change detection
          this.changeDetectorRef.detectChanges();
        }

        // Clear temporary data
        this.selectedProfileFile = null;
        this.tempProfileImageUrl = '';

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profile updated successfully'
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update profile. Please try again.'
        });
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields'
      });
    }
  }

  async onVendorSubmit() {
    if (this.vendorForm.valid) {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User not authenticated'
        });
        return;
      }

      try {
        let logoUrl = this.vendorLogoUrl;

        // Upload new logo if selected
        if (this.selectedLogoFile) {
          // Delete old logo if exists
          if (this.vendorLogoUrl) {
            try {
              const oldLogoRef = ref(this.storage, this.vendorLogoUrl);
              await deleteObject(oldLogoRef);
              console.log('Old vendor logo deleted successfully');
            } catch (error) {
              console.warn('Error deleting old vendor logo:', error);
            }
          }

          // Upload new logo
          const timestamp = new Date().getTime();
          const path = `store-logos/${currentUser.uid}_${timestamp}_${this.selectedLogoFile.name}`;
          const storageRef = ref(this.storage, path);
          const snapshot = await uploadBytes(storageRef, this.selectedLogoFile);
          logoUrl = await getDownloadURL(snapshot.ref);
        }

        const vendorRef = doc(this.firestore, `vendors/${currentUser.uid}`);
        const vendorSnap = await getDoc(vendorRef);
        
        const vendorData = {
          ...this.vendorForm.value,
          vendorId: currentUser.uid,
          logo: logoUrl,
          updatedAt: Timestamp.now()
        };

        if (vendorSnap.exists()) {
          await updateDoc(vendorRef, vendorData);
        } else {
          vendorData.createdAt = Timestamp.now();
          vendorData.salesProducts = [];
          vendorData.productIds = [];
          await setDoc(vendorRef, vendorData);
        }

        // Refresh vendor data
        const updatedVendorSnap = await getDoc(vendorRef);
        if (updatedVendorSnap.exists()) {
          this.vendorInfo = updatedVendorSnap.data() as VendorInfo;
          this.vendorLogoUrl = this.vendorInfo.logo || '';
          
          // Update form with new values
          this.vendorForm.patchValue({
            storeName: this.vendorInfo.storeName,
            ownerName: this.vendorInfo.ownerName,
            phone: this.vendorInfo.phone,
            email: this.vendorInfo.email,
            address: this.vendorInfo.address,
            logo: this.vendorInfo.logo,
            aboutUs: this.vendorInfo.aboutUs
          });

          // Force change detection
          this.changeDetectorRef.detectChanges();
        }

        // Clear temporary data
        this.selectedLogoFile = null;
        this.tempLogoUrl = '';
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Vendor profile updated successfully'
        });
      } catch (error) {
        console.error('Error updating vendor profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update vendor profile. Please try again.'
        });
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields'
      });
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  async onChangePassword() {
    if (this.passwordForm.valid) {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User not authenticated'
        });
        return;
      }

      try {
        const { currentPassword, newPassword } = this.passwordForm.value;
        
        // Reauthenticate user before changing password
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          currentPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password updated successfully'
        });
        
        // Reset password form
        this.passwordForm.reset();
      } catch (error: any) {
        console.error('Error changing password:', error);
        let errorMessage = 'Failed to change password. ';
        
        if (error.code === 'auth/wrong-password') {
          errorMessage += 'Current password is incorrect.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage += 'New password is too weak.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all password fields correctly'
      });
    }
  }
}

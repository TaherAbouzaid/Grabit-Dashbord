import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user/user.service';
import { User } from '../../models/user.model';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    AvatarModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  providers: [MessageService, ConfirmationService],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  originalUsers: User[] = [];
  roles: string[] = ['admin', 'customer', 'vendor', 'Author', 'shop manager'];

  constructor(
    private userService: UserService,
    private firestore: Firestore,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe((data) => {
      this.users = data;
      this.originalUsers = JSON.parse(JSON.stringify(data));

      this.users.forEach((user) => {
        if (!user.fullName) {
          console.warn(`User with ID: ${user.userId} is missing fullName`);
        }
      });

      console.log('Loaded Users:', this.users);
    });
  }

  saveChanges() {
    const promises = [];

    for (let i = 0; i < this.users.length; i++) {
      const current = this.users[i];
      const original = this.originalUsers[i];

      if (!current.userId) continue;

      const updatedFields: Partial<User> = {};

      if (current.fullName !== original.fullName)
        updatedFields.fullName = current.fullName;
      if (current.email !== original.email) updatedFields.email = current.email;
      if (current.phone !== original.phone) updatedFields.phone = current.phone;
      if (current.role !== original.role) updatedFields.role = current.role;

      if (Object.keys(updatedFields).length > 0) {
        const userRef = doc(this.firestore, `users/${current.userId}`);
        const updatePromise = updateDoc(userRef, updatedFields)
          .then(() => {
            console.log(
              `Updated user ${current.fullName || 'Unknown'}:`,
              updatedFields
            );
            this.originalUsers[i] = { ...current };
          })
          .catch((error) => {
            console.error(`Error updating user ${current.fullName}:`, error);
          });

        promises.push(updatePromise);
      }
    }

    Promise.all(promises)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Changes saved successfully',
        });
      })
      .catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save some changes',
        });
      });
  }

  deleteSelectedUsers() {
    const selectedUsers = this.users.filter((user) => user.selected);
    const promises = selectedUsers.map((user) => {
      const userRef = doc(this.firestore, `users/${user.userId}`);
      return deleteDoc(userRef)
        .then(() => {
          console.log(
            `User ${user.fullName || 'Unknown User'} deleted successfully`
          );
        })
        .catch((error) => {
          console.error(
            `Error deleting user ${user.fullName || 'Unknown User'}:`,
            error
          );
        });
    });

    Promise.all(promises)
      .then(() => {
        this.users = this.users.filter((user) => !user.selected);
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: `${selectedUsers.length} user(s) deleted successfully`,
        });
      })
      .catch((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete some users',
        });
      });
  }

  confirmDeleteSelected() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected users?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      accept: () => {
        this.deleteSelectedUsers();
      },
    });
  }

  // editUser(user: User) {
  //   const updatedField = prompt('Enter the field to edit (name, email, phone, role):');

  //   if (
  //     updatedField &&
  //     (['name', 'email', 'phone', 'role'] as Array<keyof User>).includes(updatedField as keyof User)
  //   ) {
  //     const key = updatedField as keyof User;
  //     const newValue = prompt(`Enter new value for ${updatedField}:`, user[key] as string);

  //     if (newValue !== null) {
  //       const key = updatedField as keyof User;
  //       user[key] = newValue as any;

  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: `${updatedField} updated successfully!`,
  //       });

  //       this.saveChanges();
  //     }

  //   } else {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Invalid Field',
  //       detail: 'Please enter a valid field to edit.',
  //     });
  //   }
  // }
}

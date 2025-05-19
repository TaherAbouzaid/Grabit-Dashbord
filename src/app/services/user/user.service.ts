import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  setDoc,
  getDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { deleteApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  firestore = inject(Firestore);

  constructor(private storage: Storage, private auth: Auth) {}

  getUsers(): Observable<User[]> {
    const usersRef = collection(this.firestore, 'users');
    return collectionData(usersRef, { idField: 'userId' }) as Observable<
      User[]
    >;
  }
  getUserById(uid: string): Observable<User | undefined> {
    const userRef = doc(this.firestore, 'users', uid);
    const userDoc = getDoc(userRef);

    return new Observable((observer) => {
      userDoc
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            observer.next(docSnapshot.data() as User);
          } else {
            observer.next(undefined);
          }
        })
        .catch((error: any) => {
          console.error('Error getting document:', error);
          observer.error(error);
        });
    });
  }

  async uploadImage(file: File, userId: string): Promise<string> {
    const filePath = `users/${userId}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async createUserByAdmin(
    email: string,
    password: string,
    fullName: string,
    role: string,
    imageUrl: string
  ) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');
      // ✅ 1. إنشاء نسخة تانية من Firebase app
      const secondaryApp = initializeApp(environment.firebase, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);

      // ✅ 2. إنشاء المستخدم الجديد
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      // ✅ 3. تسجيل الخروج من النسخة التانية
      await secondaryAuth.signOut();

      // ✅ 4. حذف النسخة التانية
      await deleteApp(secondaryApp);

      // ✅ 5. إضافة بيانات المستخدم الجديد إلى Firestore
      await setDoc(doc(this.firestore, 'users', uid), {
        fullName,
        email,
        role,
        imageUrl,
        address: '',
        phone: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        wishlist: [],
        selected: false,
      });

      return uid;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(uid: string, userData: Partial<User>) {
    const userRef = doc(this.firestore, 'users', uid);
    await updateDoc(userRef, userData);
  }
}

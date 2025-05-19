import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Category, Subcategory } from '../../models/category';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoryRef;
  private subcategoryRef;

  constructor(private firestore: Firestore) {
    this.categoryRef = collection(this.firestore, 'categories');
    this.subcategoryRef = collection(this.firestore, 'subcategories');
  }

  getCategories(): Observable<Category[]> {
    return collectionData(this.categoryRef, { idField: 'categoryId' }) as Observable<Category[]>;
  }

  getSubcategories(): Observable<Subcategory[]> {
    return collectionData(this.subcategoryRef, { idField: 'subcategoryId' }) as Observable<Subcategory[]>;
  }

  async addCategory(category: Category): Promise<string> {
  const docRef = await addDoc(this.categoryRef, {
    ...category,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

  async addSubcategory(subcategory: Subcategory): Promise<string> {
  const docRef = await addDoc(this.subcategoryRef, {
    ...subcategory,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}


 updateCategory(id: string, data: Category) {
  const docRef = doc(this.firestore, `categories/${id}`);
  return updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

  updateSubcategory(id: string, data: Subcategory) {
  const docRef = doc(this.firestore, `subcategories/${id}`);
  return updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

  deleteCategory(id: string) {
    const docRef = doc(this.firestore, `categories/${id}`);
    return deleteDoc(docRef);
  }


  deleteSubcategory(id: string) {
    const docRef = doc(this.firestore, `subcategories/${id}`);
    return deleteDoc(docRef);
  }
}

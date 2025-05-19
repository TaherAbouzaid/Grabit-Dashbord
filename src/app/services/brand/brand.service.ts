import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Brand } from '../../models/brands';
import { serverTimestamp } from 'firebase/firestore';



@Injectable({
  providedIn: 'root'
})
export class BrandService {

  private brandsCollection;

  constructor(private firestore: Firestore) {

    this.brandsCollection = collection(this.firestore, 'brands');
  }




  //add brand

  async addBrand(brand: Omit<Brand, 'brandId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(this.brandsCollection, {
      ...brand,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }


   //  Get all brands
   getBrands(): Observable<Brand[]> {
    return collectionData(this.brandsCollection, { idField: 'brandId' }) as Observable<Brand[]>;
  }


  //  Get single brand by ID
  async getBrandById(brandId: string): Promise<Brand | undefined> {
    const brandDoc = doc(this.firestore, `brands/${brandId}`);
    const snapshot = await getDoc(brandDoc);
    if (snapshot.exists()) {
      return { brandId: snapshot.id, ...snapshot.data() } as Brand;
    }
    return undefined;
  }


   //  Update brand
   updateBrand(brandId: string, updatedData: Partial<Brand>): Promise<void> {
    const brandDoc = doc(this.firestore, `brands/${brandId}`);
    return updateDoc(brandDoc, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
  }



   //  Delete brand
   deleteBrand(brandId: string): Promise<void> {
    const brandDoc = doc(this.firestore, `brands/${brandId}`);
    return deleteDoc(brandDoc);
  }















}

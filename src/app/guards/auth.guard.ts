import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // انتظر حتى يتم تحميل حالة المستخدم من Firebase
    const user = await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (firebaseUser) => {
        unsubscribe();
        resolve(firebaseUser);
      });
    });

    if (!user) {
      console.log('No user found, redirecting to login');
      this.router.navigate(['/']);
      return false;
    }

    try {
      const userRef = doc(this.firestore, `users/${user.uid}`);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('User document does not exist in Firestore');
        this.router.navigate(['/unauthorized']);
        return false;
      }

      const userData: any = userSnap.data();
      const userRole = userData.role;
      console.log('Current user role:', userRole);

      // التحقق من الصلاحيات المطلوبة للصفحة
      const requiredRoles = route.data['roles'] as Array<string>;
      console.log('Required roles for this route:', requiredRoles);

      // إذا لم يتم تحديد أدوار مطلوبة، رفض الوصول
      if (!requiredRoles || requiredRoles.length === 0) {
        console.log('No roles specified for this route, denying access');
        this.router.navigate(['/unauthorized']);
        return false;
      }

      // التحقق من وجود دور المستخدم في الأدوار المطلوبة
      const hasAccess = requiredRoles.includes(userRole);
      console.log('User role matches required roles:', hasAccess);

      if (!hasAccess) {
        console.log('Access denied: User role does not match required roles');
        this.router.navigate(['/unauthorized']);
        return false;
      }

      console.log('Access granted for role:', userRole);
      return true;
    } catch (error) {
      console.error('Error in AuthGuard:', error);
      this.router.navigate(['/unauthorized']);
      return false;
    }
  }
} 
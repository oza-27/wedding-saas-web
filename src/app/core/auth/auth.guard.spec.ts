import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard, guestGuard, tenantContextGuard } from './auth.guard';
import { AuthService, TokenStorageService } from './auth.service';
import { TenantMembership } from './auth.models';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

const base=`${environment.apiBaseUrl}/auth`;
const tenant:TenantMembership={tenantId:'valid',tenantName:'Fixture',tenantSlug:'fixture',tenantType:2,membershipRole:'Owner',membershipStatus:'Active'};
describe('authentication route guards',()=>{
 let router:Router;let storage:TokenStorageService;let auth:AuthService;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});router=TestBed.inject(Router);storage=TestBed.inject(TokenStorageService);auth=TestBed.inject(AuthService);http=TestBed.inject(HttpTestingController);auth.reset();});
 afterEach(()=>{http.verify();auth.reset();});
 it('redirects unauthenticated users to login and preserves the destination',()=>{const result=TestBed.runInInjectionContext(()=>authGuard({} as never,{url:'/home?x=1'} as never));expect(router.serializeUrl(result as any)).toContain('returnUrl=%2Fhome%3Fx%3D1');});
 it('allows authenticated users into protected routes',()=>{storage.pair={accessToken:'a',refreshToken:'r',accessTokenExpiresAtUtc:''};expect(TestBed.runInInjectionContext(()=>authGuard({} as never,{url:'/home'} as never))).toBe(true);});
 it('refreshes a stored session but does not trust an invalid stored tenant id',()=>{storage.pair={accessToken:'',refreshToken:'r',accessTokenExpiresAtUtc:''};sessionStorage.setItem('wsa.tenant','stale-tenant');let result:any;const guard=TestBed.runInInjectionContext(()=>authGuard({} as never,{url:'/home'} as never));(guard as Observable<boolean>).subscribe(value=>result=value);http.expectOne(`${base}/refresh`).flush({accessToken:'a',refreshToken:'r2',accessTokenExpiresAtUtc:''});http.expectOne(`${base}/me`).flush({userId:'u',firstName:'A',lastName:'B',email:'a@example.test',isEmailVerified:true,phoneNumber:null,isActive:true});http.expectOne(`${base}/tenants`).flush([tenant]);expect(result).toBe(true);expect(auth.currentTenant()).toBeNull();const tenantRoute=TestBed.runInInjectionContext(()=>tenantContextGuard({} as never,{url:'/home'} as never));expect(router.serializeUrl(tenantRoute as any)).toBe('/select-tenant');});
 it('restores only a tenant id present in current API memberships',()=>{auth.tenants.set([tenant]);sessionStorage.setItem('wsa.tenant','valid');auth.restoreTenant();expect(auth.currentTenant()).toEqual(tenant);sessionStorage.setItem('wsa.tenant','unknown');auth.restoreTenant();expect(auth.currentTenant()).toBeNull();});
 it('redirects authenticated users away from guest pages',()=>{storage.pair={accessToken:'a',refreshToken:'r',accessTokenExpiresAtUtc:''};const result=TestBed.runInInjectionContext(()=>guestGuard({} as never,{url:'/login'} as never));expect(router.serializeUrl(result as any)).toBe('/home');});
 it('allows guests to access login',()=>{expect(TestBed.runInInjectionContext(()=>guestGuard({} as never,{url:'/login'} as never))).toBe(true);});
});

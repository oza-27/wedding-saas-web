import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage, EmailRequest, LoginRequest, RegisterRequest, RegisterResponse, ResetPasswordRequest, TenantMembership, TokenPair, UserProfile, VerifyEmailRequest } from './auth.models';

@Injectable({providedIn:'root'})
export class TokenStorageService {
  private access:string|null=null;
  get accessToken(){return this.access;}
  get refreshToken(){return sessionStorage.getItem('wsa.refresh');}
  set pair(value:TokenPair|null){this.access=value?.accessToken??null; if(value) sessionStorage.setItem('wsa.refresh',value.refreshToken); else sessionStorage.removeItem('wsa.refresh');}
 clearTenant(){sessionStorage.removeItem('wsa.tenant');}
  clear(){this.access=null;sessionStorage.removeItem('wsa.refresh');sessionStorage.removeItem('wsa.tenant');}
}
@Injectable({providedIn:'root'})
export class AuthService {
 private http=inject(HttpClient); private storage=inject(TokenStorageService); private base=`${environment.apiBaseUrl}/auth`;
 readonly currentUser=signal<UserProfile|null>(null); readonly tenants=signal<TenantMembership[]>([]); readonly currentTenant=signal<TenantMembership|null>(null); readonly isLoading=signal(false); readonly isAuthenticated=computed(()=>!!this.storage.accessToken);
 private request<T>(source:Observable<T>){this.isLoading.set(true); return source.pipe(finalize(()=>this.isLoading.set(false)));}
 register(body:RegisterRequest){return this.request(this.http.post<RegisterResponse>(`${this.base}/register`,body));}
 verifyEmail(body:VerifyEmailRequest){return this.request(this.http.post<ApiMessage>(`${this.base}/verify-email`,body));}
 resendVerification(body:EmailRequest){return this.request(this.http.post<ApiMessage>(`${this.base}/resend-verification`,body));}
 login(body:LoginRequest){return this.request(this.http.post<TokenPair>(`${this.base}/login`,body).pipe(tap(p=>{this.storage.clearTenant();this.currentTenant.set(null);this.storage.pair=p;})));}
 refresh(){const token=this.storage.refreshToken; if(!token) throw new Error('No refresh token'); return this.http.post<TokenPair>(`${this.base}/refresh`,{refreshToken:token}).pipe(tap(p=>this.storage.pair=p));}
 logout(){const token=this.storage.refreshToken; return this.request((token?this.http.post<ApiMessage>(`${this.base}/logout`,{refreshToken:token}):new Observable<ApiMessage>(s=>{s.next({message:''});s.complete()})).pipe(finalize(()=>this.reset())));}
 logoutAll(){return this.request(this.http.post<ApiMessage>(`${this.base}/logout-all`,{}).pipe(finalize(()=>this.reset())));}
 forgotPassword(body:EmailRequest){return this.request(this.http.post<ApiMessage>(`${this.base}/forgot-password`,body));}
 resetPassword(body:ResetPasswordRequest){return this.request(this.http.post<ApiMessage>(`${this.base}/reset-password`,body));}
 getCurrentUser(){return this.request(this.http.get<UserProfile>(`${this.base}/me`).pipe(tap(u=>this.currentUser.set(u))));}
 getTenants(){return this.request(this.http.get<TenantMembership[]>(`${this.base}/tenants`).pipe(tap(t=>this.tenants.set(t))));}
 switchTenant(tenantId:string){this.storage.clearTenant();this.currentTenant.set(null);return this.request(this.http.post<TokenPair>(`${this.base}/switch-tenant`,{tenantId}).pipe(tap(p=>{this.storage.pair=p;this.currentTenant.set(this.tenants().find(t=>t.tenantId===tenantId)??null);sessionStorage.setItem('wsa.tenant',tenantId);})));}
 restoreTenant(){const id=sessionStorage.getItem('wsa.tenant');this.currentTenant.set(this.tenants().find(t=>t.tenantId===id)??null);}
 reset(){this.storage.clear();this.currentUser.set(null);this.tenants.set([]);this.currentTenant.set(null);}
}

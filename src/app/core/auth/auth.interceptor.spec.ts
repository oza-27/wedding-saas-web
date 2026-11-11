import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, TokenStorageService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

const base=`${environment.apiBaseUrl}/auth`;
const pair={accessToken:'new-access',refreshToken:'new-refresh',accessTokenExpiresAtUtc:'2030-01-01T00:00:00Z'};
describe('authInterceptor',()=>{
 let http:HttpClient;let testing:HttpTestingController;let storage:TokenStorageService;let auth:AuthService;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting()]});http=TestBed.inject(HttpClient);testing=TestBed.inject(HttpTestingController);storage=TestBed.inject(TokenStorageService);auth=TestBed.inject(AuthService);auth.reset();});
 afterEach(()=>{testing.verify();auth.reset();});
 it('attaches bearer access token to protected requests',()=>{storage.pair=pair;http.get(`${base}/me`).subscribe();const r=testing.expectOne(`${base}/me`);expect(r.request.headers.get('Authorization')).toBe('Bearer new-access');r.flush({});});
 it('does not attach access token to public auth requests and does not refresh their 401',()=>{storage.pair=pair;http.post(`${base}/login`,{}).subscribe({error:()=>{}});const r=testing.expectOne(`${base}/login`);expect(r.request.headers.has('Authorization')).toBe(false);r.flush({}, {status:401,statusText:'Unauthorized'});testing.expectNone(`${base}/refresh`);});
 it('refreshes after protected 401, replaces token pair and replays once',()=>{storage.pair={...pair,accessToken:'old',refreshToken:'old-refresh'};let count=0;http.get(`${base}/me`).subscribe(()=>count++);testing.expectOne(`${base}/me`).flush({}, {status:401,statusText:'Unauthorized'});const refresh=testing.expectOne(`${base}/refresh`);expect(refresh.request.body).toEqual({refreshToken:'old-refresh'});refresh.flush(pair);const retry=testing.expectOne(`${base}/me`);expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');retry.flush({});expect(count).toBe(1);expect(storage.refreshToken).toBe('new-refresh');});
 it('shares one refresh request for concurrent unauthorized requests',()=>{storage.pair={...pair,accessToken:'old',refreshToken:'old-refresh'};http.get(`${base}/me?a`).subscribe();http.get(`${base}/tenants`).subscribe();testing.expectOne(`${base}/me?a`).flush({}, {status:401,statusText:'Unauthorized'});testing.expectOne(`${base}/tenants`).flush({}, {status:401,statusText:'Unauthorized'});const refresh=testing.expectOne(`${base}/refresh`);refresh.flush(pair);testing.expectOne(`${base}/me?a`).flush({});testing.expectOne(`${base}/tenants`).flush([]);testing.expectNone(`${base}/refresh`);});
 it('clears auth when refresh fails and does not retry the protected request',()=>{storage.pair=pair;http.get(`${base}/me`).subscribe({error:()=>{}});testing.expectOne(`${base}/me`).flush({}, {status:401,statusText:'Unauthorized'});testing.expectOne(`${base}/refresh`).flush({}, {status:401,statusText:'Unauthorized'});expect(storage.accessToken).toBeNull();expect(storage.refreshToken).toBeNull();testing.expectNone(`${base}/me`);});
 it('does not refresh on 403',()=>{storage.pair=pair;http.get(`${base}/me`).subscribe({error:()=>{}});testing.expectOne(`${base}/me`).flush({}, {status:403,statusText:'Forbidden'});testing.expectNone(`${base}/refresh`);expect(storage.refreshToken).toBe(pair.refreshToken);});
 it('does not refresh network failures',()=>{storage.pair=pair;http.get(`${base}/me`).subscribe({error:()=>{}});testing.expectOne(`${base}/me`).error(new ProgressEvent('error'));testing.expectNone(`${base}/refresh`);});
 it('excludes refresh endpoint from recursive retries',()=>{storage.pair=pair;http.post(`${base}/refresh`,{refreshToken:pair.refreshToken}).subscribe({error:()=>{}});testing.expectOne(`${base}/refresh`).flush({}, {status:401,statusText:'Unauthorized'});testing.expectNone(`${base}/refresh`);});
 it('replays a request only once if retry also gets 401',()=>{storage.pair=pair;http.get(`${base}/me`).subscribe({error:()=>{}});testing.expectOne(`${base}/me`).flush({}, {status:401,statusText:'Unauthorized'});testing.expectOne(`${base}/refresh`).flush(pair);testing.expectOne(`${base}/me`).flush({}, {status:401,statusText:'Unauthorized'});testing.expectNone(`${base}/refresh`);expect(storage.refreshToken).toBeNull();});
});

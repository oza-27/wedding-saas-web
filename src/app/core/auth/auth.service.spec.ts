import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, TokenStorageService } from './auth.service';
import { environment } from '../../../environments/environment';
import { RegisterRequest, TokenPair, TenantMembership, UserProfile } from './auth.models';

const base = `${environment.apiBaseUrl}/auth`;
const pair: TokenPair = { accessToken: 'access-test', refreshToken: 'refresh-test', accessTokenExpiresAtUtc: '2030-01-01T00:00:00Z' };
const tenant: TenantMembership = { tenantId: 'tenant-1', tenantName: 'Fixture workspace', tenantSlug: 'fixture', tenantType: 1, membershipRole: 'Admin', membershipStatus: 'Active' };
const profile: UserProfile = { userId: 'user-1', firstName: 'Test', lastName: 'Person', email: 'test@example.test', isEmailVerified: true, phoneNumber: null, isActive: true };

describe('AuthService API contract', () => {
  let auth: AuthService;
  let storage: TokenStorageService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService); storage = TestBed.inject(TokenStorageService); http = TestBed.inject(HttpTestingController); storage.clear();
  });
  afterEach(() => { http.verify(); storage.clear(); });

  it('registers with the verified request DTO and returns the registration response', () => {
    const body: RegisterRequest = { firstName: 'A', lastName: 'B', email: 'a@example.test', phoneNumber: null, password: 'Strong!Password123', confirmPassword: 'Strong!Password123', tenantName: 'Fixture', tenantType: 1 };
    let response: unknown; auth.register(body).subscribe(value => response = value);
    const req = http.expectOne(`${base}/register`); expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(body); req.flush({ userId: 'user-1', message: 'Check email' });
    expect(response).toEqual({ userId: 'user-1', message: 'Check email' });
  });
  it('verifies email using verificationToken', () => { auth.verifyEmail({ email: 'a@example.test', verificationToken: 'opaque' }).subscribe(); const r=http.expectOne(`${base}/verify-email`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({email:'a@example.test',verificationToken:'opaque'}); r.flush({message:'Email verified.'}); });
  it('resends verification using email', () => { auth.resendVerification({email:'a@example.test'}).subscribe(); const r=http.expectOne(`${base}/resend-verification`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({email:'a@example.test'}); r.flush({message:'Processed'}); });
  it('logs in and keeps access token in memory with refresh token in session storage', () => { auth.login({email:'a@example.test',password:'Strong!Password123'}).subscribe(); const r=http.expectOne(`${base}/login`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({email:'a@example.test',password:'Strong!Password123'}); r.flush(pair); expect(storage.accessToken).toBe(pair.accessToken); expect(sessionStorage.getItem('wsa.refresh')).toBe(pair.refreshToken); });
  it('rotates refresh token using the request body', () => { storage.pair=pair; auth.refresh().subscribe(); const r=http.expectOne(`${base}/refresh`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({refreshToken:pair.refreshToken}); r.flush({...pair,accessToken:'next-access',refreshToken:'next-refresh'}); expect(storage.accessToken).toBe('next-access'); expect(storage.refreshToken).toBe('next-refresh'); });
  it('logs out the current session and clears auth and tenant state', () => { storage.pair=pair; sessionStorage.setItem('wsa.tenant','tenant-1'); auth.logout().subscribe(); const r=http.expectOne(`${base}/logout`); expect(r.request.body).toEqual({refreshToken:pair.refreshToken}); r.flush({message:'Signed out'}); expect(storage.accessToken).toBeNull(); expect(storage.refreshToken).toBeNull(); expect(sessionStorage.getItem('wsa.tenant')).toBeNull(); });
  it('logs out all sessions with authenticated empty body', () => { auth.logoutAll().subscribe(); const r=http.expectOne(`${base}/logout-all`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({}); r.flush({message:'All signed out'}); });
  it('requests password recovery without disclosing account status', () => { auth.forgotPassword({email:'a@example.test'}).subscribe(); const r=http.expectOne(`${base}/forgot-password`); expect(r.request.body).toEqual({email:'a@example.test'}); r.flush({message:'Processed'}); });
  it('resets password using resetToken and confirmPassword', () => { const body={email:'a@example.test',resetToken:'opaque',newPassword:'New!StrongPassword123',confirmPassword:'New!StrongPassword123'}; auth.resetPassword(body).subscribe(); const r=http.expectOne(`${base}/reset-password`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual(body); r.flush({message:'Password reset'}); });
  it('loads current user profile', () => { let result: UserProfile|null=null; auth.getCurrentUser().subscribe(v=>result=v); const r=http.expectOne(`${base}/me`); expect(r.request.method).toBe('GET'); r.flush(profile); expect(result).toEqual(profile); expect(auth.currentUser()).toEqual(profile); });
  it('lists tenant memberships from the API and exposes the loading state', () => { auth.getTenants().subscribe(); expect(auth.isLoading()).toBe(true); const r=http.expectOne(`${base}/tenants`); expect(r.request.method).toBe('GET'); r.flush([tenant]); expect(auth.tenants()).toEqual([tenant]); expect(auth.isLoading()).toBe(false); });
  it('switches tenant by tenantId and stores the returned token pair and active membership', () => { storage.pair=pair; auth.tenants.set([tenant]); auth.switchTenant(tenant.tenantId).subscribe(); const r=http.expectOne(`${base}/switch-tenant`); expect(r.request.method).toBe('POST'); expect(r.request.body).toEqual({tenantId:tenant.tenantId}); r.flush({...pair,accessToken:'tenant-access',refreshToken:'tenant-refresh'}); expect(storage.accessToken).toBe('tenant-access'); expect(auth.currentTenant()).toEqual(tenant); expect(sessionStorage.getItem('wsa.tenant')).toBe(tenant.tenantId); });
});

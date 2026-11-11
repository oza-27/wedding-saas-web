export type TenantType = 1 | 2;
export interface RegisterRequest { firstName:string; lastName:string; email:string; phoneNumber?:string|null; password:string; confirmPassword:string; tenantName:string; tenantType:TenantType }
export interface VerifyEmailRequest { email:string; verificationToken:string }
export interface EmailRequest { email:string }
export interface LoginRequest extends EmailRequest { password:string }
export interface ResetPasswordRequest extends EmailRequest { resetToken:string; newPassword:string; confirmPassword:string }
export interface TokenPair { accessToken:string; refreshToken:string; accessTokenExpiresAtUtc:string }
export interface RegisterResponse { userId:string; message:string }
export interface UserProfile { userId:string; firstName:string; lastName:string; email:string; isEmailVerified:boolean; phoneNumber:string|null; isActive:boolean }
export interface TenantMembership { tenantId:string; tenantName:string; tenantSlug:string; tenantType:TenantType; membershipRole:string; membershipStatus:string }
export interface ApiMessage { message:string }

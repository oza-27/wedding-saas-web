# Frontend authentication

## Assessment and structure
Angular 21.2, standalone components, strict TypeScript, Angular Router, reactive forms, Angular Material dependencies and Vitest. The starter had no auth or reusable application layout. PF-004 adds a centralized auth service, token storage, interceptor, guards, auth screens, workspace selection and a minimal authenticated shell.

## Routes
`/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/select-tenant`, and `/home`. Login/register/recovery are guest-only where appropriate; app routes require an authenticated session; home also requires an active selected workspace.

## Verified backend contract
Verified against the backend `docs/authentication.md`, `AuthController`, `IAuthenticationService`, and the email-link builder in `AuthenticationService`. All URLs are relative to `{apiBaseUrl}/auth` (`apiBaseUrl` includes `/api/v1`). Request properties use camelCase JSON:

- Register: `{firstName,lastName,email,phoneNumber,password,confirmPassword,tenantName,tenantType}`; response `{userId,message}`.
- Verify email: `{email,verificationToken}`; resend and forgot-password: `{email}`.
- Login: `{email,password}`; refresh and logout: `{refreshToken}`.
- Reset password: `{email,resetToken,newPassword,confirmPassword}`.
- Switch tenant: `{tenantId}`; logout-all has no body properties.
- Token pair: `{accessToken,refreshToken,accessTokenExpiresAtUtc}`.
- Profile: `{userId,firstName,lastName,email,isEmailVerified,phoneNumber,isActive}`.
- Tenant membership: `{tenantId,tenantName,tenantSlug,tenantType,membershipRole,membershipStatus}`.

`tenantType` is numeric: Planner=1, Family=2. Verification and reset email links use `?email=...&token=...`; Angular safely decodes the values and does not render token values. Error responses use a message field; login 401 is generic by backend design. All twelve endpoint methods, paths, and payloads have request-level tests.

## Token handling and interceptor
Access token is held only in memory. Refresh token is isolated in `TokenStorageService` in `sessionStorage` because the API requires a body token and does not use an HttpOnly cookie. Browser scripts can access sessionStorage, so XSS can expose the refresh token; sessionStorage is not equivalent to an HttpOnly cookie. Tokens are not logged. Logout, logout-all, and failed refresh clear token and selected-tenant state. Login and tenant switching clear stale tenant context before accepting a new session/context. The interceptor adds Bearer auth only to protected requests, shares a single in-flight refresh, retries a protected request once, and clears auth after refresh failure. It does not refresh on 403 or network errors.

## Tenant behavior and guards
After login, the UI loads profile and memberships, then directs the user to explicit workspace selection. It displays only API-returned memberships and replaces the token pair only after successful switching. Stored tenant context is restored only when its ID is present in the current API membership list. AuthGuard preserves `returnUrl`; GuestGuard redirects users with an in-memory access token; TenantContextGuard requires valid active context. Guards are navigation aids, not security boundaries; the backend must authorize every protected request.

## Environment and running
`src/environments/environment.ts` configures the local API base URL and production configures `/api/v1`. Update these values for deployment; no secrets are included. Run `npm install`, `npm start`, `npm run build`, and `npm test` from the frontend project.

The Angular CLI's persistent cache had a stale locked compiler database and terminated with a Windows native access violation before producing diagnostics. `ng cache clean` could not remove its locked database. Disabling only the Angular build cache in `angular.json` avoids the stale database; production optimization, font inlining, and budgets remain enabled. This trades build speed for reliable local builds until the cache issue is resolved. Google Fonts and Material Icons links from the starter index were also removed because the UI does not use them and they caused production font inlining to require network access.

## Tests and future improvements
Vitest coverage includes all AuthService endpoint calls, auth form validation and responses, route guards, interceptor token/refresh behavior, workspace selection/switching, authenticated home, and shell logout. The current suite reports 50 passing tests. Live integration requires a running backend, database, and configured email delivery. A future coordinated backend improvement should use a Secure, HttpOnly, SameSite refresh cookie; add cross-tab session coordination and a browser E2E suite.



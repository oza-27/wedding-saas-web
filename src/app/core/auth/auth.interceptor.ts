import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, shareReplay, switchMap, throwError } from 'rxjs';
import { TokenStorageService, AuthService } from './auth.service';
let refreshing: ReturnType<AuthService['refresh']>|null=null;
export const authInterceptor:HttpInterceptorFn=(req,next)=>{const store=inject(TokenStorageService),auth=inject(AuthService);const publicRoute=/\/auth\/(login|register|verify-email|resend-verification|forgot-password|reset-password|refresh|logout)(\?|$)/.test(req.url);const token=store.accessToken;const outgoing=token&&!publicRoute?req.clone({setHeaders:{Authorization:`Bearer ${token}`}}):req;return next(outgoing).pipe(catchError(error=>{if(error.status!==401||publicRoute||!store.refreshToken)return throwError(()=>error);refreshing??=auth.refresh().pipe(shareReplay({bufferSize:1,refCount:false}));return refreshing.pipe(switchMap(pair=>{refreshing=null;return next(req.clone({setHeaders:{Authorization:`Bearer ${pair.accessToken}`}}));}),catchError(e=>{refreshing=null;auth.reset();return throwError(()=>e);}));}));};

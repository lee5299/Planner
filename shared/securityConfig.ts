export const authSecurityConfig={
 minimumPasswordLength:12,
 failedPasswordLimit:5,
 failedPasswordWindowSeconds:5*60,
 accountLockSeconds:5*60,
 trustForwardedFor:false,
 captcha:{
  required:true,
  provider:'turnstile',
  siteKeyEnvironmentVariable:'VITE_TURNSTILE_SITE_KEY'
 },
 genericLoginError:'이메일 또는 비밀번호를 확인하거나 잠시 후 다시 시도해 주세요.'
} as const;

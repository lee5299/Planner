# 플랜두씨 다이어리

계획(Plan), 실제로 한 일(Do), 돌아보기(See)를 연결해 계획과 실제 사이에서 자주 놓치는 부분을 확인하는 다이어리입니다. 자기관리 만다라트와 프로젝트 일정은 독립된 화면으로 제공합니다.

- 결과물: https://planner-5fv4.vercel.app/
- 기획·디자인·검증 문서: [`docs/README.md`](docs/README.md)
- 데이터 계약: [`contracts/pds-schema-v2.json`](contracts/pds-schema-v2.json)

## 실행

Node.js 22.13 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

로컬 개발 주소는 `http://localhost:3000`입니다.

## Supabase 설정

`.env.example`을 복사해 `.env`를 만들고 아래 공개 환경변수를 설정합니다.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
```

과제 7 전환의 소유권·로그인 공격 방어 SQL은 Supabase에 적용했다. 기존 `default` 작업공간은 로그인 계정 소유로 이전되었으며, 이전 뒤 검증값은 미소유 작업공간 0개·현재 revision 212·revision 이력 212개다. Free 플랜에서는 Password verification hook을 연결할 수 없으므로 계정별 5회 실패 잠금은 활성화하지 않고, Turnstile CAPTCHA와 Supabase 기본 요청 제한을 사용한다. `.env`와 실제 키는 Git에 올리지 않으며 Turnstile 비밀키는 Supabase Dashboard에만 둡니다.

현재 소스의 첫 화면은 로그인 화면이며 로그인한 사용자의 RPC만 호출합니다. 사용자별 데이터 소유권 보호와 Turnstile 설정은 적용됐고, 계정별 비밀번호 실패 잠금은 현재 Free 플랜 범위에서 사용하지 않습니다.

## 검증

```bash
pnpm run check
pnpm run build
```

`check`는 중앙 보안 설정과 생성 SQL의 일치, TypeScript, 핵심 계산·저장 테스트를 검사합니다. `build`는 Vite 클라이언트와 정적 제공용 서버 번들을 생성합니다. 보안 설정 변경 뒤에는 `pnpm security:sync`로 생성 SQL을 갱신합니다.

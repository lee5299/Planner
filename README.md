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

과제 7 전환 전에는 [`docs/T07_AUTH.md`](docs/T07_AUTH.md)의 백업·적용 순서를 먼저 확인합니다. 소유권과 로그인 공격 방어 SQL은 준비되어 있지만 아직 실행하지 않은 상태입니다. `.env`와 실제 키는 Git에 올리지 않으며 Turnstile 비밀키는 Supabase Dashboard에만 둡니다.

현재 소스의 첫 화면은 로그인 화면이며 로그인한 사용자의 RPC만 호출합니다. 실제 계정별 보호는 과제 7 마이그레이션과 Supabase 비밀번호 훅·Turnstile 설정을 적용한 뒤 활성화됩니다.

## 검증

```bash
pnpm run check
pnpm run build
```

`check`는 중앙 보안 설정과 생성 SQL의 일치, TypeScript, 핵심 계산·저장 테스트를 검사합니다. `build`는 Vite 클라이언트와 정적 제공용 서버 번들을 생성합니다. 보안 설정 변경 뒤에는 `pnpm security:sync`로 생성 SQL을 갱신합니다.

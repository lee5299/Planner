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
```

Supabase SQL Editor에서 [`supabase/migrations/202609120001_planner.sql`](supabase/migrations/202609120001_planner.sql)을 실행합니다. `.env`와 실제 키는 Git에 올리지 않습니다.

현재 과제 범위에는 로그인이 없습니다. 링크를 아는 사람은 같은 `default` 작업 공간을 읽고 수정할 수 있으므로 공개해도 괜찮은 내용만 입력해야 합니다.

## 검증

```bash
pnpm run check
pnpm run build
```

`check`는 TypeScript 검사와 핵심 계산·저장 테스트를 실행합니다. `build`는 Vite 클라이언트와 정적 제공용 서버 번들을 생성합니다.

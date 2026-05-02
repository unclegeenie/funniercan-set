퍼니어캔의 현장조사 야장 SET v6

주요 기능
1. 수목활력 데이터 서버 저장
2. 토양측정 데이터 서버 저장
3. 데이터 수정/삭제 기능
4. 수목활력/토양측정 비고란 추가
5. GPS 좌표 기록 기능
6. 현장소통 탭에서 저장 데이터 자동 공유 및 다운로드
7. 공지사항 등록/수정/삭제 기능
8. 현장소통 글 비밀번호 기반 수정/삭제 기능
9. 오늘 방문자수 / 전체 방문자수 표시

GitHub에 올릴 때 필요한 구조
src/App.jsx
src/main.jsx
src/styles.css
netlify/functions/visit-stats.js
netlify/functions/community-posts.js
netlify/functions/survey-data.js
netlify/functions/notices.js
index.html
package.json
netlify.toml

Netlify 설정
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions

공지사항 관리 비밀번호
기본값: funniercan2026
운영 전 Netlify에서 환경변수 ADMIN_PASSWORD를 추가해서 원하는 비밀번호로 변경하는 것을 권장합니다.

Netlify 환경변수 변경 위치
Site configuration 또는 Project configuration → Environment variables → Add variable
Key: ADMIN_PASSWORD
Value: 원하는 관리 비밀번호

주의사항
- GPS 기능은 브라우저 위치 권한을 허용해야 작동합니다.
- Netlify 배포 주소처럼 HTTPS 환경에서 사용하는 것이 좋습니다.
- 기존 v5의 비밀번호 없이 작성된 현장소통 글은 새 비밀번호 검증 방식으로 수정/삭제할 수 없습니다.
- 수목활력/토양측정은 이제 서버 저장형이므로 다른 접속자도 현장소통 탭에서 공유 데이터를 확인하고 다운로드할 수 있습니다.

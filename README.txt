퍼니어캔의 현장조사 야장 SET - Netlify 배포용 프로젝트

구성 탭:
1. 공지사항
2. 수목활력
3. 토양측정
4. 현장소통

추가 기능:
- 오늘 방문자수 / 전체 방문자수 표시
- Netlify Functions + Netlify Blobs 사용
- 수목활력 / 토양측정 CSV 및 엑셀 저장
- 브라우저 임시저장(localStorage)

배포 방법:
1. GitHub에 이 프로젝트 업로드
2. Netlify에서 GitHub 저장소 연결
3. Build command: npm run build
4. Publish directory: dist

주의:
- 방문자수 기능은 단순 dist 업로드보다 Git 연동 배포가 더 안정적입니다.
- 현장소통 게시글은 현재 브라우저 임시저장 방식입니다.

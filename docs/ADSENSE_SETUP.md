# Google AdSense 설정 가이드

## 1. AdSense 계정 생성

1. [Google AdSense](https://www.google.com/adsense) 방문
2. Google 계정으로 로그인
3. 사이트 URL 입력 및 신청
4. 승인 대기 (보통 1-2주 소요)

## 2. 광고 단위 생성

AdSense 승인 후:

1. AdSense 대시보드 → **광고** → **광고 단위별** 클릭
2. **디스플레이 광고** 선택
3. 광고 단위 이름 입력 (예: "홈페이지 상단 배너")
4. 광고 크기 선택:
   - **반응형**: 모든 화면 크기에 자동 조정 (권장)
   - **고정**: 특정 크기 지정
5. **만들기** 클릭
6. **광고 슬롯 ID** 복사 (예: `1234567890`)

## 3. 코드에 적용

### 3.1 클라이언트 ID 업데이트

다음 파일들에서 `ca-pub-XXXXXXXXXXXXXXXX`를 본인의 클라이언트 ID로 교체:

- `index.html` (line 7)
- `src/components/AdBanner.tsx` (line 25)

### 3.2 광고 슬롯 ID 업데이트

`src/App.tsx`에서 각 `AdBanner` 컴포넌트의 `adSlot` prop을 실제 광고 슬롯 ID로 교체:

```tsx
<AdBanner adSlot="1234567890" adFormat="horizontal" />
```

현재 배치된 광고 위치:
- 홈페이지 상단: `adSlot="1234567890"`
- 게임 목록 하단: `adSlot="0987654321"`
- 로드맵 하단: `adSlot="1122334455"`
- 게임 페이지 상단: `adSlot="5544332211"`
- 게임 페이지 하단: `adSlot="6677889900"`

## 4. 광고 형식 옵션

`AdBanner` 컴포넌트는 다음 props를 지원합니다:

```tsx
<AdBanner
  adSlot="1234567890"           // 필수: 광고 슬롯 ID
  adFormat="auto"               // 선택: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  fullWidthResponsive={true}    // 선택: 전체 너비 반응형 여부
  style={{ margin: '30px 0' }}  // 선택: 커스텀 스타일
/>
```

## 5. 테스트

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 확인
3. 광고가 표시되지 않으면:
   - 브라우저 콘솔에서 에러 확인
   - AdBlock 비활성화
   - 클라이언트 ID와 슬롯 ID 재확인

## 6. 배포

1. 빌드: `npm run build`
2. Vercel 또는 다른 호스팅에 배포
3. AdSense에서 사이트 승인 대기

## 7. 수익 최적화 팁

- **광고 위치**: 콘텐츠 상단과 하단이 클릭률이 높음
- **광고 밀도**: 너무 많은 광고는 사용자 경험 저하
- **반응형 광고**: 모바일 트래픽을 위해 반응형 광고 사용
- **A/B 테스트**: 다양한 광고 위치와 형식 테스트
- **정책 준수**: [AdSense 프로그램 정책](https://support.google.com/adsense/answer/48182) 준수

## 8. 대안 광고 플랫폼

- **Media.net**: Bing과 Yahoo 광고 네트워크
- **PropellerAds**: 팝업 및 네이티브 광고
- **Ezoic**: AI 기반 광고 최적화
- **AdThrive**: 고트래픽 사이트용 (월 100k+ 페이지뷰 필요)

## 문제 해결

### 광고가 표시되지 않음
- AdSense 계정 승인 확인
- 클라이언트 ID 정확성 확인
- 브라우저 콘솔 에러 확인
- 광고 차단 프로그램 비활성화

### 수익이 발생하지 않음
- 트래픽 증가 필요 (최소 일 100+ 방문자)
- 광고 위치 최적화
- 콘텐츠 품질 개선
- 정책 위반 확인

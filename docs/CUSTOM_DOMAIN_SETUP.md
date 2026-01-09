# Vercel 커스텀 도메인 연결 가이드

## 1. 도메인 구매 (선택사항)

### 추천 도메인 등록 업체
- **국내**: [가비아](https://www.gabia.com/), [후이즈](https://www.whois.co.kr/), [카페24](https://www.cafe24.com/)
- **해외**: [Namecheap](https://www.namecheap.com/), [Google Domains](https://domains.google/), [Cloudflare](https://www.cloudflare.com/products/registrar/)

### 가격 (연간)
- `.com`: ₩13,000-20,000
- `.net`: ₩15,000-25,000
- `.co.kr`: ₩20,000-30,000
- `.io`: ₩40,000-60,000

## 2. Vercel에 도메인 연결

### 방법 1: Vercel 대시보드에서 설정

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Domains** 클릭
4. 도메인 입력 (예: `yourgame.com`)
5. **Add** 클릭

### 방법 2: DNS 설정

Vercel이 제공하는 DNS 레코드를 도메인 등록 업체에 추가:

#### A 레코드 (루트 도메인용)
```
Type: A
Name: @
Value: 76.76.21.21
```

#### CNAME 레코드 (www 서브도메인용)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 방법 3: Vercel 네임서버 사용 (가장 쉬움)

도메인 등록 업체에서 네임서버를 Vercel로 변경:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

## 3. SSL 인증서

Vercel은 자동으로 무료 SSL 인증서(Let's Encrypt)를 발급합니다.
- 설정 후 몇 분 내 HTTPS 활성화
- 자동 갱신

## 4. AdSense에 새 도메인 등록

커스텀 도메인 연결 후:

1. AdSense 대시보드 → **사이트** 클릭
2. **사이트 추가** 선택
3. 새 도메인 입력
4. 승인 대기 (기존 계정이면 빠름)

## 5. 도메인 없이 시작하기

**지금 당장 도메인이 필요하지 않습니다!**

### Vercel 무료 도메인으로 시작
1. `your-project.vercel.app`으로 AdSense 신청
2. 트래픽 확보 및 수익 확인
3. 수익이 나면 그때 도메인 구매 고려

### 언제 도메인을 사야 할까?
- ✅ 월 수익이 도메인 비용을 초과할 때
- ✅ 브랜딩이 중요해질 때
- ✅ 장기적으로 운영할 계획일 때
- ❌ 아직 트래픽이 적을 때는 불필요

## 6. 비용 대비 효과

### 시나리오 1: 도메인 없이 시작
- **비용**: ₩0
- **수익**: 광고 수익 100%
- **리스크**: 낮음

### 시나리오 2: 도메인 구매
- **비용**: ₩15,000/년
- **추가 수익**: 약간 증가 (5-10%)
- **브랜딩**: 향상

### 권장 전략
1. **1-3개월**: Vercel 무료 도메인으로 시작
2. **트래픽 확인**: 일 방문자 100명 이상 달성
3. **수익 확인**: 월 수익 ₩20,000 이상
4. **도메인 구매**: 그때 커스텀 도메인 고려

## 7. 도메인 선택 팁

### 좋은 도메인명
- 짧고 기억하기 쉬움
- 발음하기 쉬움
- 브랜드와 일치
- `.com` 우선 (가장 신뢰도 높음)

### 예시
- `1k2pgames.com` ✅
- `playgames1k2p.com` ⚠️ (너무 김)
- `1k2p.io` ✅ (게임/테크 느낌)
- `1k2p.co.kr` ✅ (한국 타겟)

## 8. 자주 묻는 질문

**Q: Vercel 무료 도메인으로 AdSense 승인이 어려운가요?**
A: 아니요. 콘텐츠 품질이 더 중요합니다.

**Q: 나중에 도메인을 바꾸면 AdSense 설정을 다시 해야 하나요?**
A: 네, 새 도메인을 AdSense에 추가해야 합니다. 하지만 기존 계정은 유지됩니다.

**Q: 도메인 구매 후 Vercel 연결이 어렵나요?**
A: 아니요. Vercel 대시보드에서 클릭 몇 번으로 가능합니다.

**Q: 무료 도메인이 있나요?**
A: [Freenom](https://www.freenom.com/)에서 `.tk`, `.ml` 등 무료 도메인을 제공하지만, AdSense 승인이 어려울 수 있습니다.

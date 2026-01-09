import type { ReactNode } from 'react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  AppLayout,
  Box,
  Button,
  Cards,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  SideNavigation,
  SpaceBetween,
  StatusIndicator,
  TopNavigation,
} from '@cloudscape-design/components'
import { Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  games,
  getGameLoader,
  resolveLocaleString,
  type GameStatus,
  type Locale,
} from './games/registry'

const statusMap: Record<GameStatus, 'success' | 'info' | 'pending'> = {
  open: 'success',
  prototype: 'info',
  planned: 'pending',
}

const statusLabels: Record<Locale, Record<GameStatus, string>> = {
  en: {
    open: 'Open',
    prototype: 'Prototype',
    planned: 'Planned',
  },
  ko: {
    open: '오픈',
    prototype: '프로토타입',
    planned: '계획',
  },
}

const copy = {
  en: {
    navTitle: '1k2p Cloudspace',
    navGames: 'Games',
    navCreators: 'Creators',
    navRoadmap: 'Roadmap',
    navSubmit: 'Submit a game',
    navGuide: 'Contribution guide',
    language: 'Language',
    languageNames: { ko: 'Korean', en: 'English' },
    tagline: 'one kill 2 players',
    heroTitle: '1k2p mini games',
    heroBody:
      'Pick a sky lane, drop into a match, and rack up double eliminations. New mini games land through developer PRs and are curated for quick chaos.',
    heroPrimary: 'Pick a game',
    heroSecondary: 'How it works',
    statsQueued: 'Mini games queued',
    statsPlayers: 'Players per match',
    statsSession: 'Average session',
    cardsTitle: 'Pick a mini game',
    cardsDescription: 'Built for fast runs and sudden comebacks.',
    cardsMode: 'Mode',
    cardsStatus: 'Status',
    cardsDescriptionLabel: 'Description',
    cardsEnterLobby: 'Enter lobby',
    emptyGames: 'No games yet. Submit a new mini game PR to populate the list.',
    loadingGames: 'Loading games',
    creatorsTitle: 'Creator portal',
    creatorsBody:
      '1k2p is a rotating hub. Drop in a new game via PR, follow the starter template, and we will surface it on the cloudspace deck.',
    creatorsStep1Label: 'Step 1',
    creatorsStep1Body: 'Clone the base mini game template.',
    creatorsStep2Label: 'Step 2',
    creatorsStep2Body: 'Wire up matchmaking and session hooks.',
    creatorsStep3Label: 'Step 3',
    creatorsStep3Body: 'Open a PR with demo footage.',
    creatorsCta: 'Read the contribution guide',
    roadmapTitle: 'Roadmap',
    roadmapSubtitle: 'Next in the sky',
    roadmapItems: [
      'Seasonal cloudspace skins',
      'Match replay clips',
      'Creator spotlight banners',
      'Weekly duel ladders',
    ],
    gameNotFound: 'Game not found',
    backToHub: 'Back to hub',
    startGame: 'Start game',
    loadingGame: 'Loading game',
    missingGameEntry:
      'This game does not exist yet or is missing an entrypoint at',
  },
  ko: {
    navTitle: '1k2p 클라우드스페이스',
    navGames: '게임',
    navCreators: '크리에이터',
    navRoadmap: '로드맵',
    navSubmit: '게임 제출',
    navGuide: '기여 가이드',
    language: '언어',
    languageNames: { ko: '한국어', en: 'English' },
    tagline: 'one kill 2 players',
    heroTitle: '1k2p 미니게임',
    heroBody:
      '하늘 레인에 드롭해 매치에 들어가고 더블 킬을 쌓아라. 새로운 미니게임은 개발자 PR로 추가되며 빠른 전투를 위해 큐레이션된다.',
    heroPrimary: '게임 고르기',
    heroSecondary: '진행 방식',
    statsQueued: '대기 중 미니게임',
    statsPlayers: '매치 인원',
    statsSession: '평균 플레이',
    cardsTitle: '미니게임 선택',
    cardsDescription: '빠른 전개와 역전을 위한 구성.',
    cardsMode: '모드',
    cardsStatus: '상태',
    cardsDescriptionLabel: '설명',
    cardsEnterLobby: '로비 입장',
    emptyGames: '아직 등록된 게임이 없습니다. 새 미니게임 PR을 올려주세요.',
    loadingGames: '게임 불러오는 중',
    creatorsTitle: '크리에이터 포털',
    creatorsBody:
      '1k2p는 순환형 허브다. 새 게임을 PR로 추가하고 템플릿을 따르면 클라우드스페이스 덱에 노출된다.',
    creatorsStep1Label: '1단계',
    creatorsStep1Body: '베이스 미니게임 템플릿을 클론한다.',
    creatorsStep2Label: '2단계',
    creatorsStep2Body: '매치메이킹과 세션 훅을 연결한다.',
    creatorsStep3Label: '3단계',
    creatorsStep3Body: '데모 영상과 함께 PR을 연다.',
    creatorsCta: '기여 가이드 읽기',
    roadmapTitle: '로드맵',
    roadmapSubtitle: '다음 업데이트',
    roadmapItems: [
      '시즌 클라우드스페이스 스킨',
      '매치 리플레이 클립',
      '크리에이터 스포트라이트 배너',
      '주간 듀얼 래더',
    ],
    gameNotFound: '게임을 찾을 수 없습니다',
    backToHub: '허브로 돌아가기',
    startGame: '게임 시작',
    loadingGame: '게임 불러오는 중',
    missingGameEntry:
      '이 게임이 아직 없거나 다음 엔트리포인트가 없습니다:',
  },
} as const

const placeholderImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%23dbeafe"/><stop offset="100%" stop-color="%2393c5fd"/></linearGradient></defs><rect width="320" height="320" rx="28" fill="url(%23g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Open Sans, Arial, sans-serif" font-size="48" fill="%231e293b">1k2p</text></svg>'

function App() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('1k2p-locale')
    if (stored === 'ko' || stored === 'en') {
      return stored
    }
    const browserLocale = navigator.language.toLowerCase()
    return browserLocale.startsWith('ko') ? 'ko' : 'en'
  })
  const t = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    localStorage.setItem('1k2p-locale', locale)
  }, [locale])

  const navigation = (
    <SideNavigation
      header={{ href: '/', text: t.navTitle }}
      items={[
        { type: 'link', text: t.navGames, href: '/#games' },
        { type: 'link', text: t.navCreators, href: '/#creators' },
        { type: 'link', text: t.navRoadmap, href: '/#roadmap' },
      ]}
    />
  )

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{ title: '1k2p', href: '/' }}
          utilities={[
            {
              type: 'menu-dropdown',
              text: `${t.language}: ${t.languageNames[locale]}`,
              items: [
                { id: 'ko', text: t.languageNames.ko },
                { id: 'en', text: t.languageNames.en },
              ],
              onItemClick: ({ detail }) => setLocale(detail.id as Locale),
            },
            {
              type: 'button',
              text: t.navSubmit,
              href: '/#creators',
            },
            {
              type: 'button',
              text: t.navGuide,
              href: '/#creators',
            },
          ]}
        />
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <HubPage
              navigation={navigation}
              navigationOpen={navigationOpen}
              onNavigationChange={setNavigationOpen}
              locale={locale}
              t={t}
            />
          }
        />
        <Route
          path="/games/:gameId"
          element={
            <GamePage
              navigation={navigation}
              navigationOpen={navigationOpen}
              onNavigationChange={setNavigationOpen}
              locale={locale}
              t={t}
            />
          }
        />
      </Routes>
    </>
  )
}

type PageProps = {
  navigation: ReactNode
  navigationOpen: boolean
  onNavigationChange: (open: boolean) => void
  locale: Locale
  t: typeof copy.en | typeof copy.ko
}

function HubPage({ navigation, navigationOpen, onNavigationChange, locale, t }: PageProps) {
  const navigate = useNavigate()

  return (
    <AppLayout
      headerSelector="#top-nav"
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => onNavigationChange(detail.open)}
      navigation={navigation}
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1" description={t.tagline}>
                {t.heroTitle}
              </Header>
              <Box color="text-body-secondary">{t.heroBody}</Box>
              <SpaceBetween size="m" direction="horizontal">
                <Button variant="primary">{t.heroPrimary}</Button>
                <Button>{t.heroSecondary}</Button>
              </SpaceBetween>
              <Container>
                <ColumnLayout columns={3} variant="text-grid">
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.statsQueued}
                    </Box>
                    <Box variant="h2">{games.length}</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.statsPlayers}
                    </Box>
                    <Box variant="h2">2-4</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.statsSession}
                    </Box>
                    <Box variant="h2">90s</Box>
                  </SpaceBetween>
                </ColumnLayout>
              </Container>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container
              header={<Header variant="h2" description={t.cardsDescription}>{t.cardsTitle}</Header>}
            >
              <Cards
                cardDefinition={{
                  header: (item) => {
                    const imageSrc = item.thumbnail ?? placeholderImage
                    const title = resolveLocaleString(item.title, locale)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid var(--awsui-color-border-divider-default)',
                            background: 'var(--awsui-color-background-layout-main)',
                            flex: '0 0 40px',
                          }}
                        >
                          <img
                            src={imageSrc}
                            alt={title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <Box variant="h3">{title}</Box>
                      </div>
                    )
                  },
                  sections: [
                    {
                      id: 'hero',
                      content: (item) => {
                        const heroSrc = item.heroImage ?? item.thumbnail ?? placeholderImage
                        const title = resolveLocaleString(item.title, locale)
                        return (
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16 / 9',
                              borderRadius: 12,
                              overflow: 'hidden',
                              border: '1px solid var(--awsui-color-border-divider-default)',
                              background: 'var(--awsui-color-background-layout-main)',
                            }}
                          >
                            <img
                              src={heroSrc}
                              alt={title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )
                      },
                    },
                    {
                      id: 'meta',
                      content: (item) => (
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ width: '50%', minWidth: 0 }}>
                            <SpaceBetween size="xs">
                              <Box variant="small" color="text-body-secondary">
                                {t.cardsMode}
                              </Box>
                              <Box>{resolveLocaleString(item.mode, locale)}</Box>
                            </SpaceBetween>
                          </div>
                          <div style={{ width: '50%', minWidth: 0 }}>
                            <SpaceBetween size="xs">
                              <Box variant="small" color="text-body-secondary">
                                {t.cardsStatus}
                              </Box>
                              <StatusIndicator type={statusMap[item.status] ?? 'info'}>
                                {statusLabels[locale][item.status]}
                              </StatusIndicator>
                            </SpaceBetween>
                          </div>
                        </div>
                      ),
                    },
                    {
                      id: 'description',
                      header: t.cardsDescriptionLabel,
                      content: (item) => resolveLocaleString(item.description, locale),
                    },
                    {
                      id: 'actions',
                      content: (item) => (
                        <Button onClick={() => navigate(`/games/${item.id}`)}>
                          {t.cardsEnterLobby}
                        </Button>
                      ),
                    },
                  ],
                }}
                cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }, { minWidth: 900, cards: 3 }]}
                items={games}
                loadingText={t.loadingGames}
                trackBy="id"
                empty={
                  <Box textAlign="center" color="text-body-secondary">
                    {t.emptyGames}
                  </Box>
                }
              />
            </Container>

            <Container id="creators" header={<Header variant="h2">{t.creatorsTitle}</Header>}>
              <SpaceBetween size="l">
                <Box>{t.creatorsBody}</Box>
                <ColumnLayout columns={3} variant="text-grid">
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.creatorsStep1Label}
                    </Box>
                    <Box>{t.creatorsStep1Body}</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.creatorsStep2Label}
                    </Box>
                    <Box>{t.creatorsStep2Body}</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      {t.creatorsStep3Label}
                    </Box>
                    <Box>{t.creatorsStep3Body}</Box>
                  </SpaceBetween>
                </ColumnLayout>
                <Button variant="primary">{t.creatorsCta}</Button>
              </SpaceBetween>
            </Container>

            <Container id="roadmap" header={<Header variant="h2">{t.roadmapTitle}</Header>}>
              <SpaceBetween size="s">
                <Box variant="h3">{t.roadmapSubtitle}</Box>
                <ul style={{ paddingLeft: '24px', margin: 0 }}>
                  {t.roadmapItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      toolsHide
    />
  )
}

function GamePage({ navigation, navigationOpen, onNavigationChange, locale, t }: PageProps) {
  const navigate = useNavigate()
  const { gameId } = useParams()
  const game = games.find((item) => item.id === gameId)
  const loader = gameId ? getGameLoader(gameId) : undefined
  const GameComponent = useMemo(() => (loader ? lazy(loader) : null), [loader])
  const gameTitle = game ? resolveLocaleString(game.title, locale) : t.gameNotFound

  return (
    <AppLayout
      headerSelector="#top-nav"
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => onNavigationChange(detail.open)}
      navigation={navigation}
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{gameTitle}</Header>
              <SpaceBetween size="m" direction="horizontal">
                <Button onClick={() => navigate('/')}>{t.backToHub}</Button>
                {game ? <Button variant="primary">{t.startGame}</Button> : null}
              </SpaceBetween>
            </SpaceBetween>
          }
        >
          <Container>
            {game && GameComponent ? (
              <Suspense
                fallback={
                  <StatusIndicator type="loading">{t.loadingGame}</StatusIndicator>
                }
              >
                <GameComponent />
              </Suspense>
            ) : (
              <Box color="text-body-secondary">
                {t.missingGameEntry} <code>src/games/{gameId}/index.tsx</code>.
              </Box>
            )}
          </Container>
        </ContentLayout>
      }
      toolsHide
    />
  )
}

export default App

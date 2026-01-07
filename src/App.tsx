import type { ReactNode } from 'react'
import { Suspense, lazy, useMemo, useState } from 'react'
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
import { games, getGameLoader } from './games/registry'

const statusMap: Record<string, 'success' | 'info' | 'pending'> = {
  Open: 'success',
  Prototype: 'info',
  Planned: 'pending',
}

function App() {
  const [navigationOpen, setNavigationOpen] = useState(false)

  const navigation = (
    <SideNavigation
      header={{ href: '/', text: '1k2p Cloudspace' }}
      items={[
        { type: 'link', text: 'Games', href: '/#games' },
        { type: 'link', text: 'Creators', href: '/#creators' },
        { type: 'link', text: 'Roadmap', href: '/#roadmap' },
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
              type: 'link',
              text: 'Submit a game',
              href: '/#creators',
            },
            {
              type: 'link',
              text: 'Contribution guide',
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
}

function HubPage({ navigation, navigationOpen, onNavigationChange }: PageProps) {
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
              <Header variant="h1" description="one kill 2 players">
                1k2p mini games
              </Header>
              <Box color="text-body-secondary">
                Pick a sky lane, drop into a match, and rack up double eliminations. New mini games land
                through developer PRs and are curated for quick chaos.
              </Box>
              <SpaceBetween size="m" direction="horizontal">
                <Button variant="primary">Pick a game</Button>
                <Button>How it works</Button>
              </SpaceBetween>
              <Container>
                <ColumnLayout columns={3} variant="text-grid">
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Mini games queued
                    </Box>
                    <Box variant="h2">6</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Players per match
                    </Box>
                    <Box variant="h2">2-4</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Average session
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
              header={
                <Header variant="h2" description="Built for fast runs and sudden comebacks.">
                  Pick a mini game
                </Header>
              }
            >
              <Cards
                cardDefinition={{
                  header: (item) => item.title,
                  sections: [
                    {
                      id: 'mode',
                      header: 'Mode',
                      content: (item) => item.mode,
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      content: (item) => (
                        <StatusIndicator type={statusMap[item.status] ?? 'info'}>
                          {item.status}
                        </StatusIndicator>
                      ),
                    },
                    {
                      id: 'description',
                      header: 'Description',
                      content: (item) => item.description,
                    },
                    {
                      id: 'actions',
                      content: (item) => (
                        <Button onClick={() => navigate(`/games/${item.id}`)}>Enter lobby</Button>
                      ),
                    },
                  ],
                }}
                cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }, { minWidth: 900, cards: 3 }]}
                items={games}
                loadingText="Loading games"
                trackBy="id"
                empty={
                  <Box textAlign="center" color="text-body-secondary">
                    No games yet. Submit a new mini game PR to populate the list.
                  </Box>
                }
              />
            </Container>

            <Container id="creators" header={<Header variant="h2">Creator portal</Header>}>
              <SpaceBetween size="l">
                <Box>
                  1k2p is a rotating hub. Drop in a new game via PR, follow the starter template, and we
                  will surface it on the cloudspace deck.
                </Box>
                <ColumnLayout columns={3} variant="text-grid">
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Step 1
                    </Box>
                    <Box>Clone the base mini game template.</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Step 2
                    </Box>
                    <Box>Wire up matchmaking and session hooks.</Box>
                  </SpaceBetween>
                  <SpaceBetween size="xs">
                    <Box variant="small" color="text-body-secondary">
                      Step 3
                    </Box>
                    <Box>Open a PR with demo footage.</Box>
                  </SpaceBetween>
                </ColumnLayout>
                <Button variant="primary">Read the contribution guide</Button>
              </SpaceBetween>
            </Container>

            <Container id="roadmap" header={<Header variant="h2">Roadmap</Header>}>
              <SpaceBetween size="s">
                <Box variant="h3">Next in the sky</Box>
                <Box component="ul" padding={{ left: 'l' }}>
                  <li>Seasonal cloudspace skins</li>
                  <li>Match replay clips</li>
                  <li>Creator spotlight banners</li>
                  <li>Weekly duel ladders</li>
                </Box>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      toolsHide
    />
  )
}

function GamePage({ navigation, navigationOpen, onNavigationChange }: PageProps) {
  const navigate = useNavigate()
  const { gameId } = useParams()
  const game = games.find((item) => item.id === gameId)
  const loader = gameId ? getGameLoader(gameId) : undefined
  const GameComponent = useMemo(() => (loader ? lazy(loader) : null), [loader])

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
              <Header variant="h1">{game ? game.title : 'Game not found'}</Header>
              <SpaceBetween size="m" direction="horizontal">
                <Button onClick={() => navigate('/')}>Back to hub</Button>
                {game ? <Button variant="primary">Start game</Button> : null}
              </SpaceBetween>
            </SpaceBetween>
          }
        >
          <Container>
            {game && GameComponent ? (
              <Suspense
                fallback={
                  <StatusIndicator type="loading">Loading game</StatusIndicator>
                }
              >
                <GameComponent />
              </Suspense>
            ) : (
              <Box color="text-body-secondary">
                This game does not exist yet or is missing an entrypoint at{' '}
                <code>src/games/{gameId}/index.tsx</code>.
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

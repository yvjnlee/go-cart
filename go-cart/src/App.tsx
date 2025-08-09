import { useState } from 'react'
import { Feed } from './components/Feed'
import { ShoppingRequestPage } from './components/ShoppingRequestPage'
import { OverlayNav } from './components/OverlayNav'

type AppView = 'feed' | 'shoppingRequests'

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('feed')

  const renderCurrentView = () => {
    switch (currentView) {
      case 'shoppingRequests':
        return <ShoppingRequestPage onBack={() => setCurrentView('feed')} />
      case 'feed':
      default:
        return <Feed />
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-black">
      <OverlayNav current={currentView} onNavigate={setCurrentView} />
      <div className="absolute inset-0">{renderCurrentView()}</div>
    </div>
  )
}

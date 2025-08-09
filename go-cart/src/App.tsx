import { useState } from 'react'
import { Feed } from './components/Feed'
import { ShoppingRequestPage } from './components/ShoppingRequestPage'
import { OverlayNav } from './components/OverlayNav'

type AppView = 'feed' | 'shoppingRequests'

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('feed')

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-black">
      <OverlayNav current={currentView} onNavigate={setCurrentView} />
      <div className="absolute inset-0">
        <div className={currentView === 'feed' ? 'h-full' : 'hidden'}>
          <Feed />
        </div>
        <div className={currentView === 'shoppingRequests' ? 'h-full' : 'hidden'}>
          <ShoppingRequestPage onBack={() => setCurrentView('feed')} />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import RequestFeed from './components/RequestFeed'
import { NavBar } from './components/NavBar'
import PostComposer from './components/PostComposer'

type AppView = 'feed' | 'shoppingRequests'

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('feed')

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-black">
      <NavBar current={currentView} onNavigate={setCurrentView} />
      <div className="absolute inset-0">
        <div className={currentView === 'feed' ? 'h-full' : 'hidden'}>
          <RequestFeed />
        </div>
        <div className={currentView === 'shoppingRequests' ? 'h-full' : 'hidden'}>
          <PostComposer />
        </div>
      </div>
    </div>
  )
}

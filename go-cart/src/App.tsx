 
import {Requester} from './components/Requester'

export function App() {
  

  return (
    <div className="pt-12 px-4 pb-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-center">New Request</h1>
        <p className="text-sm text-gray-600 text-center">
          Tell others what you want and get recommendations.
        </p>
      </div>

      <Requester />
    </div>
  )
}

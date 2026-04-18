import { GalleryProvider } from './GalleryContext'
import GalleryArc from './GalleryArc'
import './App.css'

export default function App() {
  return (
    <GalleryProvider>
      <div className="app-root">
        <header className="app-header">
          <div className="app-logo">
            <div className="app-logo-c">C</div>
            <span className="app-logo-name">CALENROSE</span>
          </div>
          <span className="app-tagline">gallery arc</span>
        </header>
        <main className="app-main">
          <GalleryArc />
        </main>
      </div>
    </GalleryProvider>
  )
}

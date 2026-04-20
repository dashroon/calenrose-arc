import { GalleryProvider } from './GalleryContext'
import GalleryArc from './GalleryArc'
import './App.css'

export default function App() {
  return (
    <GalleryProvider>
      <div className="app-root">
        <header className="app-header">
          <div className="app-logo">
            <div className="app-logo-mark">C</div>
            <span className="app-logo-name">ARC</span>
            <span className="app-logo-by">by CALENROSE</span>
          </div>
        </header>
        <main className="app-main">
          <GalleryArc />
        </main>
      </div>
    </GalleryProvider>
  )
}

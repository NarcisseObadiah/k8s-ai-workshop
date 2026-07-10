import { ChatBox } from "./components/ChatBox";

function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="navigation">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              CA
            </div>

            <div>
              <strong>CloudAssist AI</strong>
              <span>Google Cloud Kubernetes Workshop</span>
            </div>
          </div>

          <div className="status-badge">
            <span className="status-dot" />
            Backend connected
          </div>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Cloud-native AI demonstration · Version 2</p>

          <h1>
            Build and operate a trustworthy AI application on Kubernetes.
          </h1>

          <p className="hero-description">
            This workshop application combines React, FastAPI, Gemini and
            Google Kubernetes Engine in one browser-based learning experience.
          </p>

          <div className="technology-list">
            <span>React</span>
            <span>FastAPI</span>
            <span>Gemini</span>
            <span>GKE</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <ChatBox />
      </main>

      <footer>
        CloudAssist AI · Built for the Google Cloud Kubernetes workshop
      </footer>
    </div>
  );
}

export default App;

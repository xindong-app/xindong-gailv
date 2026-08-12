import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch() {
    // Deliberately do not log the error object: user selections can be sensitive.
  }

  private recover = () => {
    this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-state" id="main-content">
        <div className="fatal-card" role="alert">
          <span className="eyebrow">可恢复错误</span>
          <h1>刚才那一局卡住了</h1>
          <p>你的筛选没有被上传。可以先重试；若仍失败，重新载入会恢复本标签页的非敏感安全草稿。</p>
          <div className="button-row">
            <button className="button button-primary" type="button" onClick={this.recover}>
              重试这一局
            </button>
            <button className="button button-secondary" type="button" onClick={() => window.location.reload()}>
              重新载入
            </button>
          </div>
        </div>
      </main>
    )
  }
}

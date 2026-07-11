import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = {
    error: null
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failure:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message || 'The application hit an unexpected render error.'}</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="module-error">
          <strong>Module error</strong>
          <code>{this.state.error.message}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

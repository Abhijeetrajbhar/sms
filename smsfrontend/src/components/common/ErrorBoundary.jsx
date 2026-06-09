import { Component } from 'react';
import Button from '../ui/Button.jsx';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application render failure', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-on-surface">
        <section className="w-full max-w-lg rounded-[24px] border border-outline-variant/50 bg-surface-container-lowest p-6 text-center shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase text-error">Something went wrong</p>
          <h1 className="mt-3 text-2xl font-bold">This page could not be displayed.</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">Your data is safe. Reload the page to restore the application.</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>Reload Application</Button>
        </section>
      </main>
    );
  }
}

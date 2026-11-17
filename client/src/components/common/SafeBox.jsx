import { Component } from 'react';

// If something inside crashes (e.g. 3D on an old graphics card), show the fallback instead of breaking the page
export default class SafeBox extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

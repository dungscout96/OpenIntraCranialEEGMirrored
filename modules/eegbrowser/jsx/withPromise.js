import React, { Component } from 'react';

export const withPromise = (Wrapped, transforms = {}) => {
  return class WithPromise extends Component {
    constructor(props) {
      super(props);
      this.state = {
        resolved:  false,
        value: null
      };
      this.mounted = false;
      this.mountPromise = new Promise(resolve => { this.resolve = resolve; });
      this.mountPromise = this.mountPromise
        .then(() => props.runPromise())
        .then((value) => {
          if(this.mounted) {
            this.setState({ resolved: true, value });
          }
        });
    }
    componentWillReceiveProps(props) {
      if (this.mounted) {
        this.setState({ resolved: false });
      }
      props.runPromise().then((value) => {
        if (this.mounted) {
          this.setState({ resolved: true, value });
        }
      });
    }
    componentDidMount() {
      this.mounted = true;
      this.resolve();
    }
    componentWillUnmount() {
      this.mounted = false;
    }
    render() {
      const { resolved, value } = this.state;
      if (!resolved) {
        return (
          <div className="loading-screen">
            Loading...
          </div>
        );
      }
      let { resolved2Props } = transforms;
      if (!resolved2Props) {
        resolved2Props = resolved => ({ resolved });
      }
      const passedProps = Object.assign(resolved2Props(value), this.props);
      return <Wrapped {...passedProps} />;
    }
  }
}

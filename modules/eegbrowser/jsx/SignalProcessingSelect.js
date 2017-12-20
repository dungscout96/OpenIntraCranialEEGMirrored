import React, { Component } from 'react';

export class SignalProcessingSelect extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const optionElement = option => (
      <option key={option.key} value={option.key}>
        {option.label}
      </option>
    );
    return (
      <select
        className='signal-filter-dropdown'
        onChange={ (e) => { this.props.onChange(e.target.value); }}
        value={this.props.filter}
      >
        {this.props.filters.map(optionElement)}
      </select>
    );
  }
}

import React, { Component } from 'react';
import { withPromise } from './withPromise';
import { RegionSelect,  } from './RegionSelect';
import { MRIViewer } from './MRIViewer';
import { SignalSelectionFilter } from './SignalSelectionFilter';
import { SignalPlots } from './SignalPlots';
import { fetch } from './fetchWrapper';

import { getLeafRegions, instantiateRegions } from './EEGData';

export default class EEGBrowser extends Component {
  constructor(props) {
    super(props);
    const brain = props.brain;
    instantiateRegions(brain);
    this.state = {
      brain,
      selected: [],
      signalSelectFilters: [],
      hoveredRegions: [],
      expandMode: 1
    };
  }
  componentDidMount() {
    window.flexibility(document.documentElement);
  }
  render() {
    const leaves = getLeafRegions(this.state.brain);
    const selectRegions = (regions) => {
      const selected = this.state.selected
          .filter(r => !regions.includes(r))
          .concat(regions);
      this.setState({
        selected: leaves.filter(region => selected.includes(region))
      });
    };
    const unselectRegions = (regions) => {
      this.setState({
        selected: this.state.selected
          .filter(r => !regions.includes(r))
      });
    };
    const regionSelect = (
      <RegionSelect
        brain={this.state.brain}
        selected={this.state.selected}
        unselectRegions={unselectRegions}
        selectRegions={selectRegions}
        hoverRegions={(regions) => { this.setState({ hoveredRegions: regions }); }}
        onMouseLeave={() => { this.setState({ hoveredRegions: [] }); }}
      >
      </RegionSelect>
    );
    const mriView = (
      <MRIViewer
        regions={leaves}
        selected={this.state.selected}
        signalSelectFilters={this.state.signalSelectFilters}
        unselectRegions={unselectRegions}
        selectRegions={selectRegions}
        hoveredRegions={this.state.hoveredRegions}
        showMRI={this.state.expandMode >= 2}
      >
      </MRIViewer>
    );
    const expandBarLeft = this.state.expandMode <= 0 ? null : (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expandMode: Math.max(this.state.expandMode - 1, 0) })}
      >
        <span className="expand-bar-icon">{'<'}</span>
      </div>
    );
    const expandBarRight = this.state.expandMode >= 2 ? null : (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expandMode: Math.min(this.state.expandMode + 1, 2) })}
      >
        <span className="expand-bar-icon">{'>'}</span>
      </div>
    );
    return (
      <div className="eeg-browser">
        <div className="eeg-browser-row">
          <SignalSelectionFilter
            signalSelectFilters={this.state.signalSelectFilters}
            selectedRegions={this.state.selected}
            onRemoveRegion={region => unselectRegions([region])}
            unselectRegions={unselectRegions}
            setFilters={signalSelectFilters => this.setState({ signalSelectFilters })}
            expandMode={this.state.expandMode}
            setExpandMode={expandMode => this.setState({ expandMode })}
          >
          </SignalSelectionFilter>
        </div>
        <div className="eeg-browser-row">
          {this.state.expandMode > 0 ? regionSelect : null}
          {mriView}
          <div className="expand-bars">
            {expandBarLeft}
            {expandBarRight}
          </div>
          <SignalPlots
            selected={this.state.selected}
            signalSelectFilters={this.state.signalSelectFilters}
          >
          </SignalPlots>
        </div>
      </div>
    );
  }
}

const PromisedEEGBrowser = withPromise(EEGBrowser, {
  resolved2Props: res => ({
    brain: {
      type: 'Inner',
      label: 'Brain',
      value: res
    }
  })
});

class App extends Component {
  constructor(props) {
    super(props);
    this.fetch = fetch(`${window.loris.BaseURL}/${window.loris.TestName}/ajax/GetMeta.php`, {
      method: 'GET',
      credentials: 'include'
    })
    .then(res => res.json());
  }
  render() {
    return <PromisedEEGBrowser runPromise={() => this.fetch} />;
  }
}

window.App = React.createFactory(App);

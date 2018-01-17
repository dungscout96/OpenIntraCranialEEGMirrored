import React, { Component } from 'react';
import { withPromise } from './withPromise';
import { RegionSelect,  } from './RegionSelect';
import { MRIViewer } from './MRIViewer';
import { SignalSelectionFilter } from './SignalSelectionFilter';
import { SignalPlots } from './SignalPlots';
import { fetch } from './fetch';

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
      expanded: 1
    };
  }
  render() {
    const selectRegions = (regions) => {
      this.setState({
        selected: this.state.selected
          .filter(r => !regions.includes(r))
          .concat(regions)
      });
    };
    const unselectRegions = (regions) => {
      this.setState({
        selected: this.state.selected
          .filter(r => !regions.includes(r))
      });
    };
    const expandBarLeft = (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expanded: Math.max(this.state.expanded - 1, 0) })}
      >
        <span className="expand-bar-icon">{'<'}</span>
      </div>
    );
    const expandBarRight = (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expanded: Math.min(this.state.expanded + 1, 2) })}
      >
        <span className="expand-bar-icon">{'>'}</span>
      </div>
    );
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
    const leaves = getLeafRegions(this.state.brain);
    const mriView = (
      <MRIViewer
        regions={leaves}
        selected={this.state.selected}
        signalSelectFilters={this.state.signalSelectFilters}
        hoveredRegions={this.state.hoveredRegions}
        showMRI={this.state.expanded >= 2}
      >
      </MRIViewer>
    );
    return (
      <div className="eeg-browser">
        <div className="eeg-browser-row">
          <SignalSelectionFilter
            signalSelectFilters={this.state.signalSelectFilters}
            selectedRegions={this.state.selected}
            onRemoveRegion={region => unselectRegions([region])}
            setFilters={signalSelectFilters => this.setState({ signalSelectFilters })}
          >
          </SignalSelectionFilter>
        </div>
        <div className="eeg-browser-row">
          {this.state.expanded > 0 ? regionSelect : null}
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

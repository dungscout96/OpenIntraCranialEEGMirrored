import React, { Component } from 'react';
import { withPromise } from './withPromise';
import { RegionSelect,  } from './RegionSelect';
import { MRIViewer } from './MRIViewer';
import { SignalSelectionFilter } from './SignalSelectionFilter';
import { SignalPlots } from './SignalPlots';

import { getLeafRegions, instantiateRegions } from './EEGData';

export default class EEGBrowser extends Component {
  constructor(props) {
    super(props);
    const brain = props.brain;
    instantiateRegions(brain);
    this.state = {
      brain,
      selected: [brain.value[0].value[0].value[0]],
      hoveredRegions: [],
      expanded: false
    };
  }
  render() {
    const unselectRegion = (region) => {
      this.setState({
        selected: this.state.selected
          .filter(r => r !== region) // remove all regions equal to the unselected.
      });
    };
    const selectRegion = (region) => {
      this.setState({
        selected: this.state.selected
          .filter(r => r !== region) // remove refferentially identical duplicates.
          .concat([region]) // select the region
      });
    };
    const expandBar = (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expanded: !this.state.expanded })}
      >
        <span className="expand-bar-icon">{this.state.expanded ? '>' : '<'}</span>
      </div>
    );
    const regionSelect = (
      <RegionSelect
        brain={this.state.brain}
        selected={this.state.selected}
        unselectRegion={unselectRegion}
        selectRegion={selectRegion}
        hoverRegions={(regions) => { this.setState({ hoveredRegions: regions }); }}
        onMouseLeave={() => { this.setState({ hoveredRegions: [] }); }}
      >
      </RegionSelect>
    );
    const leaves = getLeafRegions(this.state.brain);
    const mriView = ('' /*
      <MRIViewer
        regions={leaves}
        selected={this.state.selected}
        hoveredRegions={this.state.hoveredRegions}
        showMRI={!this.state.expanded}
      >
      </MRIViewer>
    */);
    return (
      <div className="eeg-browser">
        <div className="eeg-browser-row">
          <SignalSelectionFilter
            selectedRegions={this.state.selected}
            onRemoveRegion={unselectRegion}
          >
          </SignalSelectionFilter>
        </div>
        <div className="eeg-browser-row">
          {this.state.expanded ? null : regionSelect}
          {mriView}
          {expandBar}
          <SignalPlots
            selected={this.state.selected}
          >
          </SignalPlots>
        </div>
      </div>
    );
  }
}

const PromisedEEGBrowser = withPromise(EEGBrowser, {
  resolved2Props: brain => ({
    brain: {
      type: 'Inner',
      label: 'Brain',
      value: brain
    }
  })
});

class App extends Component {
  constructor(props) {
    super(props);
    this.fetch = fetch(`${loris.BaseURL}/${loris.TestName}/ajax/GetMeta.php`, {
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

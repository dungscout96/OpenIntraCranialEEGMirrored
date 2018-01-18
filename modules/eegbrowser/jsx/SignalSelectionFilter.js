import React, { Component } from 'react';
import Panel from '../../../jsx/Panel';
import { filterChannels } from './EEGData';

/* eslint-disable react/jsx-no-undef */

const ZIP_URL = `${window.loris.BaseURL}/${window.loris.TestName}/ajax/GetChannelZip.php`;

export class SignalSelectionFilter extends Component {
  constructor(props) {
    super(props);
    this.state = { showFilters: false };
  }
  render() {
    // BEGIN TO REMOVE
    const addTag = (key, value, keyLabel, valueLabel) => {
      const filter = { key, value, keyLabel, valueLabel };
      const signalSelectFilters = this.props.signalSelectFilters
        .filter(f => !(f.keyLabel === keyLabel && f.valueLabel === valueLabel))
        .concat([filter]);
      this.props.setFilters(signalSelectFilters);
    };
    const removeFilterTag = filter => {
      const { keyLabel, valueLabel } = filter;
      const signalSelectFilters = this.props.signalSelectFilters
        .filter(f => !(f.keyLabel === keyLabel && f.valueLabel === valueLabel))
      this.props.setFilters(signalSelectFilters);
    };
    const dropdownProps = (userInputCallback, props) => {
      const onUserInput = (k, v) => userInputCallback(k, v, props.label, props.options[v]);
      return Object.assign({ onUserInput }, props);
    };
    const filterTagRemover = (filter) => (
      <span className='tag-remove-button' onClick={() => removeFilterTag(filter)}>x</span>
    );
    const filterTagElements = this.props.signalSelectFilters.map((filter, i) => (
      <span key={filter.valueLabel + String(i)} className="selection-filter-tag">
        {filter.keyLabel}: {filter.valueLabel} {filterTagRemover(filter)}
      </span>
    ));
    // END TO REMOVE
    const regionTagRemover = (region) => (
      <span className='tag-remove-button' onClick={() => this.props.onRemoveRegion(region)}>
        x
      </span>
    );
    const regionTagElements = this.props.selectedRegions.map((region) => (
      <span key={region.name} className="selection-filter-tag">
        {region.name} {regionTagRemover(region)}
      </span>
    ));
    const filterContainer = (
      <div className="selection-filter-tags">
        Region Tags: {regionTagElements}
      </div>
    );
    const getZipped = () => {
      const names = filterChannels(this.props.signalSelectFilters, this.props.selectedRegions)
        .map(c => c.metaData.name);
      if (names.length === 0) {
        return;
      }
      if (!window.confirm("Click OK and please wait")) {
        return;
      }
      const formdata = new FormData();
      formdata.set('channelnames', names.join(','));
      fetch(ZIP_URL, { credentials: 'include', method: 'POST', body: formdata })
        .then(() => fetch(ZIP_URL, { credentials: 'include' }))
        .then(res => res.blob())
        .then(buffer => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(buffer);
          a.download = 'ieegSignals.zip';
          a.click()
          URL.revokeObjectURL(a.href);
        });
    };
    const formElements = {
      electrodeType: dropdownProps(addTag, {
        type: 'select',
        name: 'electrodeType',
        label: 'Electrode Type',
        options: {
          'D': 'Dixi sEEG',
          'M': 'Custom-built MNI sEEG',
          'A': ' Ad-Tech depth',
          'G': 'Ad-Tech subdural grid/strip'
        }
      }),
      oneContactPerPatientPerRegion: dropdownProps(addTag, {
        type: 'select',
        name: 'oneCPPPR',
        value: this.state.oneContactPerPatientPerRegion,
        label: 'Show only one channel per patient',
        options: {
          true: 'Show one contact per patient per region'
        },
      })
    };
    return (
      <Panel title="Channel Selection Filters">
        <FormElement
          name="selectionFilters"
          columns={1}
          formElements={formElements}
        >
        </FormElement>
        <hr />
        <div style={{ display: 'inline-block', width: '155px' }} className="round-button">
          <a
            href={`${window.loris.BaseURL}/document_repository`}
            target="_blank"
          >
            Download Region Files
          </a>
        </div>
        <div
          style={{ display: 'inline-block', width: '240px' }}
          className={`round-button${this.props.selectedRegions.length === 0 ? ' disabled' : ''}`}
          onClick={getZipped}

        >
          Download Selected Raw Signals
        </div>
        <hr />
        <div
          style={{ width: '160px' }}
          className="round-button"
          onClick={() => { this.setState({ showFilters: !this.state.showFilters }) }}
        >
          {this.state.showFilters ? 'Hide' : 'Show'} selection filters
        </div>
        {this.state.showFilters && filterContainer}
      </Panel>
    );
  }
}

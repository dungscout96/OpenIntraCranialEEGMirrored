import React, { Component } from 'react';
import Panel from '../../../jsx/Panel';

export class SignalSelectionFilter extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
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
    const formElements = {
      center: dropdownProps(addTag, {
        type: 'select',
        name: 'center',
        label: 'Center',
        options: {
          'M': 'MNI',
          'N': 'CHUM',
          'G': 'CHUGA'
        },
      }),
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
      notRepeatedContacts: dropdownProps(addTag, {
        type: 'select',
        name: 'nonRepeated',
        value: this.state.notRepeatedContacts,
        label: 'Non-Repeated Contacts',
        options: {
          true: 'Show not repeated contacts'
        }
      }),
      oneContactPerPatientPerRegion: dropdownProps(addTag, {
        type: 'select',
        name: 'oneCPPPR',
        value: this.state.oneContactPerPatientPerRegion,
        label: 'One Contact Per Patient Per Region',
        options: {
          true: 'Show one contact per patient per region'
        },
      })
    };
    return (
      <Panel title="Channel Selection Filters">
        <FormElement
          name="selectionFilters"
          columns={2}
          formElements={formElements}
        >
        </FormElement>
        <div className="selection-filter-tags">
          Filter Tags: {filterTagElements}
        </div>
        <div className="selection-filter-tags">
          Region Tags: {regionTagElements}
        </div>
      </Panel>
    );
  }
}

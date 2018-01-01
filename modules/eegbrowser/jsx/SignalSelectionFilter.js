import React, { Component } from 'react';
import Panel from '../../../jsx/Panel';

export class SignalSelectionFilter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: {}
    };
  }
  render() {
    const addTag = (key, value, label, optionLabel) => {
      const { tags } = this.state;
      const newTag = { value, label, optionLabel };
      if (tags[key]) {
        if (!(tags[key].find(tag => tag.value === value))) {
          tags[key].push(newTag)
        }
      } else {
        tags[key] = [newTag];
      }
      this.setState({ tags });
    };
    const setDropdown = (k, v) => { this.setState({ [k]: v }); };
    const dropdownProps = (userInputCallback, props) => {
      const onUserInput = (k, v) => userInputCallback(k, v, props.label, props.options[v]);
      return Object.assign({ onUserInput }, props);
    };
    const removeTag = (tagKey, tag) => {
      const { tags } = this.state;
      if (tags[tagKey]) {
        tags[tagKey] = tags[tagKey].filter(t => t.value !== tag.value);
      }
      this.setState({ tags });
    };
    const tagRemover = (tagKey, tag) => (
      <span className='tag-remove-button' onClick={() => removeTag(tagKey, tag)}>x</span>
    );
    const tagElements = [];
    Object.keys(this.state.tags).forEach((key, i) => {
      const tags = this.state.tags[key];
      const tagElems = tags.map(tag => (
        <span key={tag.optionLabel + String(i)} className="selection-filter-tag">
          {tag.label}: {tag.optionLabel} {tagRemover(key, tag)}
        </span>
      ));
      tagElements.push(...tagElems);
    });
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
      notRepeatedContacts: dropdownProps(setDropdown, {
        type: 'select',
        name: 'notRepeatedContacts',
        value: this.state.notRepeatedContacts,
        label: 'Non-Repeated Contacts',
        options: {
          'nonrepeated': 'Show not repeated contacts'
        }
      }),
      oneContactPerPatientPerRegion: dropdownProps(setDropdown, {
        type: 'select',
        name: 'oneContactPerPatientPerRegion',
        value: this.state.oneContactPerPatientPerRegion,
        label: 'One Contact Per Patient Per Region',
        options: {
          'onepppr': 'Show one contact per patient per region'
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
          Filter Tags: {tagElements}
        </div>
        <div className="selection-filter-tags">
          Region Tags: {regionTagElements}
        </div>
      </Panel>
    );
  }
}

import React, { Component } from 'react';
import { getLeafRegions } from './EEGData';

export class RegionSelect extends Component {
  constructor(props) {
    super(props);
    this.defaultProps = {
      brain: {},
      selected: [],
    };
    this.state = {
      expanded: {},
    };
  }
  render() {
    const renderRegionElement = (region, selected, onclick) => {
      const c = region.colorCode;
      return (
        <li
          key={region.name}
          className={`region-select-item --leaf ${selected ? 'selected-region' : 'unselected-region'}`}
          onClick={() => onclick(region)}
          onMouseEnter={() => { this.props.hoverRegions([region]); }}
          onMouseLeave={this.props.onMouseLeave}
        >
          <div
            className="region-color-code"
            style={{ 'backgroundColor': `rgb(${c.r}, ${c.g}, ${c.b})` }}
          >
          </div>
          {region.label}
        </li>
      );
    };
    const renderRegionSelector = (region) => {
      if (this.props.selected.find(r => r === region)) {
        return renderRegionElement(region, true, r => this.props.unselectRegions([r]));
      }
      return renderRegionElement(region, false, r => this.props.selectRegions([r]));
    };
    const clickPage = node => {
      const { expanded } = this.state;
      expanded[node.label] = !expanded[node.label];
      this.setState({ expanded });
    };
    const renderInnerNode = (node) => {
        const regions = getLeafRegions(node);
        const contained = regions.map(r => this.props.selected.includes(r)).reduce((a, b) => a && (!!b), true);
        const onAllClick = (event) => {
          event.stopPropagation();
          if (contained) {
            this.props.unselectRegions(regions);
          } else {
            this.props.selectRegions(regions);
          }
        };
        const allButton = (
          <div
            className="round-button" style={{display: 'inline-block'}}
            onClick={onAllClick}
          >
            {contained ? 'deselect all' : 'select all'}
          </div>
        );
        return (
          <div key={node.label} className="region-select-item-container">
            <li
              className="region-select-item"
              onClick={() => clickPage(node)}
              onMouseEnter={() => { this.props.hoverRegions(regions); }}
              onMouseLeave={this.props.onMouseLeave}
            >
              <span className={`glyphicon${this.state.expanded[node.label] ? ' glyphicon-chevron-down' : ' glyphicon-chevron-right'}`}>
              </span>
              {node.label} {allButton}
            </li>
            <div>
              {this.state.expanded[node.label] ? node.value.map(renderRegionSelector) : null}
            </div>
          </div>
      );
    };
    const renderNode = (node) => {
      if (!node) {
        return null;
      }
      switch(node.type) {
        case 'Inner':
          return node.value.map(renderInnerNode);
        case 'Leaf':
          return node.value.map(renderRegionSelector);
        default:
          return null;
      }
    };
    const lobeKeys = Object.keys(this.state.expanded);
    const showCollapseAll = lobeKeys.length > 0 && lobeKeys.some(k => this.state.expanded[k]);
    return (
      <div className="region-select">
        <div
          style={{ marginTop: '0', marginBottom: '0', maxWidth: '100px', visibility: showCollapseAll ? 'visible' : 'hidden' }}
          className="round-button"
          onClick={() => this.setState({ expanded: {} })}
        >
          Collapse all
        </div>
        <ul className="region-select-list">
          {renderNode(this.props.brain)}
        </ul>
      </div>
    );
  }
}

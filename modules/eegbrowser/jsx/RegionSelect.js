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
      activePage: props.brain,
      pageStack: []
    };
  }
  render() {
    const clickPage = (node) => {
      const lastPage = this.state.activePage;
      const { pageStack } = this.state;
      pageStack.push(lastPage);
      this.setState({ activePage: node, pageStack });
    };
    const back = () => {
      const activePage = this.state.pageStack.pop();
      this.setState({
        activePage,
        pageStack: this.state.pageStack
      });
    };
    const renderRegionElement = (region, selected, onclick) => {
      const c = region.colorCode;
      return (
        <li
          key={region.name}
          className={`region-select-item ${selected ? 'selected-region' : 'unselected-region'}`}
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
        return renderRegionElement(region, true, this.props.unselectRegion);
      }
      return renderRegionElement(region, false, this.props.selectRegion);
    };
    const renderInnerNode = (node) => {
        const regions = getLeafRegions(node);
        return (
          <li
            key={node.label}
            className="region-select-item"
            onClick={() => clickPage(node)}
            onMouseEnter={() => { this.props.hoverRegions(regions); }}
            onMouseLeave={this.props.onMouseLeave}
          >
            {node.label}
          </li>
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
      }
      return null;
    };
    return (
      <div className="region-select">
        <div className="toolbar">
          <div className="toolbar-layer">
            <div className="toolbar-buttons">
              <div
                className={`round-button${this.state.pageStack.length === 0 ? ' disabled' : ''}`}
                onClick={back}
              >
                Back
              </div>
            </div>
          </div>
        </div>
        <ul className="region-select-list">
          {renderNode(this.state.activePage)}
        </ul>
      </div>
    );
  }
}

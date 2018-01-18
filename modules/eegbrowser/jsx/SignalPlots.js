import React, { Component } from 'react';
import { SignalPlot } from './SignalPlot';
import { SignalProcessingSelect } from './SignalProcessingSelect';
import { fetch } from './fetch';
import { filterChannels } from './EEGData';

/* eslint-disable no-undef, react/jsx-no-undef */

import { LOW_PASS_FILTERS, HIGH_PASS_FILTERS } from './Filters';

const ZOOM_AMOUNT = 1;
const INTERVAL_MOVE_AMOUNT = 1;
const PLOTS_PER_GROUP = 8;
const PLOT_HEIGHT = 90;
const Y_WIDTH = 60;

export class SignalPlots extends Component {
  constructor(props) {
    super(props);
    this.lastMouseX = null;
    this.drawn = [];
    this.state = {
      cursorT: null,
      group: 0,
      tBounds: { tmin: -0.1, tmax: 20 },
      baseYBounds: { ymin: -250, ymax: 250 },
      yBounds: {},
      filters: { low: 'none', hi: 'none' }
    };
  }
  componentWillReceiveProps(nextProps) {
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    const numChannels = filterChannels(nextProps.signalSelectFilters, nextProps.selected).length;
    const newGroup = minPlot > numChannels ? Math.floor(numChannels / PLOTS_PER_GROUP) : this.state.group;
    this.setState({ group : newGroup });
  }
  componentDidMount() {
    this.resizeUpdate = () => { this.forceUpdate(); };
    window.addEventListener('resize', this.resizeUpdate);
    // If user mouses up anywhere in the browser window stop translating time interval.
    window.addEventListener('mouseup', () => { this.lastMouseX = null; });
  }
  componentWillUnmount() {
    window.removeEveEventListener('resize', this.resizeUpdate);
  }
  generatePlotElements(channels, minPlot, maxPlot) {
    const plotElements = [];
    let index = 0;
    channels.forEach((channel) => {
      const {low, hi} = this.state.filters;
      channel.applyFilter(low, hi, () => this.forceUpdate());
      const axisProps = {
        drawXAxis: false,
        xAxisLabel: 'time (sec)',
        yAxisLabel: 'uV',
      };
      if (index === minPlot) {
        axisProps.drawXAxis = true;
        axisProps.xAxisOrientation = 'top';
        axisProps.xAxisLabelPos = null;
        axisProps.yAxisLabelPos = { x: -23, y: 10 };
      }
      if (index === maxPlot) {
        axisProps.drawXAxis = true;
        axisProps.xAxisOrientation = 'bottom';
        axisProps.xAxisLabelPos = { x: 5, y: 28 };
        axisProps.yAxisLabelPos = { x: -23, y: 7 };
      }
      if (index >= minPlot && index <= maxPlot) {
        const zoom = (leftClick, multiplier) => {
          if (leftClick) {
            if (!this.state.yBounds[channel.metaData.name]) {
              const { ymin, ymax } = this.state.baseYBounds;
              this.state.yBounds[channel.metaData.name] = { ymin, ymax };
            }
            let { ymin, ymax } = this.state.yBounds[channel.metaData.name];
            ymin *= multiplier;
            ymax *= multiplier;
            this.state.yBounds[channel.metaData.name] = { ymin, ymax };
            this.setState({ yBounds: this.state.yBounds });
          }
        };
        const { ymin, ymax } = this.state.yBounds[channel.metaData.name] || this.state.baseYBounds;
        plotElements.push(
          <SignalPlot
            key={`${channel.metaData.name}-${index}`}
            className='signal-plot-item'
            channel={channel}
            colorCode={channel.colorCode}
            height={PLOT_HEIGHT}
            yAxisWidth={Y_WIDTH}
            tBounds={this.state.tBounds}
            yBounds={{ ymin, ymax }}
            onPlus={(e) => { e.stopPropagation(); zoom(e.button === 0, 0.9); }}
            onMinus={(e) => { e.stopPropagation(); zoom(e.button === 0, 1.1); }}
            backgroundColor={index % 2 === 0 ? '#fff' : '#eee'}
            cursorT={this.state.cursorT}
            drawXAxis={axisProps.drawXAxis}
            xAxisOrientation={axisProps.xAxisOrientation}
            xAxisLabel={axisProps.xAxisLabel}
            xAxisLabelPos={axisProps.xAxisLabelPos}
            yAxisLabel={axisProps.yAxisLabel}
            yAxisLabelPos={axisProps.yAxisLabelPos}
          />
        );
      }
      index++;
    });
    return plotElements;
  }
  render() {
    const onWheel = (dy) => {
      const { tmin, tmax } = this.state.tBounds;
      if (tmax - tmin <= 0.5 && dy < 0) {
        return;
      }
      if (tmax - tmin >= 25 && dy > 0) {
        return;
      }
      this.setState({
        tBounds: {
          tmin: tmin - Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15,
          tmax: tmax + Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15
        }
      });
    };
    const onMouseMove = (shift, leftClick, x) => {
      if (!this.lastMouseX) {
        this.lastMouseX = x;
        return;
      }
      if (!this.container) {
        return;
      }
      const { width, left } = this.container.getBoundingClientRect();
      const { tmin, tmax } = this.state.tBounds;
      const dx = x - this.lastMouseX;
      this.lastMouseX = x;
      if (shift && leftClick) {
        let cappedDx = dx;
        if (tmin <= -10) {
          cappedDx = Math.min(dx, 0);
        }
        if (tmax >= 70) {
          cappedDx = Math.max(dx, 0);
        }
        this.setState({
          tBounds: {
            tmin: tmin - cappedDx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width,
            tmax: tmax - cappedDx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width
          }
        });
      }
      if (!shift && leftClick) {
        const tInv = d3.scale.linear()
                       .domain([Y_WIDTH, width - Y_WIDTH / 4])
                       .range([tmin, tmax]);
        if (x - left > Y_WIDTH) {
          this.setState({ cursorT: tInv(x - left) });
        }
      }
    };
    const selectLow = (value) => {
      this.setState({ filters: { low: value, hi: this.state.filters.hi } });
    };
    const selectHi = (value) => {
      this.setState({ filters: { low: this.state.filters.low, hi: value } });
    };
    const enabled = (text, incr) => (
      <div
        style={{ width: '145px' }}
        className="round-button"
        onClick={() => { this.setState({ group: this.state.group + incr }); }}
      >
        {text}
      </div>
    );
    const disabled = text => (
      <div style={{ width: '145px' }} className="round-button disabled">
        {text}
      </div>
    );
    const filtered = filterChannels(this.props.signalSelectFilters, this.props.selected);
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    let maxPlot = (PLOTS_PER_GROUP - 1) * (this.state.group + 1);
    let numChannels = filtered.length;
    const showNext = maxPlot < numChannels;
    const showPrev = this.state.group > 0;
    if (minPlot + PLOTS_PER_GROUP > numChannels) {
      maxPlot = Math.min(minPlot + PLOTS_PER_GROUP, numChannels) - 1;
    }
    const plotElements = this.generatePlotElements(filtered, minPlot, maxPlot);
    const showingPlots = (
      <div className="signal-plots-group-number">
        Showing plots: {minPlot + 1} to {maxPlot + 1} out of {numChannels}
      </div>
    );
    const noPlotsScreen = (
      <div className="no-plots-screen">
        <h4>Select a region or lobe to display signals.</h4>
        <h4>Change the time scale with Shift + mouse drag/scroll.</h4>
      </div>
    );
    const zoomAll = (leftClick, multiplier) => {
      if (leftClick) {
        let { ymin, ymax } = this.state.baseYBounds;
        ymin *= multiplier;
        ymax *= multiplier;
        Object.keys(this.state.yBounds).forEach(key => {
          let { ymin, ymax } = this.state.yBounds[key];
          ymin *= multiplier;
          ymax *= multiplier;
          this.state.yBounds[key] = { ymin , ymax };
        });
        this.setState({ baseYBounds: { ymin, ymax }, yBounds: this.state.yBounds });
      }
    };
    const updatePage = (leftClick, direction) => {
      if (leftClick) {
        let { tmin, tmax } = this.state.tBounds;
        const interval = Math.abs(tmax - tmin);
        tmin += interval * direction;
        tmax += interval * direction;
        this.setState({ tBounds: { tmin, tmax } });
      }
    };
    const updateTime = (leftClick, increment) => {
      if (leftClick) {
        let { tmin, tmax } = this.state.tBounds;
        tmin += increment;
        tmax += increment;
        this.setState({ tBounds: { tmin, tmax } });
      }
    };
    const timeControl = (
      <div className="toolbar-hor-group">
        <div
          className="round-button"
          onClick={e => { updatePage(e.button === 0, -1); }}
        >
          {'<<'} 1 Page
        </div>
        <div
          className="round-button"
          onClick={e => { updateTime(e.button === 0, -1); }}
        >
          {'<'} 1 sec
        </div>
        <div
          className="round-button"
          onClick={e => { updateTime(e.button === 0, +1); }}
        >
          1 sec {'>'}
        </div>
        <div
          className="round-button"
          onClick={e => { updatePage(e.button === 0, +1); }}
        >
         1 Page {'>>'}
        </div>
      </div>
    );
    return (
      <div className="signal-plots-container">
        <div className="toolbar">
          <div className="toolbar-layer">
            <div className="toolbar-hor-group">
              {showPrev ? enabled('Previous Channel', -1) : disabled('Previous Channels')}
              {showNext ? enabled('Next Channels', +1) : disabled('Next Channels')}
              {numChannels > 0 ? showingPlots : null}
            </div>
          </div>
          <div className="toolbar-layer">
            <div className="toolbar-hor-group">
              <div
                className="round-button"
                onClick={e => { zoomAll(e.button === 0, 1.1); }}
              >
                Zoom -
              </div>
              <div
                className="round-button"
                onClick={() => { this.setState({ yBounds: {}, baseYBounds: { ymin: -250, ymax: 250 } }); }}
              >
                Reset Gains
              </div>
              <div
                className="round-button"
                onClick={e => { zoomAll(e.button === 0, 0.9); }}
              >
                Zoom +
              </div>
            </div>
            <div className="signal-plots-filters">
              <SignalProcessingSelect filters={HIGH_PASS_FILTERS} filter={this.state.filters.hi} onChange={selectHi} />
              <SignalProcessingSelect filters={LOW_PASS_FILTERS} filter={this.state.filters.low} onChange={selectLow} />
            </div>
          </div>
          <div className="toolbar-layer">
            {plotElements.length === 0 ? null : timeControl}
          </div>
        </div>
        <div
          className="signal-plots"
          ref={(container) => { this.container = container; }}
          onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); onWheel(e.deltaY); } }}
          onMouseMove={(e) => { onMouseMove(e.shiftKey, e.buttons > 0 && e.button === 0, e.clientX); }}
          onMouseDown={(e) => { onMouseMove(e.shiftKey, e.buttons > 0 && e.button === 0, e.clientX); }}
        >
          {plotElements.length === 0 ? noPlotsScreen : plotElements}
        </div>
      </div>
    );
  }
}

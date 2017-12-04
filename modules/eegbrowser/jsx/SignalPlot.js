import React, { Component } from 'react';
import { FILTERS } from './Filters';

export class Channel {
  constructor(name, position, timeSamples, tmin = 0, tmax = 60) {
    this.name = name;
    this.tmin = tmin;
    this.tmax = tmax;
    this.domain = new Float32Array(timeSamples).fill(0);
    this.domain.forEach((_, i) => {
      const t = i / timeSamples;
      this.domain[i] = tmin * (1 - t) + tmax * t;
    });
    this.originalSignal = new Float32Array(timeSamples).fill(0);
    this.originalSignal.forEach((_, i) => {
      this.originalSignal[i] = 2.0 * Math.random() - 1.0;
    });
    this.position = position;
    this.hovered = false;
    this.signal = this.originalSignal;
    this.filters = {};
  }
  applyFilter(lowPassFilterName, highPassFilterName) {
    if (this.filters.low === lowPassFilterName && this.filters.hi === highPassFilterName) {
      return; // Don't apply filters more than once
    }
    const diffFilter = new differenceequationsignal1d.DifferenceEquationSignal1D();
    diffFilter.enableBackwardSecondPass
    const doFilterUpdate = (coefficients, input) => {
      if (coefficients) {
        diffFilter.setInput(input);
        diffFilter.setACoefficients(coefficients.a);
        diffFilter.setBCoefficients(coefficients.b);
        diffFilter.run() // eventually should be pixpipe's update()
        this.signal = diffFilter.getOutput();
        return;
      }
      this.signal = input;
    };
    doFilterUpdate(FILTERS[lowPassFilterName], this.originalSignal);
    doFilterUpdate(FILTERS[highPassFilterName], this.signal);
  }
}

const drawSignalLine = (g, tScale, yScale, channel, indexes) => {
  const signalLine = d3.svg.line()
                       .x(i => tScale(channel.domain[i] || 0))
                       .y(i => yScale(channel.signal[i] || 0));
  return g.append('path')
          .attr('fill', 'none')
          .attr('stroke', 'steelblue')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('stroke-width', 1.5)
          .attr('d', signalLine(indexes));
};

const drawSecondTicks = (g, height, tScale, tmin, tmax) => {
  const ctmin = Math.ceil(tmin);
  const ctmax = Math.ceil(tmax);
  const secondTicks = g.append('g');
  for (let t = ctmin; t < ctmax; t++) {
    secondTicks.append('line')
               .attr({x1: tScale(t), y1: 0})
               .attr({x2: tScale(t), y2: height})
               .attr('stroke-width', 1)
               .attr('stroke', '#999');
  }
  return secondTicks;
};

const drawCursorTick = (g, height, x) => {
  return g.append('line')
          .attr({ x1: x, y1: 0 })
          .attr({ x2: x, y2: height })
          .attr('stroke-width', 1)
          .attr('stroke', '#900');
}

const drawZeroLine = (g, tScale, yScale, tmin, tmax) => {
  return g.append('line')
          .attr({ x1: tScale(tmin), y1: yScale(0)})
          .attr({ x2: tScale(tmax), y2: yScale(0)})
          .attr('stroke-width', 1)
          .attr('stroke', '#555');
};

export class SignalPlot extends Component {
  constructor(props) {
    super(props);
    this.svg = null;
  }
  getDimensions() {
    const { width, height } = this.props;
    if (!width) {
      return { width: this.svg.getBoundingClientRect().width - this.props.yAxisWidth || 60, height };
    }
    return { width, height }
  }
  getD3Scales() {
    const { channel } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { ymin, ymax } = this.props.yBounds;
    const { width, height } = this.getDimensions();
    const t = d3.scale.linear()
                .domain([tmin, tmax])
                .rangeRound([0, width]);
    const tInv = d3.scale.linear()
                .domain([0, width])
                .range([tmin, tmax]);
    const y = d3.scale.linear()
                .domain([ymin, ymax])
                .rangeRound([height, 0]);
    const yInv = d3.scale.linear()
                .domain([0, height])
                .range([ymax, ymin]);
    return { t, y, tInv, yInv };
  }
  getD3Axes() {
    const {t, y, yInv} = this.getD3Scales();
    const xAxis = d3.svg.axis()
                    .scale(t)
                    .ticks(10)
                    .outerTickSize(0)
                    .orient('bottom');
    const upperYLabelVal = Math.round(yInv(this.props.height * (3 / 4)) * 10) / 10;
    const lowerYLabelVal = Math.round(yInv(this.props.height * (1 / 4)) * 10) / 10;
    const yAxis = d3.svg.axis()
                    .scale(y)
                    .ticks(0)
                    .tickValues([lowerYLabelVal, 0, upperYLabelVal])
                    .outerTickSize(0)
                    .orient('left');
    return { xAxis, yAxis };
  }
  getSignalIndexes() {
    const { channel, cursorX } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { t } = this.getD3Scales();
    let cursTime = 'NA';
    let cursVal = 'NA';
    if (cursorX) {
      cursTime = Math.round(cursorX * 100) / 100;
    }
    const ts = channel.domain;
    // Only filter out array indices where time values in the domain are in bounds.
    const indexFilter = (indexes, t, i) => {
      if (t >= tmin && t <= tmax) {
        indexes.push(i)
        if (i < ts.length - 1 && cursTime >= t && cursTime < ts[i + 1]) {
          cursVal = channel.signal[i];
          cursVal = Math.round(cursVal * 100) / 100
        }
      }
      return indexes;
    }
    const indexes = ts.reduce(indexFilter, []);
    return { indexes, cursTime, cursVal }
  }
  componentDidMount() {
    this.renderPlot();
  }
  componentDidUpdate() {
    this.updatePlot();
  }
  drawYScaleButton(parent, symbol, x, y) {
    const g = parent.append('g').attr('transform', `translate(${x}, ${y})`);
    g.attr('class', 'plot-scale-button').attr('cursor', 'pointer');
    g.append('rect')
     .attr('x', -2)
     .attr('y', -10)
     .attr('width', '12px')
     .attr('height', '12px')
     .attr('fill', '#aaa')
    g.append('text')
     .attr('x', 4)
     .attr('y', 0)
     .attr('font-weight', 'bold')
     .attr('fill', '#000')
     .attr('text-anchor', 'middle')
     .text(symbol);
    return g;
  };
  drawXAxes(svg, parent, height) {
    let xAx = null;
    const { t, y } = this.getD3Scales();
    const { xAxis } = this.getD3Axes();
    const { xAxisLabel, yAxisLabel } = this.props;
    { // Position x axis
      xAx = parent.append('g').call(xAxis);
      svg.attr('height', height)
         .style('min-height', height);
      if (this.props.xAxisOrientation === 'top') {
        xAx.attr('transform', `translate(${0}, ${0})`);
      }
      if (this.props.xAxisOrientation === 'bottom') {
        xAx.attr('transform', `translate(${0}, ${height})`);
        d3.select(this.svg).attr('height', height + 50)
                           .style('min-height', height + 50);
      }
    }
    { // position x axis label
      if (xAxisLabel && this.props.xAxisLabelPos) {
        const { x, y } = this.props.xAxisLabelPos;
        xAx.append('text')
           .attr('x', x)
           .attr('y', y)
           .text(xAxisLabel);
      }
    }
    { // position y axis label
      if (yAxisLabel && this.props.yAxisLabelPos) {
        const { x, y } = this.props.yAxisLabelPos;
        xAx.append('text')
           .attr('x', x)
           .attr('y', y)
           .text(yAxisLabel);
      }
    }
    return xAx;
  }
  updatePlot() {
    const { t, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes();
    const { width } = this.getDimensions();
    const { tmin, tmax } = this.props.tBounds;
    const {
      svg,
      g,
      rect,
      xAx,
      yAx,
      height,
      channel,
      channelName,
      sigLine,
      cursorTick,
      secondTicks,
      zeroLine,
      btnPlus,
      btnMinus
    } = this.plot;
    rect.attr('width', width);
    zeroLine.remove();
    this.plot.zeroLine = drawZeroLine(g, t, y, tmin, tmax);
    const { indexes, cursTime, cursVal } = this.getSignalIndexes();
    channelName.text(`${channel.name} | ${this.props.xAxisLabel}: ${cursTime} | value (${this.props.yAxisLabel}): ${cursVal}`);
    if (cursorTick) {
      cursorTick.remove();
    }
    if (this.props.cursorX) {
      this.plot.cursorTick = drawCursorTick(g, height, t(this.props.cursorX));
    }
    if (xAx) {
      xAx.remove();
      this.plot.xAx = this.drawXAxes(svg, g, height);
    }
    yAx.call(yAxis);
    sigLine.remove();
    this.plot.sigLine = drawSignalLine(g, t, y, channel, indexes);
    secondTicks.remove();
    this.plot.secondTicks = drawSecondTicks(g, height, t, tmin, tmax);
    if (btnPlus) { btnPlus.remove(); }
    if (btnMinus) { btnMinus.remove(); }
    if (this.props.onPlus) {
      this.plot.btnPlus = this.drawYScaleButton(g, '+', width - 25, 20);
      this.plot.btnPlus.on('mousedown', () => this.props.onPlus(d3.event));
    }
    if (this.props.onMinus) {
      this.plot.btnMinus = this.drawYScaleButton(g, '-', width - 25, height - 10);
      this.plot.btnMinus.on('mousedown', () => this.props.onMinus(d3.event));
    }
  }
  renderPlot() {
    const { channel, yAxisWidth } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { t, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes();
    const { width, height } = this.getDimensions();
    // Create new plot shapes in d3
    const svg = d3.select(this.svg)
                  .attr('height', height)
                  .style('min-height', height);
    const g = svg.append('g')
                 .attr('transform', `translate(${yAxisWidth || 60}, ${0})`)
                 .attr('width', width);
    const rect = g.append('rect')
                  .attr('width', width);
    const yAx = g.append('g')
                 .call(yAxis);
    const c = this.props.colorCode;
    const regionColorCode = svg.append('line')
                               .attr({ x1: 5, y1: 0 })
                               .attr({ x2: 5, y2: height })
                               .attr('stroke-width', 4)
                               .attr('stroke', `rgba(${c.r}, ${c.g}, ${c.b}, 1.0)`);
    const channelName = g.append('text')
                       .attr('x', 5)
                       .attr('y', height - 6)
                       .attr('font-size', 13)
    rect.attr('height', height);
    if (this.props.backgroundColor) {
      rect.attr('fill', this.props.backgroundColor);
    }
    const { indexes, cursTime, cursVal } = this.getSignalIndexes();
    channelName.text(`${channel.name} | ${this.props.xAxisLabel}: ${cursTime} | value (${this.props.yAxisLabel}): ${cursVal}`);
    const sigLine = drawSignalLine(g, t, y, channel, indexes);
    let cursorTick = null;
    if (this.props.cursorX) {
      cursorTick = drawCursorTick(g, height, t(this.props.cursorX));
    }
    const secondTicks = drawSecondTicks(g, height, t, tmin, tmax);
    const zeroLine = drawZeroLine(g, t, y, tmin, tmax);
    let xAx = null;
    if (this.props.drawXAxis) {
      xAx = this.drawXAxes(svg, g, height);
    }
    let btnPlus;
    if (this.props.onPlus) {
      btnPlus = this.drawYScaleButton(g, '+', width - 25, 20);
      btnPlus.on('mousedown', () => this.props.onPlus(d3.event));
    }
    let btnMinus;
    if (this.props.onMinus) {
      btnMinus = this.drawYScaleButton(g, '-', width - 25, height - 10);
      btnMinus.on('mousedown', () => this.props.onMinus(d3.event));
    }
    this.plot = {
      svg,
      g,
      rect,
      xAx,
      yAx,
      height,
      regionColorCode,
      channel,
      channelName,
      sigLine,
      cursorTick,
      secondTicks,
      zeroLine,
      btnPlus,
      btnMinus
    };
  }
  render() {
    return (
      <svg
        className="signal-plot-item"
        ref={(svg) => { this.svg = svg; }}
      >
      </svg>
    );
  }
}

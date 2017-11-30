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

const drawSignalLine = (g, xScale, yScale, channel, indexes) => {
  const signalLine = d3.svg.line()
                       .x(i => xScale(channel.domain[i] || 0))
                       .y(i => yScale(channel.signal[i] || 0));
  return g.append('path')
          .attr('fill', 'none')
          .attr('stroke', 'steelblue')
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('stroke-width', 1.5)
          .attr('d', signalLine(indexes));
};

const drawSecondTicks = (g, height, xScale, tmin, tmax) => {
  const ctmin = Math.ceil(tmin);
  const ctmax = Math.ceil(tmax);
  const secondTicks = g.append('g');
  for (let t = ctmin; t < ctmax; t++) {
    secondTicks.append('line')
               .attr({x1: xScale(t), y1: 0})
               .attr({x2: xScale(t), y2: height})
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

const drawZeroLine = (g, xScale, yScale, tmin, tmax) => {
  return g.append('line')
          .attr({ x1: xScale(tmin), y1: yScale(0)})
          .attr({ x2: xScale(tmax), y2: yScale(0)})
          .attr('stroke-width', 1)
          .attr('stroke', '#555');
};

export class SignalPlot extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yBounds: { ymin: -2.1, ymax: 2.1 }
    };
    this.svg = null;
  }
  getDimensions() {
    const { width, height } = this.props;
    if (!width) {
      return { width: this.svg.getBoundingClientRect().width - 30, height };
    }
    return { width, height }
  }
  getD3Scales() {
    const { channel } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { ymin, ymax } = this.state.yBounds;
    const { width, height } = this.getDimensions();
    const x = d3.scale.linear()
                .domain([tmin, tmax])
                .rangeRound([0, width]);
    const xInv = d3.scale.linear()
                   .domain([0, width])
                   .range([tmin, tmax]);
    const y = d3.scale.linear()
                .domain([ymin, ymax])
                .rangeRound([height, 0]);
    return { x, xInv, y };
  }
  getD3Axes(xScale, yScale) {
    const xAxis = d3.svg.axis()
                    .scale(xScale)
                    .ticks(10)
                    .outerTickSize(0)
                    .orient('bottom');
    const yAxis = d3.svg.axis()
                    .scale(yScale)
                    .ticks(0)
                    .tickValues([-1, 0, 1])
                    .outerTickSize(0)
                    .orient('left');
    return { xAxis, yAxis };
  }
  getSignalIndexes() {
    const { channel, cursorX } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { x, xInv } = this.getD3Scales();
    let cursIndex = null;
    let cursTime = 'NA';
    let cursVal = 'NA';
    if (cursorX) {
      cursTime = Math.round(xInv(cursorX) * 100) / 100;
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
  drawYScaleButton(parent, symbol, multiplier, x, y) {
    const g = parent.append('g').attr('transform', `translate(${x}, ${y})`);
    g.attr('class', 'plot-scale-button').attr('cursor', 'pointer');
    g.append('rect')
     .attr('x', -3)
     .attr('y', -11)
     .attr('width', '14px')
     .attr('height', '14px')
     .attr('fill', '#aaa')
    g.append('text')
     .attr('x', 0)
     .attr('y', 0)
     .attr('font-weight', 'bold')
     .attr('fill', '#000')
     .text(symbol);
    g.on('mousedown', () => {
      d3.event.stopPropagation();
      if (d3.event.button === 0) {
        let { ymin, ymax } = this.state.yBounds;
        ymin *= multiplier;
        ymax *= multiplier;
        this.setState({ yBounds: { ymin, ymax } });
      }
    });
    return g;
  };
  drawXAxes(svg, parent, height) {
    let xAx = null;
    const { x, y } = this.getD3Scales();
    const { xAxis } = this.getD3Axes(x, y);
    const { xAxisLabel, yAxisLabel } = this.props;
    { // Position x axis
      xAx = parent.append('g').call(xAxis);
      svg.attr('height', height);
      if (this.props.xAxisOrientation === 'top') {
        xAx.attr('transform', `translate(${0}, ${0})`);
      }
      if (this.props.xAxisOrientation === 'bottom') {
        xAx.attr('transform', `translate(${0}, ${height})`);
        d3.select(this.svg).attr('height', height + 50);
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
    const { x, xInv, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes(x, y);
    const { tmin, tmax } = this.props.tBounds;
    const {
      svg,
      g,
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
    const { indexes, cursTime, cursVal } = this.getSignalIndexes();
    channelName.text(`${channel.name} | ${this.props.xAxisLabel}: ${cursTime} | value (${this.props.yAxisLabel}): ${cursVal}`);
    if (cursorTick) {
      cursorTick.remove();
    }
    if (this.props.cursorX) {
      this.plot.cursorTick = drawCursorTick(g, height, this.props.cursorX);
    }
    if (xAx) {
      xAx.remove();
      this.plot.xAx = this.drawXAxes(svg, g, height);
    }
    yAx.call(yAxis);
    sigLine.remove();
    this.plot.sigLine = drawSignalLine(g, x, y, channel, indexes);
    secondTicks.remove();
    this.plot.secondTicks = drawSecondTicks(g, height, x, tmin, tmax);
    g.node().removeChild(btnPlus.node())
    g.node().appendChild(btnPlus.node());
    g.node().removeChild(btnMinus.node())
    g.node().appendChild(btnMinus.node());
  }
  renderPlot() {
    const { channel } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { x, xInv, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes(x, y);
    const { width, height } = this.getDimensions();
    // Create new plot shapes in d3
    const svg = d3.select(this.svg)
                  .attr('height', height);
    const g = svg.append('g')
                 .attr('transform', `translate(${30}, ${0})`)
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
    const sigLine = drawSignalLine(g, x, y, channel, indexes);
    let cursorTick = null;
    if (this.props.cursorX) {
      cursorTick = drawCursorTick(g, height, this.props.cursorX);
    }
    const secondTicks = drawSecondTicks(g, height, x, tmin, tmax);
    const zeroLine = drawZeroLine(g, x, y, tmin, tmax);
    let xAx = null;
    if (this.props.drawXAxis) {
      xAx = this.drawXAxes(svg, g, height);
    }

    const btnPlus = this.drawYScaleButton(g, '+', 1.1, width - 25, 20);
    const btnMinus = this.drawYScaleButton(g, '-', 0.9, width - 25, height - 10);
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

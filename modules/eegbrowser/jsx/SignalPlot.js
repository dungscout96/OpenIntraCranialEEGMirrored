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

const drawSignalLine = (ctx, tScale, yScale, channel, indexes) => {
  const startx = tScale(channel.domain[indexes[0]]);
  const starty = yScale(channel.signal[indexes[0]]);
  ctx.strokeStyle = '#00a1ff';
  ctx.lineWidth = 2;
  ctx.moveTo(startx, starty);
  ctx.beginPath();
  indexes.forEach((i) => {
    const [ x, y ] = [ tScale(channel.domain[i]), yScale(channel.signal[i]) ];
    ctx.lineTo(x, y);
  });
  ctx.stroke();
};

const drawSecondTicks = (ctx, height, tScale, tmin, tmax) => {
  const ctmin = Math.ceil(tmin);
  const ctmax = Math.ceil(tmax);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  for (let t = ctmin; t < ctmax; t++) {
    ctx.beginPath();
    ctx.moveTo(tScale(t), 0);
    ctx.lineTo(tScale(t), height);
    ctx.stroke();
  }
};

const drawCursorTick = (g, height, x) => {
  return g.append('line')
          .attr({ x1: x, y1: 0 })
          .attr({ x2: x, y2: height })
          .attr('stroke-width', 1)
          .attr('stroke', '#900');
}

const drawMidLine = (g, tScale, yScale, midPoint, tmin, tmax) => {
  return g.append('line')
          .attr({ x1: tScale(tmin), y1: yScale(midPoint)})
          .attr({ x2: tScale(tmax), y2: yScale(midPoint)})
          .attr('stroke-width', 1)
          .attr('stroke', '#555');
};

const drawRegionColorCode = (g, height, color) => {
  return g.append('line')
          .attr({ x1: 5, y1: 0 })
          .attr({ x2: 5, y2: height })
          .attr('stroke-width', 4)
          .attr('stroke', `rgba(${color.r}, ${color.g}, ${color.b}, 1.0)`);
};

export class SignalPlot extends Component {
  constructor(props) {
    super(props);
    this.svg = null;
  }
  getDimensions() {
    const { width, height } = this.props;
    if (!width) {
      return {
        width: this.div.getBoundingClientRect().width - (this.props.yAxisWidth || 60),
        height
      };
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
    const { channel, cursorT } = this.props;
    const { tmin, tmax } = this.props.tBounds;
    const { t } = this.getD3Scales();
    let cursTime = 'NA';
    let cursVal = 'NA';
    if (cursorT) {
      cursTime = Math.round(cursorT * 100) / 100;
    }
    const ts = channel.domain;
    // Only filter out array indices where time values in the domain are in bounds.
    const indexFilter = (indexes, t, i) => {
      if (t >= tmin && t <= tmax) {
        indexes.push(i)
        if (i < ts.length - 1 && cursorT >= t && cursorT < ts[i + 1]) {
          const v1 = channel.signal[i];
          const v2 = channel.signal[i + 1];
          const s = (cursorT - ts[i]) / (ts[i+1] - ts[i]);
          cursVal = v1 * (1 - s) + v2 * s
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
  drawXAxes(svg, parent) {
    let xAx = null;
    const { t, y } = this.getD3Scales();
    const { height } = this.getDimensions();
    const { xAxis } = this.getD3Axes();
    const { xAxisLabel, yAxisLabel } = this.props;
    { // Position x axis
      xAx = parent.append('g').call(xAxis);
      if (this.props.xAxisOrientation === 'top') {
        xAx.attr('transform', `translate(${0}, ${0})`);
      }
      if (this.props.xAxisOrientation === 'bottom') {
        xAx.attr('transform', `translate(${0}, ${height})`);
        svg.attr('height', height + 50)
           .style('height', `${height + 50}px`)
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
    const { channel } = this.props;
    const { t, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes();
    const { tmin, tmax } = this.props.tBounds;
    const { ymin, ymax } = this.props.yBounds;
    const { width, height } = this.getDimensions();
    const { div, svg, g } = this.plot;
    const { indexes, cursTime, cursVal } = this.getSignalIndexes();
    this.plot.channelName.text(`${channel.name} | ${this.props.xAxisLabel}: ${cursTime} | value (${this.props.yAxisLabel}): ${cursVal}`);
    if (this.plot.cursorTick) {
      this.plot.cursorTick.remove();
      this.plot.cursorTick = null;
    }
    if (this.props.cursorT) {
      const cursorX = t(this.props.cursorT);
      if (cursorX > 0) {
        this.plot.cursorTick = drawCursorTick(g, height, cursorX);
      }
    }
    if (this.plot.xAx) {
      this.plot.xAx.remove();
      this.plot.xAx = null;
    }
    div.style('height', `${height}px`);
    svg.attr('height', height)
       .style('min-height', `${height}px`)
    if (this.props.drawXAxis) {
      this.plot.xAx = this.drawXAxes(svg, g);
    }
    this.plot.yAx.call(yAxis);
    this.plot.regionColorCode.remove();
    this.plot.regionColorCode = drawRegionColorCode(svg, height, this.props.colorCode)
    { // Fix canvas resolution based on the canvas dom element's style dimensions
      const { width, height } = this.plot.canvas.node().getBoundingClientRect();
      this.plot.canvas.attr('width', width)
                      .attr('height', height);
    }
    this.plot.ctx.clearRect(0, 0, width, height);
    if (this.props.backgroundColor) {
      this.plot.ctx.fillStyle = this.props.backgroundColor;
      this.plot.ctx.fillRect(0, 0, width, height);
    }
    drawSignalLine(this.plot.ctx, t, y, channel, indexes);
    drawSecondTicks(this.plot.ctx, height, t, tmin, tmax);
    this.plot.midLine.remove();
    this.plot.midLine = drawMidLine(g, t, y, (ymax + ymin) / 2, tmin, tmax);
    if (this.plot.btnPlus) {
      this.plot.btnPlus.remove();
      this.plot.btnPlus = null;
    }
    if (this.plot.btnMinus) {
      this.plot.btnMinus.remove();
      this.plot.btnMinus = null;
    }
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
    const { ymin, ymax } = this.props.yBounds;
    const { t, y } = this.getD3Scales();
    const { xAxis, yAxis } = this.getD3Axes();
    const { width, height } = this.getDimensions();
    // Create new plot shapes in d3
    const div = d3.select(this.div)
                  .style('height', `${height}px`)
                  .style('width', '100%');
    const svg = d3.select(this.svg)
                  .attr('height', height)
                  .style('min-height', `${height}px`)
                  .style('position', 'relative')
                  .style('top', `${-height}px`);
    let g = svg.append('g')
               .attr('transform', `translate(${yAxisWidth || 60}, ${0})`)
               .attr('width', '100%');
    const canvas = d3.select(this.canvas)
                     .attr('x', yAxisWidth || 60)
                     .attr('y', 0)
                     .attr('width', width)
                     .attr('height', height)
                     .style('position', 'relative')
                     .style('left', `${yAxisWidth || 60}px`)
                     .style('display', 'flex')
                     .style('width', '100%')
                     .style('height', `${height}px`)
                     .style('margin-right', '0');
    const ctx = canvas.node().getContext('2d');
    if (this.props.backgroundColor) {
      ctx.fillStyle = this.props.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    const yAx = g.append('g')
                 .call(yAxis);
    const regionColorCode = drawRegionColorCode(svg, height, this.props.colorCode);
    const channelName = g.append('text')
                       .attr('x', 5)
                       .attr('y', height - 6)
                       .attr('font-size', 13);
    const { indexes, cursTime, cursVal } = this.getSignalIndexes();
    channelName.text(`${channel.name} | ${this.props.xAxisLabel}: ${cursTime} | value (${this.props.yAxisLabel}): ${cursVal}`);
    drawSignalLine(ctx, t, y, channel, indexes);
    drawSecondTicks(ctx, height, t, tmin, tmax);
    const midLine = drawMidLine(g, t, y, (ymax + ymin) / 2, tmin, tmax);
    let cursorTick = null;
    if (this.props.cursorT) {
      cursorTick = drawCursorTick(g, height, t(this.props.cursorT));
    }
    let xAx = null;
    svg.attr('height', height)
       .style('min-height', `${height}px`)
    if (this.props.drawXAxis) {
      xAx = this.drawXAxes(svg, g);
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
      div,
      svg,
      g,
      xAx,
      yAx,
      height,
      regionColorCode,
      channel,
      channelName,
      canvas,
      ctx,
      cursorTick,
      midLine,
      btnPlus,
      btnMinus
    };
  }
  render() {
    return (
      <div ref={(div) => { this.div = div; }}>
        <canvas ref={(canvas) => { this.canvas = canvas; }}></canvas>
        <svg
          className="signal-plot-item"
          ref={(svg) => { this.svg = svg; }}
        >
        </svg>
     </div>
    );
  }
}

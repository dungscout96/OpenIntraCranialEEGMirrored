import { FILTERS } from './Filters';
import { fetch } from './fetchWrapper';

/* eslint-disable no-undef */

export class Channel {
  constructor(metaData, tmin=0, tmax=60) {
    this.metaData = metaData;
    this.tmin = tmin;
    this.tmax = tmax;
    this.hovered = false;
    this.filters = {};
    this.promise = null;
    this.fetched = false;
  }
  fetch() {
    if (this.promise) {
      return this.promise;
    }
    this.promise = fetch(`${loris.BaseURL}/${loris.TestName}/ajax/GetChannel.php?channelname=${this.metaData.name}`, { credentials: 'include' })
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        return new Promise(resolve => {
          reader.addEventListener('loadend', (e) => resolve((e.srcElement || e.target).result));
        });
      })
      .then(buffer => {
        const edfDecoder = new pixpipe.EdfDecoder();
        edfDecoder.addInput(buffer);
        edfDecoder.update();
        this.originalSignal = edfDecoder.getOutput().getData();
        const timeSamples = this.originalSignal.length;
        this.domain = new Float32Array(timeSamples).fill(0);
        const { tmin, tmax } = this;
        this.domain.forEach((_, i) => {
          const t = i / timeSamples;
          this.domain[i] = tmin * (1 - t) + tmax * t;
        });
        this.signal = this.originalSignal;
        this.fetched = true;
      });
      return this.promise;
  }
  applyFilter(lowPassFilterName, highPassFilterName, onfilterAppliedAfterLoad) {
    if (!this.originalSignal) {
      return;
    }
    if (this.promise && !this.fetched) {
      this.promise.then(() => {
        this.applyFilter(lowPassFilterName, highPassFilterName);
        onfilterAppliedAfterLoad();
      });
      return;
    }
    if (this.filters.low === lowPassFilterName && this.filters.hi === highPassFilterName) {
      return; // Don't apply filters more than once
    }
    const diffFilter = new differenceequationsignal1d.DifferenceEquationSignal1D();
    diffFilter.enableBackwardSecondPass();
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
  testSelectionFilters(filters) {
    if (filters.length === 0) {
      return true;
    }
    const matches = {};
    filters.forEach(filter => {
      if (filter.key === 'hemisphere' && filter.value === 'Both') {
        matches[filter.key] = true;
        return;
      }
      if (filter.key === 'electrodeType' && filter.value === 'all') {
        matches[filter.key] = true;
        return;
      }
      if (filter.key === 'oneCPPPR' && filter.value === 'false') {
        matches[filter.key] = true;
        return;
      }
      matches[filter.key] = matches[filter.key] || String(this.metaData[filter.key]) === filter.value
    });
    return Object.keys(matches).every(key => matches[key]);
  }
}

const colorMapper = new pixpipe.Colormap()
colorMapper.setStyle('jet')
colorMapper.buildLut(39)

export const filterChannels = (filters, regions) => {
  return regions
    .map(r => r.channels.filter(channel => channel.testSelectionFilters(filters)))
    .reduce((a,b) => b.concat(a), []);
}

export class Region {
  constructor(name, channelMetas) {
    this.name = name;
    this.label = name;
    this.colorCode = { r: 0, g: 0, b: 0 };
    this.regionID = channelMetas[0] ? channelMetas[0].regionID : null;
    if (this.regionID) {
      const color = colorMapper.getLutAt(this.regionID);
      this.colorCode = { r: color[0], g: color[1], b: color[2] };
    }
    this.channels = channelMetas.map(channel => new Channel(channel));
    this.channels.forEach(c => { c.colorCode = this.colorCode; });
  }
}

export const getLeafRegions = (node) => {
  switch(node.type) {
    case 'Inner':
      return node.value.map(getLeafRegions).reduce((list, next) => list.concat(next));
    case 'Leaf':
      return node.value;
  }
  return [];
};


export const instantiateRegions = (node, path = []) => {
  if (node.value.length > 0 && node.value[0].type === 'Leaf') {
    node.type = 'Leaf';
    node.value = node.value.map(region => {
      const label = path[0].label + ' ' + region.label;
      region.value.forEach(channel => {
        channel.oneCPPPR = String(channel.oneCPPPR);
        channel.position = new THREE.Vector3().fromArray(channel.position)
      })
      return new Region(label, region.value);
    });
    return;
  }
  node.value.forEach(node => instantiateRegions(node, path.concat([node])));
};

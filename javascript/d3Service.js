// Set dimensions and margin
var margin = { top: 10, right: 30, bottom: 30, left: 40 },
  width = 2500 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom,
  rectWidth = 120,
  rectHeight = 42;

var x;
var y;

function createArchitectureGraph() {
  // Append svg object
  var archSvg = d3
    .select('#arch_viz')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Initialize dependencies
  var dependency = archSvg
    .selectAll('line')
    .data(dependencies)
    .enter()
    .append('line')
    .style('stroke', '#aaa');

  // Initialize services
  var service = archSvg
    .append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(services)
    .enter()
    .append('g')
    .on('click', selectService);

  service
    .append('rect')
    .attr('id', 'service-rect')
    .attr('width', rectWidth)
    .attr('height', rectHeight)
    .attr('fill', '#74abed')
    .attr('x', -(rectWidth / 2))
    .attr('y', -(rectHeight / 2));

  service
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(function (d) {
      return d.name;
    });

  // Let's list the force we wanna apply on the network
  var simulation = d3
    .forceSimulation(services) // Force algorithm is applied to data.nodes
    .force(
      'link',
      d3
        .forceLink() // This force provides links between nodes
        .id(function (d) {
          return d.id;
        }) // This provide  the id of a node
        .links(dependencies) // and this the list of links
        .distance(100)
    )
    .force('charge', d3.forceManyBody().strength(-400).distanceMax([150])) // This adds repulsion between nodes. Play with the -400 for the repulsion strength
    .force('center', d3.forceCenter(width / 2, height / 2)) // This force attracts nodes to the center of the svg area
    .force('collision', d3.forceCollide(rectWidth))
    .on('end', ticked);

  // This function is run at each iteration of the force algorithm, updating the nodes position.
  function ticked() {
    dependency
      .attr('x1', function (d) {
        return d.source.x;
      })
      .attr('y1', function (d) {
        return d.source.y;
      })
      .attr('x2', function (d) {
        return d.target.x;
      })
      .attr('y2', function (d) {
        return d.target.y;
      });

    service.attr('transform', function (d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  }

  function selectService(service) {
    highlightService(service.name);
  }
}

function createDataGraph() {
  // Remove old graphs
  d3.selectAll('#data-svg').remove();

  // Append svg object
  var dataSvg = d3
    .select('#data_viz')
    .append('svg')
    .attr('id', 'data-svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('id', 'data-svg-g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Add x axis
  x = d3
    .scaleLinear()
    .domain(
      d3.extent(serviceData, function (d) {
        return d.time;
      })
    )
    .range([0, width])
    .nice();
  var xGrid = dataSvg
    .append('g')
    .attr('class', 'grid')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(''));
  var xAxis = dataSvg
    .append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x));

  // Add y axis
  y = d3.scaleLinear().domain([0, 110]).range([height, 0]).nice();
  dataSvg
    .append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
  dataSvg.append('g').call(d3.axisLeft(y));

  // Get closest x index of mouse
  var bisect = d3.bisector(function (d) {
    return d.time;
  }).left;

  // Add clip path
  var clip = dataSvg
    .append('defs')
    .append('svg:clipPath')
    .attr('id', 'clip')
    .append('svg:rect')
    .attr('width', width)
    .attr('height', height)
    .attr('x', 0)
    .attr('y', 0);

  // Create brush
  var brush = d3
    .brushX()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on('end', updateChart);

  var lineChart = dataSvg
    .append('g')
    .attr('clip-path', 'url(#clip)')
    .attr('id', 'line-chart');

  // Add line
  lineChart
    .append('path')
    .attr('id', 'data-line')
    .datum(serviceData)
    .attr('fill', 'rgba(116,171,237,0.2)')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.0)
    .attr(
      'd',
      d3
        .area()
        .x(function (d) {
          return x(d.time);
        })
        .y0(y(0))
        .y1(function (d) {
          return y(d.qos);
        })
    );

  // Add brush
  lineChart.append('g').attr('class', 'brush').call(brush);

  var idleTimeout;
  function idled() {
    idleTimeout = null;
  }

  function updateChart() {
    extent = d3.event.selection;

    // Update domain
    if (!extent) {
      if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350));
      x.domain(
        d3.extent(serviceData, function (d) {
          return d.time;
        })
      );
    } else {
      x.domain([x.invert(extent[0]), x.invert(extent[1])]);
      lineChart.select('.brush').call(brush.move, null);
    }

    // Update axis and line
    xGrid
      .transition()
      .duration(1000)
      .call(d3.axisBottom(x).tickSize(-height).tickFormat(''));
    xAxis.transition().duration(1000).call(d3.axisBottom(x));

    // Update data line
    lineChart
      .select('#data-line')
      .transition()
      .duration(1000)
      .attr(
        'd',
        d3
          .area()
          .x(function (d) {
            return x(d.time);
          })
          .y0(y(0))
          .y1(function (d) {
            return y(d.qos);
          })
      );

    // Update specification line
    lineChart
      .select('#specification-line')
      .transition()
      .duration(1000)
      .attr(
        'd',
        d3
          .line()
          .x(function (d) {
            return x(d.time);
          })
          .y(function (d) {
            return y(d.qos);
          })
      );
  }

  if (specificationIsHidden === false) {
    var cause = document.getElementById('causes').value;
    fetchSpecification(selectedService.id, cause);
  }
}

function drawSpecification(specification) {
  const max_initial_loss = specification.max_initial_loss;
  const max_recovery_time = specification.max_recovery_time;

  data = [
    {
      qos: 100,
      time: 0.0,
    },
  ];

  // Create dataset
  var specificationEndpoint = -1.0;
  var transientBehaviorEndpoint = -1.0;
  for (var i = 0; i < serviceData.length; i++) {
    var elem = serviceData[i];
    
    if (elem.time > specificationEndpoint && elem.time > transientBehaviorEndpoint) {
      if (elem.qos < expected_qos) {
        if (isInitialLoss(i)) {
          var initialLossIndex = getInitialLossIndex(i);
          var initialLoss = serviceData[initialLossIndex];
          transientBehaviorEndpoint = getTransientBehaviorEndpoint(serviceData, initialLossIndex);
          console.log('Transient behavior from ' + initialLoss.time + ' to ' + transientBehaviorEndpoint);

          data.push({ qos: 100, time: initialLoss.time });
          data.push({
            qos: parseFloat(100 - max_initial_loss),
            time: initialLoss.time,
          });

          var startpoint = parseFloat(data[data.length - 1].time);
          specificationEndpoint = startpoint + parseFloat(max_recovery_time);
          data.push({ qos: 100, time: specificationEndpoint });
        }
      }
    }
  }

  data.push({ qos: 100, time: serviceData[serviceData.length - 1].time });

  d3.select('#line-chart')
    .append('path')
    .attr('id', 'specification-line')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 2.0)
    .attr(
      'd',
      d3
        .line()
        .x(function (d) {
          return x(d.time);
        })
        .y(function (d) {
          return y(d.qos);
        })
    );

  function isInitialLoss(index) {
    var med = getMedianOfNextValues(serviceData, index);
    if (med < qos_threshold) {
      return true;
    }
    return false;
  }

  function getInitialLossIndex(index) {
    var nextValues = getNextValues(serviceData, index);
    var minimum = serviceData[index];
    var indexMinimum = index;

    for (var j = 0; j < nextValues.length; j++) {
      if (nextValues[j].qos < minimum.qos) {
        minimum = nextValues[j];
        indexMinimum = index + j;
      }
    }

    return indexMinimum;
  }

  function getTransientBehaviorEndpoint(data, startIndex) {
    for (var i = startIndex + 1; i < data.length; i++) {
      var measurement = data[i];
      if (measurement.qos >= expected_qos) {
        var med = getMedianOfNextValues(data, i);
        if (med >= qos_threshold) {
          return data[i].time;
        }
      }
    }
    return data[data.length - 1].time;
  }

  function getMedianOfNextValues(data, startIndex) {
    var nextValues = getNextValues(data, startIndex);
    var qosValues = nextValues.map((service) => service.qos);
    return median(qosValues);
  }

  function getNextValues(data, startIndex) {
    const lastIndex = data.length >= startIndex + 5 ? startIndex + 5 : data.length - 1;
    return data.slice(startIndex, lastIndex);
  }
  
  function median(values) {
    if (values.length === 0) return 0;

    values.sort((a, b) => {
      return a - b;
    });

    var center = Math.floor(values.length / 2);

    if (values.length % 2) {
      return values[center];
    }
    return values[half - 1] + values[half] / 2.0;
  }
}

function removeSpecificationPath() {
  d3.selectAll('#specification-line').remove();
  specification = null;
}

// Draws a histogram of the resilience loss
function drawTransientLossGraph() {
  // Remove old graphs
  d3.selectAll('#loss-svg').remove();

  // Append svg object
  var lossSvg = d3
    .select('#loss_viz')
    .append('svg')
    .attr('id', 'loss-svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('id', 'loss-svg-g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // Add x axis
  var xScale = d3
    .scaleLinear()
    .domain(
      d3.extent(serviceData, function (d) {
        return d.time;
      })
    )
    .range([0, width])
    .nice();
  var xGrid = lossSvg
      .append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''));
  var xAxis = lossSvg
      .append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(xScale));
    
  var yScale = d3.scaleLinear().domain([0, 20000]).range([height, 0]).nice();
  lossSvg
      .append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
  lossSvg.append('g').call(d3.axisLeft(yScale));

  // Add clip path
  var clip = lossSvg  
      .append('defs')
      .append('svg:clipPath')
      .attr('id', 'clip_loss')
      .append('svg:rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0);
  
  // Create brush
  var brush = d3
      .brushX()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on('end', updateChart);
  
  var lineChart = lossSvg
      .append('g')
      .attr('clip-path', 'url(#clip_loss')
      .attr('id', 'line-chart-loss');
  
  lineChart
  .append('path')
  .attr('id', 'data-line-loss')
  .datum(serviceData)
  .attr('fill', 'rgba(116,171,237,0.2)')
  .attr('stroke', 'steelblue')
  .attr('stroke-width', 1.0)
  .attr(
    'd',
    d3
      .area()
      .x(function (d) {
        return xScale(d.time);
      })
      .y0(yScale(0))
      .y1(function (d) {
        // TODO: change this based on which specification is selected
        return yScale(d.failureLoss);
      })
  );

  // Add brush
  lineChart.append('g').attr('class', 'brush').call(brush);

  var idleTimeout;
  function idled() {
    idleTimeout = null;
  }

  function updateChart() {
    extent = d3.event.selection;

    // Update domain
    if (!extent) {
      if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350));
      xScale.domain(
        d3.extent(serviceData, function (d) {
          return d.time;
        })
      );
    } else {
      xScale.domain([xScale.invert(extent[0]), x.invert(extent[1])]);
      lineChart.select('.brush').call(brush.move, null);
    }

    // Update axis and line
    xGrid
      .transition()
      .duration(1000)
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''));
    xAxis.transition().duration(1000).call(d3.axisBottom(xScale));

    // Update data line
    lineChart
    .select('#data-line-loss')
    .transition()
    .duration(1000)
    .attr(
      'd',
      d3
      .area()
      .x(function (d) {
        return xScale(d.tinme);
      })
      .y0(yScale(0))
      .y1(function (d) {
        return yScale(d.failureLoss) // TODO: change this for arbitrary loss
      })
    );
  }
}

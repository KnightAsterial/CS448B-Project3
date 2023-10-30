// Set up size

let windowHeight = window.innerHeight - 5

// map image is 1913 x 2475

// let mapWidth = Math.floor(windowHeight * 1913 / 2475 );
// let mapHeight = windowHeight;

let mapWidth = Math.max(1000);
let mapHeight = Math.floor(2475/1913 * mapWidth);

// Set up projection that the map is using
let mapFrameGeoJSON = JSON.parse(`{"type":"Feature","geometry":{"type":"LineString","coordinates":[[-122.54644297642132,37.989209933976475],[-121.74157680240731,37.19360698897229]]}}`)
let projection = d3.geoConicConformal()
  .parallels([37 + 4 / 60, 38 + 26 / 60])
  .rotate([120 + 30 / 60], 0)
  .fitSize([mapWidth, mapHeight], mapFrameGeoJSON)

// This is the mapping between <longitude, latitude> position to <x, y> pixel position on the map
// projection is a function and it has an inverse:
// projection([lon, lat]) returns [x, y]
// projection.invert([x, y]) returns [lon, lat]
// The base map and the projection function is based on
//  this Observable notebook: https://observablehq.com/@clhenrick/sf-bay-area-basemap-cropped

// Add an SVG element to the DOM
let svg = d3.select('#visualization').append('svg')
  .attr('width', mapWidth)
  .attr('height', mapHeight);

// Add the static PNG map at correct size, assuming map is saved in a subdirectory called `data`
svg.append('image')
  .attr('width', mapWidth)
  .attr('height', mapHeight)
  .attr('xlink:href', 'data/map.png');

/*

*/

let locations = [
  { // A: Initialized to SFO
    Latitude: 37.615223,
    Longitude: -122.389977,
    Radius: 250, // px
    Id: 'A',
    Hover: false,
    Color: 'lightgreen'
  },
  { // B: Initialized to Stanford
    Latitude: 37.424107,
    Longitude: -122.166077,
    Radius: 300, // px
    Id: 'B',
    Hover: false,
    Color: 'lightskyblue',
  }
]

let locationBorderThickness = 6; //px
let tooltipOffset = 6; //px
let locationLabelOffset = 6; //px


d3.csv('data/data.csv').then( data => {
  data.forEach((elem) => {
    elem.InFilter = false
  })

  let locationGroups = svg.selectAll('.locationGroup')
    .data(locations)
    .join('g')

  locationGroups.append('circle')
    .attr('class', 'locationBorder')
    .attr('id', d => 'locationBorder' + d.Id)
    .attr('r', d => d.Radius + locationBorderThickness/2)
    .attr('cx', d => projection([d.Longitude, d.Latitude])[0])
    .attr('cy', d => projection([d.Longitude, d.Latitude])[1])
    .attr('fill', 'red') 
    .attr('fill-opacity', '0%')
    .attr('stroke', 'red')
    .attr('stroke-width', locationBorderThickness)
    .attr('stroke-opacity', '25%')
    .on('mouseover', (event, d) => {
      d3.select('#locationBorder' + d.Id).attr('stroke-opacity', '75%')
    })
    .on('mouseout', (event, d) => {
      d3.select('#locationBorder' + d.Id).attr('stroke-opacity', '25%')
    })
    .call(d3.drag()
      .on('drag', resizeDragged)
    )


  locationGroups.append('circle')
    .attr('class', 'locationArea')
    .attr('id', d => 'locationArea' + d.Id)
    .attr('r', d => d.Radius)
    .attr('cx', d => projection([d.Longitude, d.Latitude])[0])
    .attr('cy', d => projection([d.Longitude, d.Latitude])[1])
    .attr('fill', d => d.Color)
    .attr('opacity', '25%')
    .call(d3.drag()
      .subject((event, d) => {
        return {  x: projection([d.Longitude, d.Latitude])[0],
                  y: projection([d.Longitude, d.Latitude])[1]}
      })
      .on('drag', translateDragged)
    )

  locationGroups.append('circle')
    .attr('class', 'locationArea')
    .attr('id', d => 'locationCenter' + d.Id)
    .attr('r', d => locationLabelOffset)
    .attr('cx', d => projection([d.Longitude, d.Latitude])[0])
    .attr('cy', d => projection([d.Longitude, d.Latitude])[1])
    .attr('fill', d => d.Color)

  locationGroups.append('text')
    .attr('class', 'locationArea')
    .attr('id', d => 'locationLabel' + d.Id)
    .attr('x', d => projection([d.Longitude, d.Latitude])[0] + locationLabelOffset)
    .attr('y', d => projection([d.Longitude, d.Latitude])[1] - locationLabelOffset)
    .attr('fill', d => d.Color)
    .text(d => d.Id)

  let companyCircles = svg.selectAll('.companyCircle')
    .data(data)
    .join(
      enter => enter.append('circle'),
      update => update,
      exit => exit.remove()
    )
    .attr('r', '2')
    .attr('cx', d => projection([d.Longitude, d.Latitude])[0])
    .attr('cy', d => projection([d.Longitude, d.Latitude])[1])
    .attr('class', 'companyCircle')
    .attr('id', d => 'companyCircle' + d.ID)
    .attr('fill', d => d.InFilter ? 'black' : 'silver')
    .on('mouseover', (event, d) => {
      d3.select('#companyCircle' + d.ID).attr('fill', 'red')
      text1 = svg.append('text')
        .attr('class', 'tooltip')
        .attr('x', projection([d.Longitude, d.Latitude])[0] + tooltipOffset)
        .attr('y', projection([d.Longitude, d.Latitude])[1] - tooltipOffset)
        .attr('dy', '-1em')
        .text(d.Name)
      text2 = svg.append('text')
        .attr('class', 'tooltip')
        .attr('x', projection([d.Longitude, d.Latitude])[0] + tooltipOffset)
        .attr('y', projection([d.Longitude, d.Latitude])[1] - tooltipOffset)
        .text("Average Rating: " + (d.Average_Rating ? d.Average_Rating : "N/A"))
      let text1Dim = text1.node().getBBox()
      let text2Dim = text2.node().getBBox()
      let tooltipX = Math.min(text1Dim.x, text2Dim.x)
      let tooltipY = Math.min(text1Dim.y, text2Dim.y)
      svg.insert('rect', '.tooltip')
        .attr('x', tooltipX)
        .attr('y', tooltipY)
        .attr('width', Math.max(text1Dim.x + text1Dim.width, text2Dim.x + text2Dim.width) - tooltipX)
        .attr('height', Math.max(text1Dim.y + text1Dim.height, text2Dim.y + text2Dim.height) - tooltipY)
        .attr('class', 'tooltip')
        .attr('fill', 'gainsboro')

    })
    .on('mouseout', (event, d) => {
      svg.selectAll('.tooltip').remove()
      d3.select('#companyCircle' + d.ID).attr('fill', d => d.InFilter ? 'black' : 'silver')
    })

  let min_rating = 0;
  let max_rating = 5;

  d3.select("#min-slider")
    .on('input', (event) => {
      new_min = event.target.value;
      if (new_min > max_rating) {
        event.target.value = min_rating
      } else {
        min_rating = new_min
        d3.select("#min-rating-label").text("Minimum Rating: " + min_rating)

        filterData()
      }
    })

  d3.select("#max-slider")
    .on('input', (event) => {
      new_max = event.target.value
      if (new_max < min_rating) {
        event.target.value = max_rating
      } else {
        max_rating = new_max
        d3.select("#max-rating-label").text("Maximum Rating: " + max_rating)

        filterData()
      }
    })
  

  function filterData() {
    let [xLocationA, yLocationA] = projection([locations[0].Longitude, locations[0].Latitude])
    let [xLocationB, yLocationB] = projection([locations[1].Longitude, locations[1].Latitude])

    data.forEach( elem => {
      let x, y;
      [x, y] = projection([elem.Longitude, elem.Latitude])
      distToA = Math.sqrt( (x - xLocationA)**2 + (y - yLocationA)**2 )
      distToB = Math.sqrt( (x - xLocationB)**2 + (y - yLocationB)**2 )

      if ((distToA < locations[0].Radius) && (distToB < locations[1].Radius)) {
        elem.InFilter = true
      } else {
        elem.InFilter = false
      }
    })

    companyCircles.attr('fill', d => {
        rating_criteria = d.Average_Rating == "" || (d.Average_Rating >= min_rating && d.Average_Rating <= max_rating)
        return (d.InFilter && rating_criteria) ? 'black' : 'silver'
      })
  }



  function resizeDragged(event, d) {  
    let oldX, oldY;  
    [oldX, oldY] = projection([d.Longitude, d.Latitude])
    const distFromCircleCenter = Math.sqrt( (event.x - oldX)**2 + (event.y - oldY)**2 )
    d.Radius = distFromCircleCenter
  
    d3.select('#locationBorder' + d.Id).attr('r', d.Radius)
    d3.select('#locationArea' + d.Id).attr('r', d.Radius - locationBorderThickness/2)
    
    filterData()
  }
    
  function translateDragged(event, d) {
    let newLongitude, newLatitude
    [newLongitude, newLatitude] = projection.invert([event.x, event.y])
  
    d.Longitude = newLongitude
    d.Latitude = newLatitude
  
    d3.select(this)
      .attr('cx', event.x)
      .attr('cy', event.y)
  
    d3.select('#locationBorder' + d.Id)
      .attr('cx', event.x)
      .attr('cy', event.y)

    d3.select('#locationCenter' + d.Id)
      .attr('cx', event.x)
      .attr('cy', event.y)

    d3.select('#locationLabel' + d.Id)
      .attr('x', event.x + locationLabelOffset)
      .attr('y', event.y - locationLabelOffset)

    

    filterData()
  }

  filterData()
})





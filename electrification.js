
var gorakhpur = ee.FeatureCollection("projects/dynamic-density-348610/assets/gorakhpur");

// VIIRS Night time lights data 
var dataset = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
		.filter(ee.Filter.date('2019-01-01',  '2020-12-31'))    //filter for year 2019 to 2020
		.filterBounds(gorakhpur).select('avg_rad')              //filterbound for year gorakhpur region

//map image collection with clipped images and rescaled at 100m resolution
var nighttime = dataset
                      .map(
                        function(image){
                          return image.clip(gorakhpur)      
                                      .reproject({
                                          "crs":'EPSG:4326',
                                          "scale":100});                            
                                      });
                                      
//visualization
var nighttimeVis = {min: 0.0, max: 60.0};
Map.centerObject(gorakhpur, 10);
Map.addLayer(nighttime, nighttimeVis, 'Nighttime');
//Analysis of change in radiance values for each month
var chart =
    ui.Chart.image
        .series({
          imageCollection: nighttime,
          region: gorakhpur,
          reducer: ee.Reducer.mean(),
          scale: 500,
          xProperty: 'system:time_start'
        })
        .setSeriesNames(['avg_rad'])
        .setOptions({
          title: 'Night time lights Data',
          hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Average Radiance Value',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          curveType: 'function'
        });
print(chart);

/****Calculating a statistical proxy of electrcity by normalizing radiance valuej*/
//calculate maximum radiance value
var max_rad = ee.Number(nighttime.mean().reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: gorakhpur,
      scale : 100
      }).get('avg_rad'));
//calculate minimum radiance value
var min_rad = ee.Number(nighttime.mean().reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: gorakhpur,
      scale : 100
      }).get('avg_rad'));
//create normalized image for statistical proxy of electricity
var proxy_image = (nighttime.mean().subtract(min_rad)).divide(max_rad.subtract(min_rad)).rename('proxy');
Map.addLayer(proxy_image, {min:0, max:1}, 'Electrification proxy');

//create stacked image of monthly composites of data from year 2019 to 2020
var composite =  nighttime.toBands();
print(composite);

var projection = composite.projection().getInfo();

//exports images to drive
Export.image.toDrive({
  image: composite,
  description: 'composite',
  crs: projection.crs,
  crsTransform: projection.transform,
  region: gorakhpur,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: proxy_image,
  description: 'proxy_image',
  crs: projection.crs,
  crsTransform: projection.transform,
  region: gorakhpur,
  maxPixels: 1e9
});




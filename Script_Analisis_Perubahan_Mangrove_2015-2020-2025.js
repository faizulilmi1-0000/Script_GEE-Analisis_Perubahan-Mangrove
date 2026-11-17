// 1. Menampilkan ROI
Map.addLayer(ROI, {color: 'red'}, 'Batas Wilayah Kajian', false);
Map.centerObject(ROI, 12);

// 2. Fungsi MVI (Mangrove Vegetation Index)
var addMVI = function(image) {
  var nir = image.select('SR_B5');
  var green = image.select('SR_B3');
  var swir1 = image.select('SR_B6');
  
  var mvi = image.expression(
    '(NIR - Green) / (SWIR1 - Green)', {
      'NIR': nir,
      'Green': green,
      'SWIR1': swir1
    }).rename('MVI');
  return image.addBands(mvi);
};

var threshold = 4.5; // Pastikan threshold ini sesuai dengan kalibrasi data Anda

// 3. Fungsi untuk mengambil data Mangrove tahunan
var getMangrove = function(year) {
  var startDate = year + '-01-01';
  var endDate = year + '-12-31';
  
  var collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterBounds(ROI)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUD_COVER', 20));

  var finalImg = collection
    .map(addMVI)
    .median()
    .clip(ROI);

  // Return klasifikasi biner (1: Mangrove, 0: Bukan)
  return finalImg.select('MVI').gt(threshold);
};

// 4. Proses Sebaran
var m15 = getMangrove(2015);
var m20 = getMangrove(2020);
var m25 = getMangrove(2025);

// 5. Analisis Perubahan (Fungsi yang sudah diperbaiki)
// Fungsi ini langsung menghasilkan layer siap pakai (1: Loss, 2: Gain, 3: Stable)
var getChange = function(before, after) {
  return ee.Image(0)
    .where(before.eq(1).and(after.eq(0)), 1) // Loss (Mangrove menjadi bukan)
    .where(before.eq(0).and(after.eq(1)), 2) // Gain (Bukan menjadi Mangrove)
    .where(before.eq(1).and(after.eq(1)), 3) // Stable (Tetap Mangrove)
    .selfMask(); // Bagian yang nilainya 0 (tidak berubah/bukan target) akan transparan
};

var change15_20 = getChange(m15, m20);
var change20_25 = getChange(m20, m25);

// 6. Visualisasi
// Palette: 1:Red (Loss), 2:Blue (Gain), 3:Green (Stable)
Map.addLayer(change15_20, {min: 1, max: 3, palette: ['red', 'blue', 'green']}, 'Perubahan 2015-2020');
Map.addLayer(change20_25, {min: 1, max: 3, palette: ['red', 'blue', 'green']}, 'Perubahan 2020-2025');

// Visualisasi sebaran per tahun (Opsional, untuk referensi)
Map.addLayer(m15.selfMask(), {palette: ['gray']}, 'Sebaran 2015', false);
Map.addLayer(m20.selfMask(), {palette: ['purple']}, 'Sebaran 2020', false);
Map.addLayer(m25.selfMask(), {palette: ['black']}, 'Sebaran 2025', false);

// 7. EKSPOR KE GOOGLE DRIVE (Cara manual agar kompatibel)
var exportConfigs = {
  scale: 30,
  region: ROI,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
};

// Ekspor Sebaran per Tahun
Export.image.toDrive({
  image: m15.toInt8(),
  description: 'Sebaran_Mangrove_2015',
  scale: exportConfigs.scale,
  region: exportConfigs.region,
  maxPixels: exportConfigs.maxPixels,
  fileFormat: exportConfigs.fileFormat
});

Export.image.toDrive({
  image: m20.toInt8(),
  description: 'Sebaran_Mangrove_2020',
  scale: exportConfigs.scale,
  region: exportConfigs.region,
  maxPixels: exportConfigs.maxPixels,
  fileFormat: exportConfigs.fileFormat
});

Export.image.toDrive({
  image: m25.toInt8(),
  description: 'Sebaran_Mangrove_2025',
  scale: exportConfigs.scale,
  region: exportConfigs.region,
  maxPixels: exportConfigs.maxPixels,
  fileFormat: exportConfigs.fileFormat
});

// Ekspor Analisis Perubahan
Export.image.toDrive({
  image: change15_20.toInt8(),
  description: 'Perubahan_Mangrove_2015_2020',
  scale: exportConfigs.scale,
  region: exportConfigs.region,
  maxPixels: exportConfigs.maxPixels,
  fileFormat: exportConfigs.fileFormat
});

Export.image.toDrive({
  image: change20_25.toInt8(),
  description: 'Perubahan_Mangrove_2020_2025',
  scale: exportConfigs.scale,
  region: exportConfigs.region,
  maxPixels: exportConfigs.maxPixels,
  fileFormat: exportConfigs.fileFormat
});
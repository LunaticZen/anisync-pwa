const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('C:\\Users\\emin\\Desktop\\anisync_logo_circles.png')
  .then(buf => {
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Successfully created icon.ico');
  })
  .catch(err => {
    console.error('Error creating ico:', err);
  });

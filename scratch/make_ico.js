const fs = require('fs');
const path = require('path');

async function convertPngToIco() {
  try {
    const pngPath = path.join(__dirname, '..', 'src', 'renderer', 'public', 'logo.png');
    const assetsDir = path.join(__dirname, '..', 'assets');
    const icoPath = path.join(assetsDir, 'icon.ico');
    const publicIcoPath = path.join(__dirname, '..', 'src', 'renderer', 'public', 'icon.ico');

    // Create assets directory if it doesn't exist
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    if (!fs.existsSync(pngPath)) {
      console.error('Source PNG file not found at:', pngPath);
      return;
    }

    const pngBuffer = fs.readFileSync(pngPath);
    const pngSize = pngBuffer.length;

    // Create a 22-byte ICO header for a single 256x256 PNG image
    const header = Buffer.alloc(22);
    
    // Icon Header
    header.writeUInt16LE(0, 0);     // Reserved (must be 0)
    header.writeUInt16LE(1, 2);     // Image type (1 = icon)
    header.writeUInt16LE(1, 4);     // Number of images (1)

    // Icon Directory Entry
    header.writeUInt8(0, 6);        // Width (0 means 256 pixels)
    header.writeUInt8(0, 7);        // Height (0 means 256 pixels)
    header.writeUInt8(0, 8);        // Color palette count (0 if no palette)
    header.writeUInt8(0, 9);        // Reserved (must be 0)
    header.writeUInt16LE(1, 10);    // Color planes (1)
    header.writeUInt16LE(32, 12);   // Bits per pixel (32)
    header.writeUInt32LE(pngSize, 14); // Size of the image data in bytes
    header.writeUInt32LE(22, 18);   // Offset of the PNG data from the beginning of the file (22 bytes)

    // Combine header and PNG data
    const icoBuffer = Buffer.concat([header, pngBuffer]);

    fs.writeFileSync(icoPath, icoBuffer);
    fs.writeFileSync(publicIcoPath, icoBuffer);
    console.log('Successfully created live icon.ico at:', icoPath, 'and', publicIcoPath);
  } catch (err) {
    console.error('Failed to create icon.ico:', err.message);
  }
}

convertPngToIco();

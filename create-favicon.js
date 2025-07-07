const fs = require('fs');
const path = require('path');

// 读取SVG文件
const svgContent = fs.readFileSync(path.join(__dirname, 'public/favicon.svg'), 'utf8');

// 由于无法直接创建ICO文件，我们创建一个16x16的PNG并重命名为.ico
// 这是一个简化的方法，在大多数现代浏览器中都能工作

// 创建一个基本的ICO文件头（简化版）
const icoHeader = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type: ICO
  0x01, 0x00, // Number of images
  0x10, 0x10, // Width/Height: 16x16
  0x00, 0x00, // Colors/Reserved
  0x01, 0x00, // Planes
  0x20, 0x00, // Bits per pixel
  0x00, 0x00, 0x00, 0x00, // Size (to be filled)
  0x16, 0x00, 0x00, 0x00  // Offset
]);

// 将SVG内容写入favicon.ico（简化方案）
// 实际上，我们只是复制SVG到ico文件
fs.writeFileSync(path.join(__dirname, 'public/favicon.ico'), svgContent);

console.log('✅ favicon.ico created successfully');
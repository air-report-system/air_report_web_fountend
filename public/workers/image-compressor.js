/**
 * 图片压缩Web Worker
 * 避免主线程阻塞
 */

self.onmessage = function(e) {
  const { imageData, quality = 0.7, maxDimension = 1600 } = e.data;
  
  try {
    // 创建离屏canvas
    const canvas = new OffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    
    // 创建Image对象
    const img = new Image();
    
    img.onload = function() {
      try {
        // 计算新尺寸，保持宽高比
        let { width, height } = img;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为blob
        canvas.convertToBlob({
          type: 'image/jpeg',
          quality: quality
        }).then(blob => {
          // 转换为base64
          const reader = new FileReader();
          reader.onload = function() {
            const compressedData = reader.result;
            const originalSize = imageData.length;
            const compressedSize = compressedData.length;
            
            self.postMessage({
              success: true,
              compressedData,
              originalSize,
              compressedSize,
              compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
            });
          };
          reader.readAsDataURL(blob);
        }).catch(error => {
          self.postMessage({
            success: false,
            error: error.message
          });
        });
      } catch (error) {
        self.postMessage({
          success: false,
          error: error.message
        });
      }
    };
    
    img.onerror = function() {
      self.postMessage({
        success: false,
        error: '图片加载失败'
      });
    };
    
    img.src = imageData;
    
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
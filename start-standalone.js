const { spawn } = require('child_process');
const path = require('path');

// 确保环境变量设置正确
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log('🚀 启动 Next.js Standalone 服务器...');
console.log(`📍 PORT: ${process.env.PORT}`);
console.log(`📍 HOSTNAME: ${process.env.HOSTNAME}`);

// 检查standalone服务器文件是否存在
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
console.log(`📁 服务器文件路径: ${serverPath}`);

try {
  // 启动standalone服务器
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: process.env.PORT,
      HOSTNAME: process.env.HOSTNAME,
    }
  });

  server.on('error', (err) => {
    console.error('❌ 启动服务器时出错:', err);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`🔚 服务器进程退出，退出码: ${code}`);
    process.exit(code);
  });

  // 处理进程信号
  process.on('SIGINT', () => {
    console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
    server.kill('SIGTERM');
  });

} catch (error) {
  console.error('❌ 启动服务器失败:', error);
  process.exit(1);
}
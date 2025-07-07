console.log('=== 环境变量调试 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('PORT:', process.env.PORT);

console.log('\n=== Next.js配置检查 ===');
const nextConfig = require('./next.config.ts');
console.log('Next.js config rewrite destination:', 
  process.env.BACKEND_URL 
    ? `${process.env.BACKEND_URL}/api/v1/:path*`
    : 'http://localhost:8000/api/v1/:path*'
);

console.log('\n=== 所有环境变量 ===');
Object.keys(process.env).forEach(key => {
  if (key.includes('BACKEND') || key.includes('API') || key.includes('URL')) {
    console.log(`${key}: ${process.env[key]}`);
  }
});
import { Metadata } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: '版本信息',
  description: '应用版本和部署信息',
};

interface VersionInfo {
  version: string;
  deployTime: string;
  buildTime: string;
  nodeEnv: string;
  apiUrl: string;
  backendUrl: string;
}

// 读取版本文件
async function getVersion(): Promise<string> {
  try {
    const versionPath = path.join(process.cwd(), '.version');
    const version = await fs.readFile(versionPath, 'utf8');
    return version.trim();
  } catch (error) {
    console.error('Error reading version file:', error);
    return '1.0.0_unknown';
  }
}

export default async function VersionPage() {
  const version = await getVersion();
  
  const versionInfo: VersionInfo = {
    version,
    deployTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    buildTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg shadow-md p-6 border border-white/30" style={{ backdropFilter: 'blur(4px)' }}>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🚀 前端版本信息
          </h1>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">应用版本：</span>
              <span className="text-blue-600 font-mono text-lg font-bold">{versionInfo.version}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">页面生成时间：</span>
              <span className="text-green-600 font-mono">{versionInfo.deployTime}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">构建时间：</span>
              <span className="text-purple-600 font-mono">{versionInfo.buildTime}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">运行环境：</span>
              <span className={`font-mono px-2 py-1 rounded ${
                versionInfo.nodeEnv === 'production' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {versionInfo.nodeEnv}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">API地址：</span>
              <span className="text-blue-600 font-mono text-sm break-all">
                {versionInfo.apiUrl}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-gray-600">后端地址：</span>
              <span className="text-blue-600 font-mono text-sm break-all">
                {versionInfo.backendUrl}
              </span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ 版本检查说明</h3>
            <p className="text-sm text-green-700">
              版本号从 <code className="bg-green-100 px-1 rounded">.version</code> 文件中读取。
              <br />
              如果版本号显示为 <strong>{version}</strong>，说明前端已成功部署到最新版本！
              <br />
              如果仍然显示旧版本，请清理缓存并重新部署。
            </p>
          </div>
          
          <div className="mt-4 p-4 border border-white/30 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔍 后端版本检查</h3>
            <p className="text-sm text-blue-700 mb-2">
              点击下方链接检查后端版本信息：
            </p>
            <a 
              href={`${versionInfo.backendUrl}/api/v1/version/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              检查后端版本 →
            </a>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">⚡ 快速操作</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">页面刷新时间：</span>
                <span className="ml-2 text-blue-600">
                  {new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                </span>
              </div>
              <div>
                <span className="font-semibold">清除缓存：</span>
                <span className="ml-2 text-green-600">
                  按 Ctrl+F5 强制刷新可清除浏览器缓存
                </span>
              </div>
              <div>
                <span className="font-semibold">版本文件：</span>
                <span className="ml-2 text-purple-600">
                  版本号从项目根目录的 .version 文件读取
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
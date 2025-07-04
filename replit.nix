# Nix配置文件 - 定义运行环境
{ pkgs }: {
  deps = [
    # Node.js运行时
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    
    # 构建工具
    pkgs.nodePackages.next
    pkgs.nodePackages.eslint
    
    # 系统工具
    pkgs.curl
    pkgs.wget
    pkgs.git
    pkgs.bash
    
    # 图像处理相关 (用于处理上传的图片)
    pkgs.imagemagick
    pkgs.libpng
    pkgs.libjpeg
    
    # 网络工具
    pkgs.netcat
    pkgs.dnsutils
  ];
  
  # 环境变量
  env = {
    NODE_ENV = "production";
    NPM_CONFIG_PREFIX = "/home/runner/.npm-global";
    PATH = "/home/runner/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
  };
}

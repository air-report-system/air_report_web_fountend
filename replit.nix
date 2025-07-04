# Nix配置文件 - 定义运行环境
{ pkgs }: {
  deps = [
    # Node.js运行时 (修复包名)
    pkgs.nodejs_18
    pkgs.npm-9_x

    # TypeScript工具
    pkgs.typescript
    pkgs.nodePackages.typescript-language-server

    # 基础系统工具
    pkgs.curl
    pkgs.wget
    pkgs.git
    pkgs.bash
    pkgs.coreutils

    # 图像处理库 (OCR功能需要)
    pkgs.imagemagick
    pkgs.libpng
    pkgs.libjpeg
    pkgs.libwebp

    # 网络和调试工具
    pkgs.netcat-gnu
    pkgs.dnsutils
    pkgs.procps

    # 构建工具
    pkgs.python3
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
  ];

  # 环境变量
  env = {
    NODE_ENV = "production";
    NPM_CONFIG_PREFIX = "/home/runner/.npm-global";
    PATH = "/home/runner/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
    # 确保Node.js能找到原生模块
    NODE_OPTIONS = "--max-old-space-size=4096";
  };
}

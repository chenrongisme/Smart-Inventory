# 使用 Node.js 20 官方镜像
FROM node:20-slim

# 安装编译 sqlite3 所需的系统工具
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 设置 PYTHON 环境变量，供 node-gyp 使用
ENV PYTHON=/usr/bin/python3

# 先复制 package.json 和 package-lock.json
COPY package*.json ./

# 强制执行构建，确保 sqlite3 编译成功
RUN npm install --omit=dev --build-from-source

# 复制源码
COPY . .

# 执行前端构建
RUN npm run build

# 暴露 3000 端口
EXPOSE 3000

# 环境变量设置
ENV NODE_ENV=production
ENV PORT=3000
ENV AI_API_KEY=""
ENV MODEL_TYPE="gemini" # gemini, doubao, qwen, ernie, gemma, minimax
ENV AI_MODEL_NAME="gemini-1.5-flash"
ENV AI_ENDPOINT="" # Optional: for gemma/custom endpoints

# 启动后端服务
CMD ["npm", "start"]

#!/bin/bash

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo "检查项目文件夹是否存在..."
if [ -d "yonyouUIData" ]; then
    echo "项目文件夹已存在，正在清理..."
    rm -rf yonyouUIData
fi

echo "正在克隆项目，请稍候..."
git clone https://a6996660:bd78bdf0588dce68391bbf0eb3f85dfa@gitee.com/a6996660/yonyouUIData.git
cd yonyouUIData

echo "检查端口9527是否被占用..."
if lsof -i :9527 > /dev/null 2>&1; then
    echo "端口9527已被占用，正在清理进程..."
    lsof -i :9527 | awk 'NR>1 {print $2}' | xargs -r kill -9
    echo "已终止占用9527端口的进程"
    sleep 1
fi

echo "正在启动后端服务..."
java -jar dbtreeview-1.0.0.jar &

echo "等待后端服务启动..."
sleep 5

echo "正在打开网页..."
open webdata/v1.0/nginx/html/database-relation.html

echo "操作完成!" 
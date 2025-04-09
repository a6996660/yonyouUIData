/**
 * 渲染树形关系图表
 * 
 * @param {Object} data 树形图数据
 */
function renderGraph(data) {
    console.log('开始渲染图表，输入数据:', data);
    
    if (!data) {
        console.error('没有数据可渲染');
        graphContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#e8eaed">无效的数据结构，无法渲染图表</div>';
        return;
    }
    
    // 检查ECharts是否可用
    if (typeof echarts === 'undefined') {
        console.error('ECharts库未加载，无法渲染图表');
        graphContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#e8eaed">图表库未正确加载，请刷新页面重试</div>';
        return;
    }
    
    // 保存节点搜索容器元素的引用，以便稍后重新添加
    const nodeSearchContainer = document.getElementById('nodeSearchContainer');
    
    // 如果未保存原始数据，则保存当前数据作为原始数据
    if (!window.originalTreeData) {
        window.originalTreeData = JSON.parse(JSON.stringify(data));
    }
    
    try {
        // 确保图表容器已初始化
        if (!myChart) {
            initializeCharts();
            if (!myChart) {
                // initializeCharts失败
                return;
            }
        } else {
            // 在图表已经初始化时，重置尺寸
            myChart.resize();
        }
        
        // 计算适当的布局参数，基于树的深度和宽度
        const treeMetrics = calculateTreeMetrics(data);
        const nodeSize = treeMetrics.nodeCount > 100 ? 7 : 10;
        
        // 计算容器高度 - 至少90vh，但如果节点很多，则增加高度
        let containerHeight = '90vh';
        if (treeMetrics.nodeCount > 200) {
            containerHeight = '95vh';
        } else if (treeMetrics.maxDepth > 7 || treeMetrics.maxChildren > 15) {
            containerHeight = '92vh';
        }
        
        // 动态设置容器高度
        graphContainer.style.height = containerHeight;
        
        // 确定是否应该启用自动分组功能
        const shouldEnableAutoGrouping = treeMetrics.nodeCount > 50 || treeMetrics.maxChildren > 12;
        
        // 预处理数据 - 对大量相同类型的子节点进行分组
        const processedData = shouldEnableAutoGrouping ? processTreeGrouping(data, true) : data;
        
        // 设置图表配置
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    return formatNodeTooltip(params.data);
                }
            },
            series: [{
                type: 'tree',
                data: [processedData],
                top: '5%',
                left: '7%',
                bottom: '5%',
                right: '20%',
                symbolSize: nodeSize,
                layout: 'orthogonal',
                orient: 'LR',
                initialTreeDepth: -1,
                roam: true,
                label: {
                    position: 'right',
                    verticalAlign: 'middle',
                    align: 'left',
                    fontSize: 12,
                    color: '#e8eaed'
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                emphasis: {
                    focus: 'descendant'
                },
                expandAndCollapse: true,
                animationDuration: 550,
                animationDurationUpdate: 750
            }]
        };
        
        // 将配置应用到图表
        myChart.setOption(option);

        console.log('图表设置完成');
        
        // 绑定图表点击事件
        myChart.on('click', async function(params) {
            if (params.dataType === 'node') {
                console.log('点击节点:', params.data);
                
                // 如果节点有详细信息，显示详情面板
                if (params.data.tableDetails || params.data.name) {
                    const nodeName = params.data.name;
                    const nodeDetails = params.data.tableDetails || { tableName: nodeName, description: '暂无详细信息' };
                    
                    // 显示节点详情面板
                    showNodeDetailsPanel(nodeDetails, params.data);
                    
                    // 高亮选中节点
                    highlightNode(params.data.id || params.data.name);
                }
            }
        });
        
        // 检查图表是否正确渲染
        setTimeout(() => {
            if (graphContainer.querySelector('canvas')) {
                console.log('图表已成功渲染，找到canvas元素');
                
                // 确保节点搜索容器可见
                ensureNodeSearchContainerVisible();
            } else {
                console.error('图表可能未正确渲染，未找到canvas元素');
            }
        }, 500);
        
    } catch (error) {
        console.error('渲染图表失败:', error);
        graphContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#e8eaed">图表渲染失败: ${error.message}</div>`;
        
        // 即使渲染失败，也尝试恢复节点搜索容器
        setTimeout(() => {
            ensureNodeSearchContainerVisible();
        }, 100);
    }
}

/**
 * 确保节点搜索容器在图表中可见
 */
function ensureNodeSearchContainerVisible() {
    const nodeSearchContainer = document.getElementById('nodeSearchContainer');
    const graphContainer = document.getElementById('graph-container');
    
    // 如果节点搜索容器不存在，则重新创建
    if (!nodeSearchContainer) {
        console.log('节点搜索容器未找到，重新创建');
        createNodeSearchContainer();
    } else {
        // 确保节点搜索容器在图表容器内且可见
        if (!graphContainer.contains(nodeSearchContainer)) {
            console.log('节点搜索容器不在图表内，重新添加');
            graphContainer.appendChild(nodeSearchContainer);
        }
        nodeSearchContainer.style.display = 'block';
    }
}

/**
 * 创建节点搜索容器
 */
function createNodeSearchContainer() {
    const graphContainer = document.getElementById('graph-container');
    if (!graphContainer) return;
    
    // 创建节点搜索容器元素
    const searchContainer = document.createElement('div');
    searchContainer.id = 'nodeSearchContainer';
    searchContainer.className = 'search-container';
    searchContainer.style.cssText = 'position: absolute; bottom: 20px; left: 20px; z-index: 100; background-color: rgba(48, 49, 52, 0.9); padding: 12px; border-radius: 6px; width: 320px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); border: 1px solid #5f6368;';
    
    // 设置HTML内容
    searchContainer.innerHTML = `
        <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#8ab4f8" viewBox="0 0 16 16" style="margin-right: 8px;">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span style="color: #8ab4f8; font-weight: 500;">节点名称搜索</span>
            </div>
            <span style="color: #aaa; font-size: 11px; font-style: italic;">在当前数据中搜索</span>
        </div>
        <div style="display: flex;">
            <input type="text" id="nodeSearchInput" placeholder="输入节点名称..." style="flex-grow: 1; background-color: #303134; border: 1px solid #5f6368; border-radius: 4px; padding: 6px 10px; color: #e8eaed; font-size: 13px;">
            <button id="nodeSearchButton" style="margin-left: 8px; background-color: #8ab4f8; border: none; border-radius: 4px; padding: 0 12px; color: #202124; font-size: 13px; cursor: pointer; font-weight: 500;">搜索</button>
        </div>
        <div id="searchResultSummary" style="margin-top: 8px; font-size: 12px; color: #aaa; display: none;">
            找到 <span id="searchResultCount">0</span> 个匹配节点
        </div>
        <div id="searchResults" style="margin-top: 4px; max-height: 200px; overflow-y: auto;">
            <!-- 搜索结果将在这里动态生成 -->
        </div>
    `;
    
    // 添加到图表容器
    graphContainer.appendChild(searchContainer);
    
    // 重新绑定事件
    const nodeSearchInput = document.getElementById('nodeSearchInput');
    const nodeSearchButton = document.getElementById('nodeSearchButton');
    
    if (nodeSearchButton) {
        nodeSearchButton.addEventListener('click', function() {
            searchNodes();
        });
    }
    
    if (nodeSearchInput) {
        nodeSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchNodes();
            }
        });
    }
}

/**
 * 搜索节点并高亮显示
 */
function searchNodes() {
    const searchInput = document.getElementById('nodeSearchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const searchResultSummary = document.getElementById('searchResultSummary');
    const searchResultCount = document.getElementById('searchResultCount');
    const searchResults = document.getElementById('searchResults');
    
    // 清空之前的搜索结果
    searchResults.innerHTML = '';
    
    // 如果搜索词为空，则隐藏结果区域和结果摘要
    if (!searchTerm) {
        searchResultSummary.style.display = 'none';
        // 清除所有高亮
        clearAllHighlights();
        return;
    }
    
    // 确保图表已初始化
    if (!myChart) {
        alert('请先执行搜索生成图表');
        return;
    }
    
    // 获取当前的图表选项
    const option = myChart.getOption();
    const graphData = option.series[0].data[0];
    
    // 存储搜索匹配的节点
    const matchedNodes = [];
    
    // 遍历所有节点查找匹配项
    function traverseTree(node, path = [], depth = 0) {
        // 检查当前节点是否匹配
        const nodeName = (node.name || '').toLowerCase();
        const nodeTableName = (node.tableName || '').toLowerCase();
        const currentPath = [...path, node.name];
        
        // 同时匹配节点名称和表名
        if (nodeName.includes(searchTerm) || nodeTableName.includes(searchTerm)) {
            matchedNodes.push({
                id: node.id,
                name: node.name,
                tableName: node.tableName || '',
                path: currentPath,
                node: node,
                depth: depth
            });
        }
        
        // 递归遍历子节点
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                traverseTree(child, currentPath, depth + 1);
            }
        }
    }
    
    // 开始遍历节点树
    traverseTree(graphData);
    
    // 更新搜索结果计数
    searchResultCount.textContent = matchedNodes.length;
    searchResultSummary.style.display = 'block';
    
    // 清除之前的高亮
    clearAllHighlights();
    
    // 如果没有找到匹配项
    if (matchedNodes.length === 0) {
        searchResults.innerHTML = '<div style="padding: 8px; color: #aaa; text-align: center;">没有找到匹配的节点</div>';
        return;
    }
    
    // 按照节点深度排序结果，根节点优先
    matchedNodes.sort((a, b) => a.depth - b.depth);
    
    // 创建搜索结果列表
    matchedNodes.forEach((match, index) => {
        const resultItem = document.createElement('div');
        resultItem.style.padding = '6px 8px';
        resultItem.style.borderRadius = '4px';
        resultItem.style.cursor = 'pointer';
        resultItem.style.marginBottom = '4px';
        resultItem.style.backgroundColor = '#35363a';
        resultItem.style.fontSize = '13px';
        resultItem.style.color = '#e8eaed';
        resultItem.setAttribute('data-node-id', match.id);
        resultItem.setAttribute('tabindex', '0'); // 使元素可聚焦，支持键盘导航
        resultItem.setAttribute('title', '点击将在图表中居中显示此节点'); // 添加提示文本
        
        // 节点路径，以 > 符号分隔
        const pathDisplay = match.path.length > 1 
            ? `<span style="color: #aaa; font-size: 11px;">${match.path.slice(0, -1).join(' > ')}</span><br>` 
            : '';
        
        // 如果节点有表名且不同于节点名，则显示表名
        const tableNameDisplay = match.tableName && match.tableName !== match.name
            ? `<span style="color: #aaa; font-size: 11px; margin-left: 4px;">(${match.tableName})</span>`
            : '';
        
        // 添加小图标提示点击会居中节点
        resultItem.innerHTML = `
            ${pathDisplay}
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-weight: 500;">${match.name}</span>${tableNameDisplay}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#8ab4f8" viewBox="0 0 16 16" style="margin-left: 4px;" title="点击居中显示">
                    <path d="M8 16a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-8a1 1 0 0 1 2 0v3a1 1 0 0 1-2 0V8zm0-3a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/>
                </svg>
            </div>
        `;
        
        // 点击结果项目时滚动到节点并高亮
        resultItem.addEventListener('click', function() {
            // 高亮搜索结果中选中的项
            highlightSearchResult(this);
            // 高亮图表中的对应节点
            highlightNode(match.node);
        });
        
        // 支持键盘操作
        resultItem.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                // 按Enter键触发点击
                this.click();
            } else if (e.key === 'ArrowDown') {
                // 按下键导航到下一个结果
                e.preventDefault();
                const nextSibling = this.nextElementSibling;
                if (nextSibling) {
                    nextSibling.focus();
                }
            } else if (e.key === 'ArrowUp') {
                // 按上键导航到上一个结果
                e.preventDefault();
                const prevSibling = this.previousElementSibling;
                if (prevSibling) {
                    prevSibling.focus();
                }
            }
        });
        
        searchResults.appendChild(resultItem);
        
        // 自动高亮第一个匹配的节点
        if (index === 0) {
            highlightSearchResult(resultItem);
            highlightNode(match.node);
        }
    });
    
    // 搜索结果中第一个项目设置焦点，方便键盘导航
    if (searchResults.firstChild) {
        setTimeout(() => {
            searchResults.firstChild.focus();
        }, 100);
    }
}

/**
 * 高亮搜索结果列表中的选中项
 */
function highlightSearchResult(resultItem) {
    // 移除所有结果项目的高亮
    const allResults = document.querySelectorAll('#searchResults > div');
    allResults.forEach(item => {
        item.style.backgroundColor = '#35363a';
        item.style.borderLeft = 'none';
    });
    
    // 高亮当前选中的结果项
    resultItem.style.backgroundColor = '#3c4043';
    resultItem.style.borderLeft = '3px solid #8ab4f8';
}

/**
 * 清除所有节点高亮
 */
function clearAllHighlights() {
    // 如果没有图表实例，不进行操作
    if (!myChart) return;
    
    // 获取当前选项并恢复原始数据
    if (window.originalTreeData) {
        const option = myChart.getOption();
        const processedData = processTreeGrouping(
            JSON.parse(JSON.stringify(window.originalTreeData)),
            document.getElementById('enable-auto-grouping')?.checked
        );
        
        option.series[0].data = [processedData];
        myChart.setOption(option);
    }
}

/**
 * 高亮指定节点
 */
function highlightNode(node) {
    if (!node || !myChart) return;
    
    console.log('高亮节点:', node.name || node);
    
    try {
        // 获取当前图表配置
        const option = myChart.getOption();
        
        // 创建一个树节点的拷贝
        let updatedData = JSON.parse(JSON.stringify(option.series[0].data[0]));
        
        // 处理树高亮状态
        updatedData = processTreeHighlight(updatedData, node);
        
        // 更新图表数据
        option.series[0].data = [updatedData];
        myChart.setOption(option, {
            replaceMerge: ['series']
        });
        
        // 确保节点可见
        scrollToNode(node.id || node, myChart);
    } catch (error) {
        console.error('高亮节点失败:', error);
    }
}

/**
 * 递归处理树节点的高亮状态
 */
function processTreeHighlight(treeNode, targetNode) {
    // 检查目标节点是否是对象或ID
    const targetId = typeof targetNode === 'object' ? targetNode.id : targetNode;
    
    // 创建节点的副本避免修改原对象
    const nodeCopy = {...treeNode};
    
    // 检查当前节点是否是目标节点
    if (nodeCopy.id === targetId || nodeCopy.name === targetId) {
        // 高亮目标节点
        nodeCopy.itemStyle = {
            color: '#ffcc00',  // 黄色背景
            borderColor: '#ff9900', // 橙色边框
            borderWidth: 3,     // 更粗的边框
            shadowBlur: 12,     // 发光效果
            shadowColor: '#ffcc00'
        };
        
        // 增大节点尺寸
        nodeCopy.symbolSize = 18;
        
        // 修改节点标签样式
        nodeCopy.label = {
            color: '#ffffff',   // 白色文字
            fontWeight: 'bold', // 粗体
            fontSize: 13,       // 增大字体
            backgroundColor: 'rgba(255, 153, 0, 0.6)',
            padding: [4, 8],
            borderRadius: 4,
            align: 'left'
        };
    } else {
        // 非目标节点使用灰色样式
        nodeCopy.itemStyle = {
            borderWidth: 1,
            opacity: 0.6,
            color: '#999999'
        };
        
        // 降低非目标节点标签的显示亮度
        if (nodeCopy.label) {
            nodeCopy.label = {
                ...nodeCopy.label,
                color: '#aaaaaa',
                opacity: 0.6
            };
        }
    }
    
    // 递归处理子节点
    if (nodeCopy.children && nodeCopy.children.length > 0) {
        nodeCopy.children = nodeCopy.children.map(child => 
            processTreeHighlight(child, targetNode)
        );
    }
    
    return nodeCopy;
}

/**
 * 滚动到指定节点
 */
function scrollToNode(nodeId, chart) {
    if (!chart) return;
    
    try {
        // 对于点击节点高亮，简单实现，确保节点可见
        // 在实际应用中，可以添加更复杂的动画效果
        chart.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            name: typeof nodeId === 'object' ? nodeId.name : nodeId
        });
    } catch (error) {
        console.error('滚动到节点失败:', error);
    }
}

// 在performSearch函数结束时确保搜索容器可见
async function performSearch() {
    // 获取搜索表单中的值
    const environment = document.getElementById('environment').value;
    const dbName = document.getElementById('dbName').value;
    const billNo = document.getElementById('billNo').value;
    const ytenant_id = document.getElementById('ytenant_id').value || null;
    
    // 验证表单
    if (!environment || !dbName || !billNo) {
        alert('请填写所有必填字段');
        return;
    }
    
    // 获取图表容器和加载指示器元素
    const graphContainer = document.getElementById('graph-container');
    const loadingIndicator = document.getElementById('loading-indicator');

    try {
        // 显示加载指示器
        loadingIndicator.style.display = 'block';
        
        // 展开图谱容器
        graphContainer.classList.add('show-graph');
        
        // 初始化图表
        initializeCharts();
        
        // 获取当前环境的数据库配置
        const currentDbConfig = dbConfigs[environment];
        
        try {
            // 调用API获取树形数据
            const treeData = await fetchDbRelationTree(
                environment, 
                dbName, 
                billNo, 
                currentDbConfig,
                ytenant_id  // 添加租户ID参数
            );
            
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';
            
            // 打印API返回数据
            console.log('API返回的原始数据:', treeData);
            
            // 确保transformToEChartsFormat函数存在
            if (typeof transformToEChartsFormat !== 'function') {
                console.error('transformToEChartsFormat函数未定义，请检查database-relation-api.js文件是否正确加载');
                // 尝试使用模拟数据
                const mockData = generateMockData(billNo);
                renderGraph(mockData);
                
                // 确保节点搜索容器可见
                setTimeout(ensureNodeSearchContainerVisible, 1000);
                return;
            }
            
            // 转换数据格式
            const formattedData = transformToEChartsFormat(treeData);
            console.log('转换后的图表数据:', formattedData);
            
            // 渲染图表
            renderGraph(formattedData);
            
            // 确保节点搜索容器可见
            setTimeout(ensureNodeSearchContainerVisible, 1000);
        } catch (error) {
            console.error('API调用失败:', error);
            loadingIndicator.style.display = 'none';
            
            // 尝试使用模拟数据
            const mockData = generateMockData(billNo);
            renderGraph(mockData);
            
            // 确保节点搜索容器可见
            setTimeout(ensureNodeSearchContainerVisible, 1000);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        loadingIndicator.style.display = 'none';
        alert(`搜索失败: ${error.message}`);
        
        // 即使失败也确保搜索容器可见
        setTimeout(ensureNodeSearchContainerVisible, 1000);
    }
} 
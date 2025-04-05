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
// ... existing code ...

        console.log('图表设置完成');
        
        // 绑定图表点击事件
        myChart.on('click', async function(params) {
// ... existing code ...
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

// 在performSearch函数结束时确保搜索容器可见
async function performSearch() {
// ... existing code ...

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
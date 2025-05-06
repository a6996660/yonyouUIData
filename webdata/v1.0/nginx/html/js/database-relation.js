/**
 * 数据库关联树形图 页面交互与渲染
 */

// DOM元素
const dbEnvironmentSelect = document.getElementById('dbEnvironment');
const dbNameInput = document.getElementById('dbName');
const dbNameSearchInput = document.getElementById('dbNameSearch');
const dbDropdown = document.getElementById('dbDropdown');
const tableCodeInput = document.getElementById('tableCode');
const tableCodeSearchInput = document.getElementById('tableCodeSearch');
const tableCodeDropdown = document.getElementById('tableCodeDropdown');
const searchButton = document.getElementById('searchButton');
const configButton = document.getElementById('configButton');
const saveConfigButton = document.getElementById('saveConfigButton');
const closeConfigModal = document.getElementById('closeConfigModal');
const configModal = document.getElementById('configModal');
const loadingIndicator = document.getElementById('loadingIndicator');
const databaseLoading = document.getElementById('databaseLoading');
const tableCodeLoading = document.getElementById('tableCodeLoading');
const graphContainer = document.getElementById('graph-container');
const nodeDetails = document.getElementById('nodeDetails');
const nodeDetailContent = document.getElementById('nodeDetailContent');

// 图表实例
let myChart = null;

// 数据库列表
let databaseList = [];

// 表单编码列表
let billNoList = [];

// 节点折叠展开锁定标志 - 控制是否允许节点展开折叠
let isNodeCollapseEnabled = true; 

// 当前查询信息
let currentQuery = {
    environment: '',
    dbName: '',
    billNo: '',
    ytenant_id: '0',
    showEntityTables: false // 添加显示实体表属性并设置默认值为false
};

// 数据库配置存储
let dbConfigs = {
    test: { host: '', port: '', username: '', password: '' },
    daily: { host: '', port: '', username: '', password: '' },
    pre: { host: '', port: '', username: '', password: '' },
    other: { host: '', port: '', username: '', password: '' }
};

// 当前选中的节点数据
let currentNodeData = null;

// 节点详情缓存
const nodeDetailsCache = new Map();

// 初始加载时从服务器加载配置
document.addEventListener('DOMContentLoaded', async function() {
    await loadDbConfigsFromServer();
    initEventListeners();
    
    // 加载数据库列表
    loadDatabaseList();
    
    // 添加调试功能
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
        debugButton.style.display = 'inline-block';
        debugButton.addEventListener('click', function() {
            debugFunctions();
        });
    }
    
    // 调试控制台输出
    console.log('页面初始化完成');
    console.log('transformToEChartsFormat函数可用:', typeof transformToEChartsFormat === 'function');
    console.log('generateMockData函数可用:', typeof generateMockData === 'function');
    console.log('ECharts库可用:', typeof echarts === 'function');
});

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 搜索按钮点击事件
    searchButton.addEventListener('click', performSearch);
    
    // 环境选择变化事件 - 触发加载数据库列表
    dbEnvironmentSelect.addEventListener('change', function() {
        loadDatabaseList();
    });
    
    // 配置导入功能
    const configImportFile = document.getElementById('config-import-file');
    const importConfigButton = document.getElementById('import-config-button');
    
    if (configImportFile && importConfigButton) {
        // 点击导入按钮时手动触发文件选择器
        importConfigButton.addEventListener('click', function() {
            configImportFile.click();
        });
        
        // 文件选择后处理导入
        configImportFile.addEventListener('change', function(event) {
            if (event.target.files && event.target.files.length > 0) {
                importConfigFromFile(event.target.files[0]);
            }
        });
    }
    
    // 数据库搜索框获得焦点时显示下拉列表
    dbNameSearchInput.addEventListener('focus', function() {
        showDatabaseDropdown();
    });
    
    // 数据库搜索框失去焦点时隐藏下拉列表（延迟隐藏，以便点击选项生效）
    dbNameSearchInput.addEventListener('blur', function() {
        setTimeout(function() {
            hideDatabaseDropdown();
        }, 200);
    });
    
    // 数据库搜索框输入事件 - 过滤数据库列表
    dbNameSearchInput.addEventListener('input', function() {
        filterDatabaseOptions(this.value);
    });
    
    // 数据库搜索框按键事件 - 上下键导航和回车键选择
    dbNameSearchInput.addEventListener('keydown', function(e) {
        handleDatabaseKeyboardNavigation(e);
    });
    
    // 表单编码搜索框获得焦点时显示下拉列表
    tableCodeSearchInput.addEventListener('focus', function() {
        showTableCodeDropdown();
    });
    
    // 表单编码搜索框失去焦点时隐藏下拉列表（延迟隐藏，以便点击选项生效）
    tableCodeSearchInput.addEventListener('blur', function() {
        setTimeout(function() {
            hideTableCodeDropdown();
        }, 200);
    });
    
    // 表单编码搜索框输入事件 - 过滤表单编码列表
    tableCodeSearchInput.addEventListener('input', function() {
        filterTableCodeOptions(this.value);
    });
    
    // 表单编码搜索框按键事件 - 上下键导航和回车键选择
    tableCodeSearchInput.addEventListener('keydown', function(e) {
        handleTableCodeKeyboardNavigation(e);
    });
    
    // 配置按钮点击事件
    configButton.addEventListener('click', function() {
        openConfigModal();
    });
    
    // 保存配置按钮点击事件
    saveConfigButton.addEventListener('click', async function() {
        try {
            // 显示加载状态
            saveConfigButton.disabled = true;
            saveConfigButton.textContent = '保存中...';
            
            // 保存配置到服务器
            await saveDbConfigsLocally();
            
            // 恢复按钮状态
            saveConfigButton.disabled = false;
            saveConfigButton.textContent = '保存配置';
            
            // 关闭模态框
            hideConfigModal();
            
            // 显示成功消息
            alert('配置已成功保存！');
            
            // 重新加载数据库列表
            loadDatabaseList();
        } catch (error) {
            // 恢复按钮状态
            saveConfigButton.disabled = false;
            saveConfigButton.textContent = '保存配置';
            
            // 显示错误消息
            alert(`保存配置失败: ${error.message}`);
        }
    });
    
    // 关闭配置模态框按钮点击事件
    closeConfigModal.addEventListener('click', function() {
        hideConfigModal();
    });
    
    // 配置模态框外部点击关闭
    configModal.addEventListener('click', function(event) {
        if (event.target === configModal) {
            hideConfigModal();
        }
    });
    
    // 切换配置标签页
    const configTabs = document.querySelectorAll('.config-tab');
    configTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchConfigTab(tabId);
        });
    });
    
    // 回车键搜索
    tableCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 窗口大小变化时调整图表大小
    window.addEventListener('resize', function() {
        if (myChart) {
            myChart.resize();
        }
        
        // 如果详情浮窗正在显示，则更新其宽度
        if (nodeDetails && nodeDetails.style.display === 'block') {
            const viewWidth = window.innerWidth;
            const detailsWidth = Math.max(350, Math.floor(viewWidth / 4));
            nodeDetails.style.width = `${detailsWidth}px`;
        }
    });
    
    // 树形图布局控制
    const applyLayoutButton = document.getElementById('apply-layout');
    if (applyLayoutButton) {
        applyLayoutButton.addEventListener('click', function() {
            applyCustomLayout();
        });
    }
    
    // 监听展开所有节点选项
    const expandAllNodes = document.getElementById('expand-all-nodes');
    if (expandAllNodes) {
        expandAllNodes.addEventListener('change', function() {
            if (myChart) {
                const option = myChart.getOption();
                option.series[0].initialTreeDepth = this.checked ? -1 : 2;
                myChart.setOption(option);
            }
        });
    }
    
    // 节点搜索功能
    const nodeSearchInput = document.getElementById('nodeSearchInput');
    const nodeSearchButton = document.getElementById('nodeSearchButton');
    
    // 搜索按钮点击事件
    if (nodeSearchButton) {
        nodeSearchButton.addEventListener('click', function() {
            searchNodes();
        });
    }
    
    // 搜索框回车事件
    if (nodeSearchInput) {
        nodeSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchNodes();
            }
        });
    }
}

/**
 * 执行搜索，获取并展示树形图
 */
async function performSearch() {
    const environment = dbEnvironmentSelect.value;
    const dbName = dbNameInput.value.trim();
    const billNo = tableCodeInput.value.trim();
    const ytenant_id = document.getElementById('ytenant_id').value.trim() || "0"; // 获取租户ID，默认为0
    const showEntityTables = document.getElementById('show-entity-tables').checked; // 获取"显示实体表"复选框状态
    
    // 更新当前查询信息
    currentQuery = {
        environment,
        dbName,
        billNo,
        ytenant_id,
        showEntityTables
    };
    
    // 验证输入
    if (!dbName) {
        alert('请选择数据库！');
        dbNameSearchInput.focus();
        return;
    }
    
    if (!billNo) {
        alert('请选择表单编码！');
        tableCodeSearchInput.focus();
        return;
    }
    
    try {
        // 显示加载指示器
        loadingIndicator.style.display = 'block';
        
        // 展开图谱容器
        graphContainer.classList.add('show-graph');
        
        // 初始化图表
        initializeCharts();
        
        // 重置原始树数据，确保不会使用之前查询的数据
        window.originalTreeData = null;
        
        // 获取当前环境的数据库配置
        const currentDbConfig = dbConfigs[environment];
        
        try {
            // 根据"显示实体表"选项状态调用不同的API
            let treeData;
            if (showEntityTables) {
                console.log('调用包含实体表的API...');
                // 调用带实体表的API
                treeData = await fetchDbRelationTreeWithEntity(
                    environment, 
                    dbName, 
                    billNo, 
                    currentDbConfig,
                    ytenant_id
                );
            } else {
                console.log('调用标准API...');
                // 调用标准API
                treeData = await fetchDbRelationTree(
                    environment, 
                    dbName, 
                    billNo, 
                    currentDbConfig,
                    ytenant_id
                );
            }
            
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';
            
            // 打印API返回数据
            console.log('API返回的原始数据:', treeData);
            
            // 确保transformToEChartsFormat函数存在
            if (typeof transformToEChartsFormat !== 'function') {
                console.error('transformToEChartsFormat函数未定义，请检查database-relation-api.js文件是否正确加载');
                // 尝试使用模拟数据
                const mockData = generateMockData(billNo);
                
                // 即使使用模拟数据，也保存查询历史
                window.saveQueryHistory({
                    environment,
                    dbName,
                    billNo,
                    ytenant_id,
                    showEntityTables
                });
                
                // 更新历史记录显示
                loadQueryHistory();
                
                renderGraph(mockData);
                
                // 确保节点搜索容器可见
                setTimeout(ensureNodeSearchContainerVisible, 1000);
                
                // 确保控制浮窗可见
                setTimeout(ensureTreeControlsVisible, 1000);
                return;
            }
            
            // 转换数据格式
            const formattedData = transformToEChartsFormat(treeData);
            console.log('转换后的图表数据:', formattedData);
            
            // 保存当前查询到历史记录
            window.saveQueryHistory({
                environment,
                dbName,
                billNo,
                ytenant_id,
                showEntityTables
            });
            
            // 更新查询历史显示
            loadQueryHistory();
            
            // 渲染图表
            renderGraph(formattedData);
            
            // 确保节点搜索容器可见
            setTimeout(ensureNodeSearchContainerVisible, 1000);
            
            // 确保控制浮窗可见
            setTimeout(ensureTreeControlsVisible, 1000);
        } catch (error) {
            console.error('API调用失败:', error);
            loadingIndicator.style.display = 'none';
            
            // 尝试使用模拟数据
            const mockData = generateMockData(billNo);
            
            // 即使使用模拟数据，也保存查询历史
            window.saveQueryHistory({
                environment,
                dbName,
                billNo,
                ytenant_id,
                showEntityTables
            });
            
            // 更新历史记录显示
            loadQueryHistory();
            
            renderGraph(mockData);
            
            // 确保节点搜索容器可见
            setTimeout(ensureNodeSearchContainerVisible, 1000);
            
            // 确保控制浮窗可见
            setTimeout(ensureTreeControlsVisible, 1000);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        loadingIndicator.style.display = 'none';
        alert(`搜索失败: ${error.message}`);
        
        // 即使失败也确保搜索容器可见
        setTimeout(ensureNodeSearchContainerVisible, 1000);
        
        // 即使失败也确保控制浮窗可见
        setTimeout(ensureTreeControlsVisible, 1000);
    }
}

/**
 * 渲染树形关系图表
 * 
 * @param {Object} data 树形图数据
 */
function renderGraph(data) {
    console.log('开始渲染图表，输入数据:', data);
    
    if (!data) {
        console.error('没有数据可渲染');
        // 创建错误信息元素而不是替换整个容器内容
        clearAndShowError(graphContainer, '无效的数据结构，无法渲染图表');
        return;
    }
    
    // 检查ECharts是否可用
    if (typeof echarts === 'undefined') {
        console.error('ECharts库未加载，无法渲染图表');
        // 创建错误信息元素而不是替换整个容器内容
        clearAndShowError(graphContainer, '图表库未正确加载，请刷新页面重试');
        return;
    }
    
    // 获取字体大小滑块设置的值并初始化全局变量
    try {
        const nodeFontSizeSlider = document.getElementById('node-font-size');
        if (nodeFontSizeSlider) {
            window.baseFontSize = parseInt(nodeFontSizeSlider.value);
            console.log("初始化字体大小为:", window.baseFontSize);
        }
    } catch (error) {
        console.warn("初始化字体大小失败:", error);
    }
    
    // 保存节点搜索容器元素的引用
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
        
        // 获取字体大小滑块设置的值
        let fontSizeSlider = document.getElementById('node-font-size');
        const nodeFontSize = fontSizeSlider ? parseInt(fontSizeSlider.value) : 13;
        
        // 保存字体大小为全局变量，供其他函数使用
        window.baseFontSize = nodeFontSize;
        
        // 检查是否需要全部展开节点
        const expandAllNodesCheckbox = document.getElementById('expand-all-nodes');
        const shouldExpandAll = expandAllNodesCheckbox && expandAllNodesCheckbox.checked;
        
        // 如果需要展开所有节点，对处理后的数据应用递归展开处理
        if (shouldExpandAll && processedData) {
            // 递归处理数据，确保包括分组节点在内的所有节点都被展开
            function ensureAllNodesExpanded(node) {
                if (!node) return;
                
                // 确保节点展开
                if (node.collapsed !== undefined) {
                    node.collapsed = false;
                }
                
                // 处理子节点
                if (node.children && node.children.length > 0) {
                    node.children.forEach(ensureAllNodesExpanded);
                }
            }
            
            // 应用递归展开
            ensureAllNodesExpanded(processedData);
            console.log('确保所有节点已展开，包括分组节点');
        }
        
        // 设置图表配置
        const option = {
            backgroundColor: '#303134',
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const data = params.data;
                    let tooltip = `<div style="font-weight:bold;margin-bottom:5px;">${data.name}</div>`;
                    
                    if (data.tableName) {
                        tooltip += `<div>表名: ${data.tableName}</div>`;
                    }
                    
                    return tooltip;
                }
            },
            toolbox: {
                show: true,
                feature: {
                    zoom: {
                        show: true,
                        title: {
                            zoom: '放大',
                            back: '还原'
                        }
                    },
                    restore: {
                        show: true,
                        title: '重置'
                    },
                    saveAsImage: {
                        show: true,
                        title: '保存为图片'
                    }
                },
                iconStyle: {
                    borderColor: '#8ab4f8'
                },
                emphasis: {
                    iconStyle: {
                        borderColor: '#aecbfa'
                    }
                },
                right: 20,
                top: 20
            },
            series: [
                {
                    type: 'tree',
                    data: [processedData],
                    top: '8%',
                    bottom: '8%',
                    left: '5%',
                    right: '20%',
                    layout: 'orthogonal',
                    orient: 'LR',  // 从左到右水平布局
                    symbol: 'emptyCircle',
                    symbolSize: nodeSize,
                    initialTreeDepth: -1, // 全部展开
                    animationDurationUpdate: 750,
                    roam: true, // 允许缩放和平移
                    scaleLimit: {
                        min: 0.3,
                        max: 5 // 允许更大的缩放比例
                    },
                    emphasis: {
                        focus: 'descendant'
                    },
                    label: {
                        position: 'right',
                        rotate: 0,
                        verticalAlign: 'middle',
                        align: 'left',
                        fontSize: nodeFontSize, // 使用滑块设置的字体大小
                        fontFamily: 'Microsoft YaHei, Arial, sans-serif', // 使用微软雅黑提高清晰度
                        color: '#e8eaed',
                        distance: 10, // 增加与节点的距离
                        formatter: function(params) {
                            // 完整显示文本，不再截断
                            return params.name;
                        },
                        rich: {
                            // 添加富文本配置，确保对齐
                            name: {
                                align: 'left',
                                padding: [0, 15, 0, 0],
                                width: 'auto'
                            }
                        }
                    },
                    leaves: {
                        label: {
                            position: 'right',
                            rotate: 0,
                            verticalAlign: 'middle',
                            align: 'left',
                            fontSize: nodeFontSize - 1, // 叶子节点字体略小
                            fontFamily: 'Microsoft YaHei, Arial, sans-serif', // 使用微软雅黑提高清晰度
                            color: '#d0d0d0',
                            distance: 10, // 增加与节点的距离
                            formatter: function(params) {
                                // 叶子节点也完整显示文本
                                return params.name;
                            }
                        }
                    },
                    expandAndCollapse: isNodeCollapseEnabled, // 设置展开/折叠的配置 - 根据锁定状态设置
                    animationDuration: 550,
                    animationDurationUpdate: 750,
                    lineStyle: {
                        color: '#5f6368',
                        width: 1.2, // 增加线条宽度
                        curveness: treeMetrics.nodeCount > 100 ? 0.4 : 0.6 // 增加曲率
                    },
                    itemStyle: {
                        borderWidth: 1.2 // 增加边框宽度
                    },
                    // 配置布局参数 - 与applyCustomLayout保持一致的配置方法
                    force: {
                        repulsion: treeMetrics.recommendedLayerPadding * 0.5, // 斥力与层级间距成正比
                        edgeLength: treeMetrics.recommendedNodeGap * 2, // 边长与节点间距成正比
                        gravity: 0.1,
                        layoutAnimation: treeMetrics.nodeCount <= 250 // 节点太多时禁用布局动画
                    },
                    // 始终展示到所有末级节点
                    initialTreeDepth: -1
                }
            ]
        };
        
        console.log('设置图表选项');
        
        // 设置图表
        myChart.setOption(option);
        console.log('图表设置完成');
        
        // 公共函数：更新字体大小和距离
        function updateFontSizeAndDistance(zoomFactor) {
            // 调用全局的updateNodeLabelSize函数
            window.updateNodeLabelSize();
        }
        
        // 直接监听鼠标滚轮事件以捕获缩放操作
        myChart.getZr().on('mousewheel', function() {
            setTimeout(function() {
                window.updateNodeLabelSize();
            }, 50);
        });
        
        // 监听所有可能的缩放相关事件
        myChart.on('restore', window.updateNodeLabelSize);
        myChart.on('dataZoom', window.updateNodeLabelSize);
        myChart.on('geoRoam', window.updateNodeLabelSize);
        myChart.on('graphRoam', window.updateNodeLabelSize);
        myChart.on('brush', window.updateNodeLabelSize);
        
        // 监听工具栏的缩放按钮事件
        myChart.on('magictypechanged', window.updateNodeLabelSize);
        myChart.on('datarangeselected', window.updateNodeLabelSize);
        
        // 监听字体大小滑块的变化
        fontSizeSlider = document.getElementById('node-font-size');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', function() {
                // 更新全局字体大小变量
                window.baseFontSize = parseInt(this.value);
                // 更新图表中的字体大小
                window.updateNodeLabelSize();
            });
        }
        
        // 全局通用的更新节点标签大小函数
        window.updateNodeLabelSize = function() {
            console.log("全局updateNodeLabelSize被调用");
            // 如果图表未初始化，直接返回
            if (!myChart) {
                console.warn("图表尚未初始化，无法更新节点标签大小");
                return;
            }
            
            // 通过图表容器元素的变换矩阵获取当前缩放级别
            const transform = myChart.getZr().painter.getViewportRoot().transform;
            if (!transform || !transform[0]) {
                console.warn("无法获取图表变换矩阵，可能图表未完全初始化");
                return;
            }
            
            // 获取缩放因子
            const zoomFactor = transform[0];
            // 使用指数函数增强缩放效果 (zoomFactor^0.4 * 2.5)
            // 这样会使小的缩放也有明显的变化，并且随着缩放的增加效果越来越明显
            const scaleFactor = Math.max(Math.pow(zoomFactor, 0.4) * 2.5, 1);
            
            // 基础值 - 从全局变量获取或使用默认值
            const baseFontSize = window.baseFontSize || 13; // 使用通过滑块设置的字体大小
            const baseNodeSize = 10;
            
            console.log("检测到缩放操作，zoomFactor=", zoomFactor, "调整后的scaleFactor=", scaleFactor, "基础字体大小=", baseFontSize);
            
            // 构建新的图表配置
            const newOption = {
                series: [{
                    symbolSize: Math.max(baseNodeSize * Math.sqrt(scaleFactor), baseNodeSize),
                    label: {
                        fontSize: Math.max(baseFontSize * scaleFactor, baseFontSize),
                        fontWeight: zoomFactor > 1.2 ? 'bold' : 'normal',
                        fontFamily: 'Microsoft YaHei, Arial, sans-serif',
                        distance: Math.max(10 * Math.sqrt(zoomFactor), 10),
                        // 根据缩放添加阴影效果，增强文字可见性
                        textShadowColor: zoomFactor > 1.2 ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
                        textShadowBlur: zoomFactor > 1.2 ? 3 : 0,
                        // 调整文字颜色，缩放时更亮
                        color: zoomFactor > 1.5 ? '#ffffff' : '#e8eaed',
                        // 增加文字背景，提高可读性
                        backgroundColor: zoomFactor > 1.8 ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                        padding: zoomFactor > 1.8 ? [2, 4, 2, 4] : [0, 0, 0, 0],
                        borderRadius: 3
                    },
                    leaves: {
                        label: {
                            fontSize: Math.max((baseFontSize - 1) * scaleFactor, baseFontSize - 1),
                            fontWeight: zoomFactor > 1.2 ? 'bold' : 'normal',
                            fontFamily: 'Microsoft YaHei, Arial, sans-serif',
                            distance: Math.max(10 * Math.sqrt(zoomFactor), 10),
                            // 根据缩放添加阴影效果，增强文字可见性
                            textShadowColor: zoomFactor > 1.2 ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
                            textShadowBlur: zoomFactor > 1.2 ? 3 : 0,
                            // 调整文字颜色，缩放时更亮
                            color: zoomFactor > 1.5 ? '#f0f0f0' : '#d0d0d0'
                        }
                    },
                    // 增强节点样式
                    itemStyle: {
                        borderWidth: zoomFactor > 1.5 ? 2 : 1.2,
                        shadowBlur: zoomFactor > 1.2 ? 6 : 0,
                        shadowColor: 'rgba(30, 144, 255, 0.5)'
                    },
                    // 增强连线样式
                    lineStyle: {
                        width: zoomFactor > 1.5 ? 1.8 : (zoomFactor > 1.2 ? 1.5 : 1.2),
                        shadowBlur: zoomFactor > 1.5 ? 3 : 0,
                        shadowColor: 'rgba(30, 144, 255, 0.3)'
                    }
                }]
            };
            
            console.log("应用新的图表选项:", newOption);
            
            // 应用新配置
            myChart.setOption(newOption);
            console.log("已应用字体大小更新");
        };
        
        // 绑定图表点击事件
        myChart.on('click', async function(params) {
            console.log('图表节点点击:', params.data);
            
            // 防抖处理：如果500ms内多次触发，以最后一次为准
            const eventTime = new Date().getTime();
            if (window.lastClickTime && eventTime - window.lastClickTime < 500) {
                console.log('点击过于频繁，忽略此次点击');
                return;
            }
            window.lastClickTime = eventTime;
            
            // 隐藏缩放提示
            hideZoomHint();
            
            if (params.data) {
                try {
                    // 防止重复点击节点重复请求
                    const currentNodeId = params.data.id || '';
                    
                    // 如果正在加载或者点击了同一个节点，则忽略
                    if (isLoadingNodeDetails || currentNodeId === lastClickedNodeId) {
                        console.log('跳过重复请求或正在加载中的请求');
                        return;
                    }
                    
                    // 设置加载标记和记录节点ID
                    isLoadingNodeDetails = true;
                    lastClickedNodeId = currentNodeId;
                    
                    currentNodeData = params.data;
                    
                    // 检查是否是分组节点
                    if (params.data.isGroup === true) {
                        // 分组节点显示分组信息
                        const groupInfo = {
                            tableName: params.data.tableName.replace('_group', ''),
                            data: {
                                '节点类型': '分组节点',
                                '节点数量': params.data.children ? params.data.children.length : 0,
                                '节点名称': params.data.name
                            }
                        };
                        showNodeDetails(groupInfo);
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    // 获取当前环境的数据库配置
                    const environment = dbEnvironmentSelect.value;
                    const dbName = dbNameInput.value.trim();
                    const currentDbConfig = dbConfigs[environment];
                    const ytenant_id = document.getElementById('ytenant_id').value.trim() || "0"; // 获取租户ID
                    
                    // 防止获取非表节点的详情
                    if (!params.data.tableName || params.data.tableName.includes('_group')) {
                        showNodeDetails({ 
                            tableName: params.data.tableName || '未知表',
                            data: { 
                                id: params.data.id || '未知ID', 
                                name: params.data.name || '未知名称',
                                '节点类型': '导航节点'
                            }
                        });
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    console.log('获取表详情参数:', {
                        environment,
                        dbName,
                        tableName: params.data.tableName,
                        id: params.data.id,
                        ytenant_id // 添加租户ID
                    });
                    
                    // 构建缓存键
                    const cacheKey = `${environment}_${dbName}_${params.data.tableName}_${params.data.id}_${ytenant_id}`;
                    
                    // 检查缓存中是否已有该节点的详情数据
                    if (nodeDetailsCache.has(cacheKey)) {
                        console.log('使用缓存的节点详情数据');
                        showNodeDetails(nodeDetailsCache.get(cacheKey));
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    // 显示加载提示
                    loadingIndicator.style.display = 'block';
                    loadingIndicator.textContent = '正在加载节点详情...';
                    
                    // 尝试获取节点详细信息
                    try {
                        const requestData = {
                            environment: environment,
                            dbName: dbName,
                            tableName: params.data.tableName,
                            id: params.data.id,
                            ytenant_id: ytenant_id,
                            dbConfig: currentDbConfig
                        };
                        
                        const details = await window.fetchTableDetails(requestData);
                        
                        // 隐藏加载提示
                        loadingIndicator.style.display = 'none';
                        
                        // 将结果存入缓存
                        nodeDetailsCache.set(cacheKey, details);
                        
                        showNodeDetails(details);
                        isLoadingNodeDetails = false;
                        lastClickedNodeId = null; // 重置点击的节点ID，允许再次点击同一节点
                    } catch (error) {
                        // 隐藏加载提示
                        loadingIndicator.style.display = 'none';
                        
                        console.warn('无法获取详细信息，使用节点数据:', error);
                        // 使用现有节点数据显示
                        showNodeDetails({ 
                            tableName: params.data.tableName,
                            data: { id: params.data.id, name: params.data.name, '错误信息': error.message }
                        });
                        isLoadingNodeDetails = false;
                        lastClickedNodeId = null; // 重置点击的节点ID，允许再次点击同一节点
                    }
                } catch (error) {
                    console.error('处理节点点击事件失败:', error);
                    alert('处理节点点击事件失败: ' + error.message);
                    isLoadingNodeDetails = false;
                    lastClickedNodeId = null;
                }
            } else {
                // 点击了图表空白区域，隐藏详情面板
                hideNodeDetails();
                isLoadingNodeDetails = false;
            }
        });
        
        // 绑定图表背景点击事件，关闭节点详情
        myChart.getZr().on('click', function(event) {
            // 如果点击的是空白处（没有触发图表节点点击事件）
            if (!event.target) {
                hideNodeDetails();
            }
        });
        
        // 检查图表是否正确渲染
        setTimeout(() => {
            if (graphContainer.querySelector('canvas')) {
                console.log('图表已成功渲染，找到canvas元素');
                
                // 确保节点搜索容器可见
                ensureNodeSearchContainerVisible();
                
                // 确保控制浮窗可见
                ensureTreeControlsVisible();
            } else {
                console.error('图表可能未正确渲染，未找到canvas元素');
            }
        }, 500);
        
        // 添加自定义事件处理，区分节点的点击区域
        myChart.getZr().on('mousemove', function(event) {
            // 获取鼠标坐标下的图形元素
            const hoveredEl = event.target;
            
            // 检查是否悬停在节点上
            if (hoveredEl) {
                // 检查是否是节点的圆点
                const isSymbol = hoveredEl.parent && hoveredEl.parent.isSymbol;
                const isLabel = hoveredEl.style && hoveredEl.style.text;
                
                // 获取悬停的节点数据
                let nodeData = null;
                if (hoveredEl.dataIndex !== undefined) {
                    try {
                        const chartOption = myChart.getOption();
                        nodeData = chartOption.series[0].data[hoveredEl.dataIndex];
                    } catch (e) {
                        console.warn('获取节点数据失败:', e);
                    }
                }
                
                // 是否是非叶子节点
                const hasChildren = nodeData && nodeData.children && nodeData.children.length > 0;
                
                // 根据悬停区域修改鼠标样式和标题
                if (isSymbol) {
                    // 检查是否锁定了折叠功能
                    if (!isNodeCollapseEnabled) {
                        // 锁定状态下，圆点显示为禁用样式
                        document.body.style.cursor = 'not-allowed';
                        
                        // 添加悬停提示
                        if (hoveredEl.parent) {
                            hoveredEl.parent.attr({
                                title: '节点展开/折叠功能已锁定',
                                cursor: 'not-allowed'
                            });
                        }
                    } else {
                        // 未锁定状态下，圆点显示为可点击样式
                        document.body.style.cursor = 'pointer';
                        
                        // 添加悬停提示
                        if (hoveredEl.parent) {
                            hoveredEl.parent.attr({
                                title: hasChildren ? '点击展开/折叠节点' : '叶子节点',
                                cursor: 'pointer'
                            });
                        }
                    }
                } else if (isLabel) {
                    // 在文本上显示指针样式（表示可点击查看详情）
                    document.body.style.cursor = 'pointer';
                    
                    // 添加悬停提示
                    hoveredEl.attr({
                        title: '点击查看节点详情',
                        cursor: 'pointer'
                    });
                } else {
                    // 其他区域恢复默认样式
                    document.body.style.cursor = 'default';
                }
            } else {
                // 不在任何元素上时恢复默认样式
                document.body.style.cursor = 'default';
            }
        });
    } catch (error) {
        console.error('渲染图表失败:', error);
        // 创建错误信息元素而不是替换整个容器内容
        clearAndShowError(graphContainer, `图表渲染失败: ${error.message}`);
        
        // 即使渲染失败，也尝试恢复节点搜索容器和控制浮窗
        setTimeout(() => {
            ensureNodeSearchContainerVisible();
            ensureTreeControlsVisible();
        }, 100);
    }
}

/**
 * 在保留控制元素的同时清除图表容器并显示错误消息
 */
function clearAndShowError(container, errorMessage) {
    // 保留控制浮窗和节点搜索容器
    const treeControls = document.getElementById('tree-controls');
    const nodeSearchContainer = document.getElementById('nodeSearchContainer');
    
    // 临时存储元素
    const elementsToKeep = [];
    if (treeControls) elementsToKeep.push(treeControls);
    if (nodeSearchContainer) elementsToKeep.push(nodeSearchContainer);
    
    // 临时移除元素
    elementsToKeep.forEach(el => {
        if (el.parentNode === container) {
            container.removeChild(el);
        }
    });
    
    // 清除容器内容
    container.innerHTML = '';
    
    // 创建错误信息元素
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'text-align:center;padding:20px;color:#e8eaed';
    errorDiv.textContent = errorMessage;
    
    // 添加错误信息
    container.appendChild(errorDiv);
    
    // 重新添加保存的元素
    elementsToKeep.forEach(el => container.appendChild(el));
    
    // 确保控制浮窗和搜索容器可见
    setTimeout(() => {
        ensureNodeSearchContainerVisible();
        ensureTreeControlsVisible();
    }, 100);
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
 * 显示节点详情
 */
function showNodeDetails(details) {
    nodeDetailContent.innerHTML = '';
    
    if (!details || !details.tableName) {
        nodeDetailContent.innerHTML = '<p>无法获取详细信息</p>';
        nodeDetails.style.display = 'block';
        return;
    }
    
    // 存储当前正在编辑的节点信息
    currentEditingNodeId = details.data.id;
    currentEditingTableName = details.tableName;
    currentEditingTenantId = details.data.tenant_id || '0';
    currentEditingDbName = document.getElementById('dbName').value.trim();
    
    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.left = '10px';
    closeButton.style.top = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.color = '#e8eaed';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '2px 8px';
    closeButton.style.borderRadius = '4px';
    closeButton.title = '关闭详情';
    
    // 添加悬停效果
    closeButton.addEventListener('mouseover', function() {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    closeButton.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'transparent';
    });
    
    // 添加点击事件
    closeButton.addEventListener('click', function() {
        hideNodeDetails();
    });
    
    // 添加详情标题和节点信息
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.marginBottom = '16px';
    titleContainer.style.paddingLeft = '40px'; // 为左侧关闭按钮留出空间
    
    const title = document.createElement('h3');
    // 使用具体节点名称作为标题，优先使用name或cName字段
    const nodeName = details.data.name || details.data.cName || details.data.cBillNo || details.data.cCode || details.tableName;
    title.textContent = nodeName;
    title.style.margin = '0';
    title.style.flex = '1';
    
    titleContainer.appendChild(title);
    
    nodeDetailContent.appendChild(titleContainer);
    nodeDetailContent.appendChild(closeButton);
    
    // 创建表格显示详情
    const table = document.createElement('table');
    
    // 表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['字段', '值'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 表体
    const tbody = document.createElement('tbody');
    
    // 添加所有字段信息
    if (details.data) {
        // 按字段名排序，把重要字段排在前面
        const priorityFields = ['id', 'name', 'cName', 'cBillNo', 'cCode', '节点类型', '节点数量'];
        const fieldEntries = Object.entries(details.data);
        
        // 按优先级排序
        fieldEntries.sort((a, b) => {
            const indexA = priorityFields.indexOf(a[0]);
            const indexB = priorityFields.indexOf(b[0]);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a[0].localeCompare(b[0]);
        });
        
        fieldEntries.forEach(([key, value]) => {
            if (key === 'tableName' || key === 'children') return; // 跳过这些字段
            
            const row = document.createElement('tr');
            
            const labelCell = document.createElement('th');
            labelCell.textContent = key;
            
            const valueCell = document.createElement('td');
            const displayValue = value !== null && value !== undefined ? String(value) : '';
            
            // 设置值并添加完整内容作为提示
            valueCell.textContent = displayValue;
            valueCell.title = displayValue; // 鼠标悬停时显示完整值
            
            row.appendChild(labelCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });
    }
    
    table.appendChild(tbody);
    nodeDetailContent.appendChild(table);
    
    // 显示详情面板
    nodeDetails.style.display = 'block';
    
    // 计算位置 - 将详情面板显示在右侧
    const containerRect = graphContainer.getBoundingClientRect();
    // 将详情面板宽度从固定值修改为页面宽度的四分之一
    const viewWidth = window.innerWidth;
    const detailsWidth = Math.max(350, Math.floor(viewWidth / 4)); // 保证最小宽度为350px
    
    // 设置位置 - 距离右侧10px
    nodeDetails.style.position = 'absolute';
    nodeDetails.style.right = '10px';
    nodeDetails.style.top = '60px'; // 设置顶部位置，避免遮挡工具栏
    nodeDetails.style.zIndex = '100';
    nodeDetails.style.width = `${detailsWidth}px`;
    nodeDetails.style.maxHeight = `calc(90vh - 70px)`; // 减少高度，避免超出容器
    nodeDetails.style.overflow = 'hidden'; // 防止整体溢出
    nodeDetails.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'; // 添加阴影效果提高可视性
    
    // 确保内容区域可滚动
    nodeDetailContent.style.maxHeight = `calc(90vh - 150px)`; // 为内容区域设置最大高度
    nodeDetailContent.style.overflowY = 'auto'; // 设置垂直方向可滚动
    nodeDetailContent.style.overflowX = 'hidden'; // 水平方向隐藏溢出
    
    // 隐藏操作按钮
    document.getElementById('nodeDetailActions').style.display = 'none';
}

/**
 * 隐藏节点详情
 */
function hideNodeDetails() {
    nodeDetails.style.display = 'none';
    // 重置编辑状态
    document.getElementById('nodeDetailActions').style.display = 'none';
    editedFields = {};
    currentEditingNodeId = null;
    currentEditingTableName = null;
    currentEditingTenantId = null;
    currentEditingDbName = null;
}

/**
 * 获取当前环境的数据库配置
 * 
 * @returns {Object} 数据库配置对象
 */
function getDbConfig() {
    const environment = dbEnvironmentSelect.value;
    return dbConfigs[environment] || { host: '', port: '', username: '', password: '' };
}

/**
 * 打开配置模态框
 */
function openConfigModal() {
    // 填充配置表单
    populateConfigForm();
    
    // 显示模态框
    configModal.style.display = 'flex';
}

/**
 * 关闭配置模态框
 */
function hideConfigModal() {
    configModal.style.display = 'none';
}

/**
 * 切换配置标签页
 */
function switchConfigTab(tabId) {
    // 移除所有标签和面板的活动状态
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.config-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 设置选中的标签和面板为活动状态
    document.querySelector(`.config-tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-panel`).classList.add('active');
}

/**
 * 从服务器加载数据库配置
 */
async function loadDbConfigsFromServer() {
    try {
        // 显示加载状态
        const message = document.createElement('div');
        message.textContent = '正在加载配置...';
        message.style.position = 'fixed';
        message.style.top = '10px';
        message.style.right = '10px';
        message.style.padding = '8px 12px';
        message.style.backgroundColor = '#8ab4f8';
        message.style.color = '#202124';
        message.style.borderRadius = '4px';
        message.style.zIndex = '2000';
        document.body.appendChild(message);
        
        // 从服务器获取配置
        const configs = await fetchDbConfigsFromServer();
        
        // 更新配置对象
        dbConfigs = {
            test: configs.test || { host: '', port: '', username: '', password: '' },
            daily: configs.daily || { host: '', port: '', username: '', password: '' },
            pre: configs.pre || { host: '', port: '', username: '', password: '' },
            other: configs.other || { host: '', port: '', username: '', password: '' }
        };
        
        // 移除加载消息
        document.body.removeChild(message);
    } catch (error) {
        console.error('加载数据库配置失败:', error);
        
        // 使用默认配置
        dbConfigs = {
            test: { host: 'localhost', port: '3306', username: 'root', password: '' },
            daily: { host: 'localhost', port: '3306', username: 'root', password: '' },
            pre: { host: 'localhost', port: '3306', username: 'root', password: '' },
            other: { host: 'localhost', port: '3306', username: 'root', password: '' }
        };
        
        // 显示错误消息
        const errorMessage = document.createElement('div');
        errorMessage.textContent = '无法从服务器加载配置，已使用默认配置';
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '10px';
        errorMessage.style.right = '10px';
        errorMessage.style.padding = '8px 12px';
        errorMessage.style.backgroundColor = '#F28B82';
        errorMessage.style.color = '#202124';
        errorMessage.style.borderRadius = '4px';
        errorMessage.style.zIndex = '2000';
        document.body.appendChild(errorMessage);
        
        // 3秒后移除错误消息
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 3000);
    }
}

/**
 * 将配置保存到服务器
 */
async function saveDbConfigsLocally() {
    // 从表单获取配置
    const configs = {
        test: {
            host: document.getElementById('test-host').value,
            port: document.getElementById('test-port').value,
            username: document.getElementById('test-username').value,
            password: document.getElementById('test-password').value
        },
        daily: {
            host: document.getElementById('daily-host').value,
            port: document.getElementById('daily-port').value,
            username: document.getElementById('daily-username').value,
            password: document.getElementById('daily-password').value
        },
        pre: {
            host: document.getElementById('pre-host').value,
            port: document.getElementById('pre-port').value,
            username: document.getElementById('pre-username').value,
            password: document.getElementById('pre-password').value
        },
        other: {
            host: document.getElementById('other-host').value,
            port: document.getElementById('other-port').value,
            username: document.getElementById('other-username').value,
            password: document.getElementById('other-password').value
        }
    };
    
    // 更新配置对象
    dbConfigs = configs;
    
    // 保存到服务器，调用API函数
    await saveDbConfigsToServer(configs);
}

/**
 * 将配置填充到表单中
 */
function populateConfigForm() {
    // 测试环境
    document.getElementById('test-host').value = dbConfigs.test.host || '';
    document.getElementById('test-port').value = dbConfigs.test.port || '';
    document.getElementById('test-username').value = dbConfigs.test.username || '';
    document.getElementById('test-password').value = dbConfigs.test.password || '';
    
    // 日常环境
    document.getElementById('daily-host').value = dbConfigs.daily.host || '';
    document.getElementById('daily-port').value = dbConfigs.daily.port || '';
    document.getElementById('daily-username').value = dbConfigs.daily.username || '';
    document.getElementById('daily-password').value = dbConfigs.daily.password || '';
    
    // 预发环境
    document.getElementById('pre-host').value = dbConfigs.pre.host || '';
    document.getElementById('pre-port').value = dbConfigs.pre.port || '';
    document.getElementById('pre-username').value = dbConfigs.pre.username || '';
    document.getElementById('pre-password').value = dbConfigs.pre.password || '';
    
    // 其他环境
    document.getElementById('other-host').value = dbConfigs.other.host || '';
    document.getElementById('other-port').value = dbConfigs.other.port || '';
    document.getElementById('other-username').value = dbConfigs.other.username || '';
    document.getElementById('other-password').value = dbConfigs.other.password || '';
}

/**
 * 调试函数引用和数据结构
 */
function debugFunctions() {
    console.log('======= 调试信息 =======');
    console.log('transformToEChartsFormat函数:', typeof transformToEChartsFormat === 'function');
    console.log('generateMockData函数:', typeof generateMockData === 'function');
    
    try {
        // 生成并处理一些模拟数据
        const mockData = {
            rootNode: {
                tableName: 'test_table',
                id: 'test123',
                attributes: {
                    name: '测试节点'
                },
                children: []
            }
        };
        
        console.log('模拟数据:', mockData);
        
        if (typeof transformToEChartsFormat === 'function') {
            const formattedData = transformToEChartsFormat(mockData);
            console.log('格式化后的数据:', formattedData);
            
            if (myChart) {
                renderGraph(formattedData);
                console.log('图表渲染调用完成');
            } else {
                console.error('图表实例不存在');
            }
        } else {
            console.error('transformToEChartsFormat函数未定义');
        }
    } catch (error) {
        console.error('调试过程中出错:', error);
    }
    
    console.log('========================');
}

/**
 * 初始化图表
 */
function initializeCharts() {
    try {
        // 初始化树形图
        myChart = echarts.init(graphContainer);
        console.log('ECharts图表初始化成功');
        
        // 防止重复请求的标记
        let isLoadingNodeDetails = false;
        // 缓存上一次点击的节点ID，避免连续点击同一节点重复请求
        let lastClickedNodeId = null;
        
        // 绑定图表事件
        myChart.on('finished', function() {
            console.log('图表渲染完成');
            showZoomHint();
        });
        
        // 绑定缩放和平移事件
        myChart.on('datazoom', function() {
            console.log('图表被缩放');
        });
        
        // 绑定图表点击事件
        myChart.on('click', async function(params) {
            console.log('图表节点点击:', params.data);
            
            // 防抖处理：如果500ms内多次触发，以最后一次为准
            const eventTime = new Date().getTime();
            if (window.lastClickTime && eventTime - window.lastClickTime < 500) {
                console.log('点击过于频繁，忽略此次点击');
                return;
            }
            window.lastClickTime = eventTime;
            
            // 隐藏缩放提示
            hideZoomHint();
            
            if (params.data) {
                try {
                    // 防止重复点击节点重复请求
                    const currentNodeId = params.data.id || '';
                    
                    // 如果正在加载或者点击了同一个节点，则忽略
                    if (isLoadingNodeDetails || currentNodeId === lastClickedNodeId) {
                        console.log('跳过重复请求或正在加载中的请求');
                        return;
                    }
                    
                    // 设置加载标记和记录节点ID
                    isLoadingNodeDetails = true;
                    lastClickedNodeId = currentNodeId;
                    
                    currentNodeData = params.data;
                    
                    // 检查是否是分组节点
                    if (params.data.isGroup === true) {
                        // 分组节点显示分组信息
                        const groupInfo = {
                            tableName: params.data.tableName.replace('_group', ''),
                            data: {
                                '节点类型': '分组节点',
                                '节点数量': params.data.children ? params.data.children.length : 0,
                                '节点名称': params.data.name
                            }
                        };
                        showNodeDetails(groupInfo);
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    // 获取当前环境的数据库配置
                    const environment = dbEnvironmentSelect.value;
                    const dbName = dbNameInput.value.trim();
                    const currentDbConfig = dbConfigs[environment];
                    const ytenant_id = document.getElementById('ytenant_id').value.trim() || "0"; // 获取租户ID
                    
                    // 防止获取非表节点的详情
                    if (!params.data.tableName || params.data.tableName.includes('_group')) {
                        showNodeDetails({ 
                            tableName: params.data.tableName || '未知表',
                            data: { 
                                id: params.data.id || '未知ID', 
                                name: params.data.name || '未知名称',
                                '节点类型': '导航节点'
                            }
                        });
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    console.log('获取表详情参数:', {
                        environment,
                        dbName,
                        tableName: params.data.tableName,
                        id: params.data.id,
                        ytenant_id // 添加租户ID
                    });
                    
                    // 构建缓存键
                    const cacheKey = `${environment}_${dbName}_${params.data.tableName}_${params.data.id}_${ytenant_id}`;
                    
                    // 检查缓存中是否已有该节点的详情数据
                    if (nodeDetailsCache.has(cacheKey)) {
                        console.log('使用缓存的节点详情数据');
                        showNodeDetails(nodeDetailsCache.get(cacheKey));
                        isLoadingNodeDetails = false;
                        return;
                    }
                    
                    // 显示加载提示
                    loadingIndicator.style.display = 'block';
                    loadingIndicator.textContent = '正在加载节点详情...';
                    
                    // 尝试获取节点详细信息
                    try {
                        const requestData = {
                            environment: environment,
                            dbName: dbName,
                            tableName: params.data.tableName,
                            id: params.data.id,
                            ytenant_id: ytenant_id,
                            dbConfig: currentDbConfig
                        };
                        
                        const details = await window.fetchTableDetails(requestData);
                        
                        // 隐藏加载提示
                        loadingIndicator.style.display = 'none';
                        
                        // 将结果存入缓存
                        nodeDetailsCache.set(cacheKey, details);
                        
                        showNodeDetails(details);
                        isLoadingNodeDetails = false;
                        lastClickedNodeId = null; // 重置点击的节点ID，允许再次点击同一节点
                    } catch (error) {
                        // 隐藏加载提示
                        loadingIndicator.style.display = 'none';
                        
                        console.warn('无法获取详细信息，使用节点数据:', error);
                        // 使用现有节点数据显示
                        showNodeDetails({ 
                            tableName: params.data.tableName,
                            data: { id: params.data.id, name: params.data.name, '错误信息': error.message }
                        });
                        isLoadingNodeDetails = false;
                        lastClickedNodeId = null; // 重置点击的节点ID，允许再次点击同一节点
                    }
                } catch (error) {
                    console.error('处理节点点击事件失败:', error);
                    alert('处理节点点击事件失败: ' + error.message);
                    isLoadingNodeDetails = false;
                    lastClickedNodeId = null;
                }
            } else {
                // 点击了图表空白区域，隐藏详情面板
                hideNodeDetails();
                isLoadingNodeDetails = false;
            }
        });
        
        // 绑定图表背景点击事件，关闭节点详情
        myChart.getZr().on('click', function(event) {
            // 如果点击的是空白处（没有触发图表节点点击事件）
            if (!event.target) {
                hideNodeDetails();
            }
        });
        
        // 添加自定义样式
        addCustomStyles();
        
        // 监听窗口大小变化
        window.addEventListener('resize', function() {
            if (myChart) {
                myChart.resize();
            }
        });
        
        console.log('图表事件绑定完成');
    } catch (error) {
        console.error('初始化图表失败:', error);
        alert('初始化图表失败: ' + error.message);
    }
}

/**
 * 显示缩放和平移提示
 */
function showZoomHint() {
    const zoomHint = document.getElementById('zoom-hint');
    if (zoomHint) {
        zoomHint.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            zoomHint.style.display = 'none';
        }, 5000);
    }
}

/**
 * 隐藏缩放和平移提示
 */
function hideZoomHint() {
    const zoomHint = document.getElementById('zoom-hint');
    if (zoomHint) {
        zoomHint.style.display = 'none';
    }
}

/**
 * 为树形图增加按类型分组功能
 * @param {Object} data 原始树形图数据
 * @param {Boolean} enableGrouping 是否开启分组
 * @returns {Object} 处理后的数据
 */
function processTreeGrouping(data, enableGrouping = false) {
    if (!enableGrouping || !data) return data;
    
    // 创建深拷贝
    const newData = JSON.parse(JSON.stringify(data));
    
    // 获取"展开所有节点"控件的状态
    const expandAllNodesCtrl = document.getElementById('expand-all-nodes');
    const shouldExpandAll = expandAllNodesCtrl ? expandAllNodesCtrl.checked : false;
    
    // 递归处理节点
    function processNode(node) {
        if (!node) return null;
        
        // 如果没有子节点，直接返回
        if (!node.children || node.children.length === 0) {
            return node;
        }
        
        // 按tableName分组，统计各类型数量
        const typeCounts = {};
        node.children.forEach(child => {
            if (child.tableName) {
                typeCounts[child.tableName] = (typeCounts[child.tableName] || 0) + 1;
            }
        });
        
        // 智能判断是否需要分组 - 数量超过阈值或占比超过60%的类型将被分组
        const totalChildren = node.children.length;
        const typeToGroup = Object.keys(typeCounts).filter(type => {
            const count = typeCounts[type];
            return count > 3 || (count >= 3 && count / totalChildren > 0.6);
        });
        
        // 如果没有需要分组的类型
        if (typeToGroup.length === 0) {
            // 递归处理子节点，然后返回
            node.children = node.children.map(child => processNode(child)).filter(Boolean);
            return node;
        }
        
        // 开始处理分组
        const newChildren = [];
        const groups = {};
        
        // 第一步：创建分组和添加不需要分组的节点
        node.children.forEach(child => {
            if (!child.tableName || !typeToGroup.includes(child.tableName)) {
                // 递归处理不需要分组的子节点
                newChildren.push(processNode(child));
            } else {
                // 初始化分组
                if (!groups[child.tableName]) {
                    // 基于表名生成唯一颜色
                    const color = getGroupColor(child.tableName);
                    
                    // 对于大组，正常情况下添加可展开/折叠功能
                    const isLargeGroup = typeCounts[child.tableName] > 10;
                    
                    // 但如果勾选了"展开所有节点"，则强制展开状态
                    // 这样billitem_base等节点将始终保持展开
                    const shouldCollapseGroup = isLargeGroup && !shouldExpandAll;
                    
                    groups[child.tableName] = {
                        name: `${child.tableName} (${typeCounts[child.tableName]}个)`,
                        tableName: `${child.tableName}_group`,
                        id: `group_${child.tableName}_${Date.now()}`, // 确保ID唯一
                        isGroup: true, // 标记为分组节点
                        collapsed: shouldCollapseGroup, // 根据条件决定是否折叠
                        children: [],
                        itemStyle: {
                            color: color,  // 自定义颜色
                            borderColor: getBorderColor(color),
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            position: 'right',
                            color: '#fff',
                            fontWeight: 'bold',
                            backgroundColor: {
                                type: 'linear',
                                x: 0, y: 0, x2: 1, y2: 0,
                                colorStops: [
                                    {offset: 0, color: color}, 
                                    {offset: 1, color: lightenColor(color, 20)}
                                ]
                            },
                            padding: [2, 4],
                            borderRadius: 3
                        }
                    };
                    newChildren.push(groups[child.tableName]);
                    
                    if (groups[child.tableName].tableName.includes('billitem_base')) {
                        console.log('创建billitem_base分组节点, 展开状态:', !groups[child.tableName].collapsed);
                    }
                }
                
                // 递归处理子节点，然后添加到对应分组
                const processedChild = processNode(child);
                if (processedChild) {
                    groups[child.tableName].children.push(processedChild);
                }
            }
        });
        
        // 更新节点的子节点
        node.children = newChildren;
        return node;
    }
    
    // 为分组节点获取不同的颜色
    function getGroupColor(tableName) {
        // 基于表名创建一个稍微不同的颜色
        const baseColors = {
            'bill_base': '#4682B4',      // 钢蓝色
            'billentity_base': '#6A5ACD', // 板岩蓝色
            'billtemplate_base': '#1E90FF', // 道奇蓝色
            'billtplgroup_base': '#4169E1', // 皇家蓝色
            'billitem_base': '#00CED1',   // 暗青色
            'bill_toolbar': '#20B2AA',    // 浅海绿
            'pb_meta_filters': '#8FBC8F',  // 暗海绿色
            'meta_component': '#FF7F50',   // 珊瑚色
            'meta_elements': '#FF8C00',    // 深橙色
            'billtpl_comp': '#9370DB',     // 中紫色
            'metadata': '#3CB371'          // 中海蓝绿色
        };
        
        // 使用表名对应的颜色或默认颜色
        return baseColors[tableName] || '#5470c6';
    }
    
    // 为分组节点生成边框颜色
    function getBorderColor(color) {
        return lightenColor(color, -20); // 略暗的边框
    }
    
    // 亮化或暗化颜色
    function lightenColor(color, amount) {
        // 解析十六进制颜色
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        
        // 调整亮度
        r = Math.min(255, Math.max(0, r + amount));
        g = Math.min(255, Math.max(0, g + amount));
        b = Math.min(255, Math.max(0, b + amount));
        
        // 转回十六进制
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // 处理根节点
    return processNode(newData);
}

/**
 * 计算树的度量信息以优化显示
 * @param {Object} treeData 树形数据
 * @returns {Object} 树的度量信息
 */
function calculateTreeMetrics(treeData) {
    let nodeCount = 0;
    let maxDepth = 0;
    let maxChildren = 0;
    let leafCount = 0;
    let widestLevelNodes = 0;
    let levelNodeCounts = {}; // 记录每一层的节点数量
    
    // 递归分析树结构
    function analyzeNode(node, depth = 0) {
        if (!node) return;
        
        nodeCount++;
        maxDepth = Math.max(maxDepth, depth);
        
        // 更新每层节点统计
        levelNodeCounts[depth] = (levelNodeCounts[depth] || 0) + 1;
        widestLevelNodes = Math.max(widestLevelNodes, levelNodeCounts[depth]);
        
        // 计算子节点
        if (node.children && node.children.length > 0) {
            maxChildren = Math.max(maxChildren, node.children.length);
            node.children.forEach(child => analyzeNode(child, depth + 1));
        } else {
            // 这是叶子节点
            leafCount++;
        }
    }
    
    // 如果是数组形式的根节点，处理第一个元素
    if (Array.isArray(treeData)) {
        if (treeData.length > 0) {
            analyzeNode(treeData[0], 0);
        }
    } else {
        // 直接处理树对象
        analyzeNode(treeData, 0);
    }
    
    // 计算推荐的节点间距和层级间距
    let recommendedNodeGap = 80; // 增加默认节点间距，确保更好地显示长名称
    let recommendedLayerPadding = 250; // 增加默认层级间距，避免重叠
    
    // 根据节点数量和深度调整
    if (nodeCount > 200) {
        recommendedNodeGap = 50; // 节点很多时，间距仍保持适当大小
    } else if (nodeCount > 100) {
        recommendedNodeGap = 60;
    }
    
    // 根据树的宽度动态调整层级间距
    if (maxDepth > 5) {
        // 树很深时，增加层级间距，但考虑总宽度
        recommendedLayerPadding = Math.min(280, Math.max(220, 400 / maxDepth));
    }
    
    // 根据每层最多节点数调整节点间距
    if (widestLevelNodes > 20) {
        recommendedNodeGap = Math.max(40, Math.min(60, 1000 / widestLevelNodes));
    }
    
    // 叶子节点过多时，调整策略
    if (leafCount > 100) {
        recommendedNodeGap = Math.min(recommendedNodeGap, 50);
    }
    
    console.log(`树分析: ${nodeCount}个节点, 最大深度: ${maxDepth}, 最大子节点数: ${maxChildren}, 叶子节点: ${leafCount}, 最宽层节点数: ${widestLevelNodes}`);
    console.log(`推荐布局参数: 节点间距=${recommendedNodeGap}, 层级间距=${recommendedLayerPadding}`);
    
    return {
        nodeCount,
        maxDepth,
        maxChildren,
        leafCount,
        widestLevelNodes,
        recommendedNodeGap,
        recommendedLayerPadding
    };
}

/**
 * 应用自定义的树形图布局
 */
function applyCustomLayout() {
    if (!myChart || !window.originalTreeData) return;
    
    // 获取控制选项的值
    const enableGrouping = document.getElementById('enable-auto-grouping').checked;
    const nodeSpacing = parseInt(document.getElementById('node-spacing').value);
    const layerSpacing = parseInt(document.getElementById('layer-spacing').value);
    const expandAll = document.getElementById('expand-all-nodes').checked;
    const lockNodeCollapse = document.getElementById('lock-node-collapse').checked;
    const nodeFontSize = parseInt(document.getElementById('node-font-size').value);
    const leafSpacing = parseInt(document.getElementById('leaf-spacing').value || '30'); // 叶子节点间距值
    
    console.log('应用布局: 节点间距=', nodeSpacing, '层级间距=', layerSpacing, 
               '叶子节点间距=', leafSpacing, '展开所有节点=', expandAll, 
               '锁定节点=', lockNodeCollapse);
    
    try {
        // 更新全局锁定状态变量，确保与UI同步
        isNodeCollapseEnabled = !lockNodeCollapse;
        
        // 重新处理数据
        let processedData = enableGrouping 
            ? processTreeGrouping(window.originalTreeData, true) 
            : JSON.parse(JSON.stringify(window.originalTreeData));
        
        // 如果需要展开所有节点，递归处理节点确保所有节点（包括分组节点）都被展开
        if (expandAll) {
            console.log('应用布局时展开所有节点，包括billitem_base等分组节点');
            
            // 递归处理数据，确保所有节点都被展开
            function ensureAllNodesExpandedBeforeLayout(node) {
                if (!node) return;
                
                // 特别处理：确保节点展开
                if (node.collapsed !== undefined) {
                    node.collapsed = false;
                }
                
                // 特别标记billitem_base等节点，强制展开
                if (node.tableName && (
                    node.tableName.includes('billitem_base') || 
                    node.tableName.includes('_group')
                )) {
                    console.log('强制展开分组节点:', node.name || node.tableName);
                    node.collapsed = false;
                }
                
                // 处理子节点
                if (node.children && node.children.length > 0) {
                    node.children.forEach(ensureAllNodesExpandedBeforeLayout);
                }
            }
            
            // 应用展开处理
            ensureAllNodesExpandedBeforeLayout(processedData);
        }
        
        // 处理数据，修改叶子节点间距
        processedData = processNodeSpacing(processedData, leafSpacing);
        
        // 更新配置
        const option = myChart.getOption();
        option.series[0].data = [processedData];
        
        // 设置展开/折叠状态
        option.series[0].initialTreeDepth = expandAll ? -1 : 2;
        
        // 设置节点展开/折叠功能的启用状态
        option.series[0].expandAndCollapse = isNodeCollapseEnabled;
        
        // 调整节点间距 - 通过多种方法协同工作以确保效果
        
        // 1. 通过调整整体布局范围影响水平和垂直间距
        // 根据nodeSpacing计算图表占用空间的百分比
        const spacePercentage = Math.max(5, Math.min(40, 60 - nodeSpacing * 0.4));
        option.series[0].top = '8%';
        option.series[0].bottom = '8%'; 
        option.series[0].left = '5%';
        option.series[0].right = spacePercentage + '%';
        
        // 2. 使用树图的线条曲率调整，影响节点的视觉间距
        const curveness = nodeSpacing < 50 ? 0.3 : (nodeSpacing > 80 ? 0.7 : 0.5);
        option.series[0].lineStyle = {
            color: '#5f6368',
            width: 1.2,
            curveness: curveness
        };
        
        // 3. 调整层级间距 - 使用力导向图参数
        option.series[0].force = {
            repulsion: layerSpacing * 0.5, // 斥力与层级间距成正比
            edgeLength: layerSpacing * 0.4, // 边长与层级间距成正比
            gravity: 0.1,
            layoutAnimation: true
        };
        
        // 4. 添加自定义布局处理器，应用叶子节点的layoutOffset属性
        option.series[0].layoutPosition = function(params) {
            const node = params.node;
            const layout = params.layout;
            
            // 如果节点有自定义偏移，应用它
            if (node.layoutOffset) {
                layout.x += node.layoutOffset.x || 0;
                layout.y += node.layoutOffset.y || 0;
            }
            
            return layout;
        };
        
        // 5. 标签设置
        const labelDistance = 10 + (nodeSpacing - 60) * 0.1; // 基础距离10，根据节点间距调整
        
        // 非叶子节点标签设置
        option.series[0].label = {
            position: 'right',
            rotate: 0,
            verticalAlign: 'middle',
            align: 'left',
            fontSize: nodeFontSize,
            fontFamily: 'Microsoft YaHei, Arial, sans-serif',
            color: '#e8eaed',
            distance: labelDistance
        };
        
        // 叶子节点标签设置
        option.series[0].leaves = {
            itemStyle: {
                borderWidth: 1.2,
                borderColor: '#8ab4f8'
            },
            label: {
                position: 'right',
                rotate: 0,
                verticalAlign: 'middle',
                align: 'left',
                fontSize: nodeFontSize - 1,
                fontFamily: 'Microsoft YaHei, Arial, sans-serif',
                color: '#d0d0d0',
                distance: labelDistance
            }
        };
        
        // 应用字体大小设置
        window.baseFontSize = nodeFontSize; // 保存为全局变量，供updateNodeLabelSize使用
        
        // 应用更新
        myChart.setOption(option, {
            replaceMerge: ['series']
        });
        
        // 应用后再次检查展开状态，确保所有节点都被正确展开
        if (expandAll) {
            setTimeout(() => {
                try {
                    // 获取当前配置
                    const currentOption = myChart.getOption();
                    
                    // 递归处理数据，确保所有节点都被展开
                    function verifyAndExpandAllNodes(node) {
                        if (!node) return;
                        
                        // 确保节点展开
                        if (node.collapsed) {
                            console.log('发现布局后仍折叠的节点，强制展开:', node.name);
                            node.collapsed = false;
                        }
                        
                        // 处理子节点
                        if (node.children && node.children.length > 0) {
                            node.children.forEach(verifyAndExpandAllNodes);
                        }
                    }
                    
                    // 如果存在数据，递归展开
                    if (currentOption.series[0].data && currentOption.series[0].data.length > 0) {
                        verifyAndExpandAllNodes(currentOption.series[0].data[0]);
                        myChart.setOption(currentOption);
                        console.log('布局后二次检查，确保所有节点展开');
                    }
                } catch (error) {
                    console.error('布局后检查节点展开状态时出错:', error);
                }
            }, 100);
        }
        
        // 立即更新字体大小
        window.updateNodeLabelSize();
        
        // 构建反馈消息，显示应用了哪些设置
        let feedbackMessage = '已应用布局';
        if (expandAll) {
            feedbackMessage += '并展开所有节点';
        }
        if (lockNodeCollapse) {
            feedbackMessage += (expandAll ? '、' : '并') + '锁定节点折叠功能';
        }
        
        // 显示成功应用布局的反馈信息
        showTemporaryMessage(feedbackMessage, 'success');
        
        console.log('自定义布局已应用', {
            enableGrouping,
            nodeSpacing,
            layerSpacing,
            leafSpacing,
            expandAll,
            lockNodeCollapse,
            nodeFontSize
        });
    } catch (error) {
        console.error('应用自定义布局失败:', error);
        showTemporaryMessage('应用布局失败: ' + error.message, 'error');
    }
}

// 辅助函数：处理节点间距，特别是同一父节点下叶子节点的垂直间距
function processNodeSpacing(data, spacing) {
    // 递归处理节点
    function processNode(node) {
        if (!node) return null;
        
        // 如果节点有子节点，则处理子节点间的间距
        if (node.children && node.children.length > 0) {
            // 找出叶子节点
            const leafNodes = node.children.filter(child => !child.children || child.children.length === 0);
            
            // 如果有多个叶子节点，修改它们的布局属性
            if (leafNodes.length > 1 && spacing > 30) {
                // 计算间距因子，从基准30开始，每增加10单位增加20%的间距
                const spacingFactor = 1 + Math.max(0, (spacing - 30) / 10) * 0.2;
                
                // 对所有叶子节点应用特殊样式和定位属性
                leafNodes.forEach((leaf, index) => {
                    // 为叶子节点添加布局信息
                    if (!leaf.itemStyle) leaf.itemStyle = {};
                    
                    // 计算垂直偏移 - 对于从左到右的布局，这控制的是上下位置
                    // 偶数索引的节点向上偏移，奇数索引的节点向下偏移
                    const verticalOffset = index % 2 === 0 
                        ? -1 * (spacing - 30) * 0.2 * (Math.floor(index / 2) + 1)  // 向上偏移
                        : (spacing - 30) * 0.2 * (Math.floor(index / 2) + 1);      // 向下偏移
                    
                    // 添加布局控制属性
                    leaf.layoutOffset = {
                        x: 0,                    // 水平方向不偏移
                        y: verticalOffset         // 垂直方向根据间距值和索引计算偏移
                    };
                    
                    // 为有布局偏移的节点添加特殊样式
                    if (Math.abs(verticalOffset) > 0) {
                        leaf.emphasis = {
                            itemStyle: {
                                shadowBlur: 5,
                                shadowColor: 'rgba(0,0,0,0.3)'
                            }
                        };
                        
                        // 调整连线样式，强调分布
                        if (!leaf.lineStyle) leaf.lineStyle = {};
                        leaf.lineStyle.curveness = 0.3 + (spacing - 30) * 0.01; // 增加曲度
                    }
                });
            }
            
            // 递归处理所有子节点
            node.children = node.children.map(child => processNode(child)).filter(Boolean);
        }
        
        return node;
    }
    
    // 处理根节点
    return processNode(data);
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
    
    console.log('高亮节点:', node.name);
    
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
        
        // 确保指定的节点被展开
        const dataIndex = getNodeIndex(option.series[0].data, node.id);
        if (dataIndex !== -1) {
            myChart.dispatchAction({
                type: 'treeExpandAndCollapse',
                seriesIndex: 0,
                dataIndex: dataIndex
            });
        }
    } catch (error) {
        console.error('高亮节点失败:', error);
    }
}

/**
 * 递归处理树节点的高亮状态
 */
function processTreeHighlight(treeNode, targetNode) {
    // 创建节点的副本避免修改原对象
    const nodeCopy = {...treeNode};
    
    // 检查当前节点是否是目标节点
    if (nodeCopy.id === targetNode.id) {
        // 高亮目标节点，使用更明显的颜色和边框
        nodeCopy.itemStyle = {
            color: '#ffcc00',  // 黄色背景
            borderColor: '#ff9900', // 橙色边框
            borderWidth: 5,     // 更粗的边框
            borderType: 'solid',
            shadowBlur: 20,     // 更明显的发光效果
            shadowColor: '#ffcc00'
        };
        
        // 大幅强调节点的大小，使其更加突出
        nodeCopy.symbolSize = 25; // 明显增大节点尺寸
        
        // 修改节点标签样式使其更突出
        nodeCopy.label = {
            ...nodeCopy.label,  // 保留原来的标签设置
            color: '#ffffff',   // 白色文字
            fontWeight: 'bold', // 粗体
            fontSize: 14,       // 增大字体
            backgroundColor: 'rgba(255, 153, 0, 0.6)', // 更醒目的半透明背景
            padding: [6, 10],   // 更大的标签内边距
            borderRadius: 4,    // 圆角
            shadowBlur: 10,     // 添加阴影
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            align: 'left'
        };
        
        // 设置强调状态
        nodeCopy.emphasis = {
            itemStyle: {
                color: '#ffcc00',
                borderColor: '#ff9900',
                borderWidth: 6,
                shadowBlur: 25,
                shadowColor: '#ffcc00'
            },
            label: {
                color: '#ffffff',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 153, 0, 0.7)',
                borderColor: '#ff9900',
                borderWidth: 1
            }
        };
        
        // 添加标记，使节点更加突出
        nodeCopy.symbol = 'circle';
    } else {
        // 非目标节点使用默认样式，但明显降低亮度以突出目标节点
        nodeCopy.itemStyle = {
            borderWidth: 1.2,
            // 非目标节点半透明化
            opacity: 0.5,
            color: '#999999'
        };
        
        // 降低非目标节点标签的显示亮度
        if (nodeCopy.label) {
            nodeCopy.label = {
                ...nodeCopy.label,
                color: '#aaaaaa', // 灰色文字
                opacity: 0.6     // 降低文字不透明度
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
 * 展开到指定节点
 */
function expandToNode(node) {
    if (!node) return;
    
    console.log('展开到节点:', node.name);
    
    // 高亮节点
    highlightNode(node);
    
    // 滚动到节点位置并居中显示
    scrollToNode(node.id, myChart);
}

/**
 * 滚动到指定节点
 */
function scrollToNode(nodeId, chart) {
    console.log("滚动到节点：", nodeId);
    const node = findNodeById(chart.getOption().series[0].data, nodeId);
    if (!node) {
        console.error("未找到节点:", nodeId);
        showTemporaryMessage("未找到节点:" + nodeId, "error");
        return;
    }

    // 显示正在定位的消息
    showTemporaryMessage(`正在定位到: ${node.name}`, "info");
    
    // 使用内部API获取节点位置
    const coordsys = chart.getModel().getSeriesByIndex(0).coordinateSystem;
    const point = coordsys.dataToPoint([node.x, node.y]);
    
    // 获取图表容器尺寸
    const viewWidth = chart.getWidth();
    const viewHeight = chart.getHeight();
    
    // 计算需要的平移量，使节点位于视图中心
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const deltaX = centerX - point[0];
    const deltaY = centerY - point[1];
    
    // 使用平滑动画过渡 - 步骤1：先缩小视图
    chart.dispatchAction({
        type: 'graphRoam',
        zoom: 0.7  // 先明显缩小
    });
    
    // 步骤2：显示寻找动画
    setTimeout(() => {
        // 显示搜索动画
        const searchAnimation = {
            id: 'search-animation',
            type: 'circle',
            shape: {
                cx: centerX,
                cy: centerY,
                r: Math.min(viewWidth, viewHeight) / 2 - 50
            },
            style: {
                fill: 'none',
                stroke: 'rgba(138, 180, 248, 0.5)',
                lineWidth: 2,
                lineDash: [8, 8]
            },
            z: 100,
            silent: true,
            keyframeAnimation: [
                {
                    duration: 1000,
                    loop: false,
                    keyframes: [
                        {
                            percent: 0,
                            rotation: 0,
                            style: { lineDashOffset: 0 }
                        },
                        {
                            percent: 1,
                            rotation: Math.PI * 2,
                            style: { lineDashOffset: 20 }
                        }
                    ]
                }
            ]
        };
        
        // 添加搜索动画到图表
        let option = chart.getOption();
        if (!option.graphic) option.graphic = [];
        option.graphic.push(searchAnimation);
        chart.setOption(option);
        
        // 步骤3：平移到位置
        setTimeout(() => {
            chart.dispatchAction({
                type: 'graphRoam',
                dx: deltaX,
                dy: deltaY
            });
            
            // 步骤4：平移完成后放大并显示动画
            setTimeout(() => {
                // 清除搜索动画
                option = chart.getOption();
                option.graphic = option.graphic.filter(item => item.id !== 'search-animation');
                chart.setOption(option);
                
                // 放大视图
                chart.dispatchAction({
                    type: 'graphRoam',
                    zoom: 1.3  // 适当放大
                });
                
                // 展开节点
                chart.dispatchAction({
                    type: 'treeExpandAndCollapse',
                    seriesIndex: 0,
                    dataIndex: getNodeIndex(chart.getOption().series[0].data, nodeId)
                });
                
                // 高亮节点
                chart.dispatchAction({
                    type: 'highlight',
                    seriesIndex: 0,
                    dataIndex: getNodeIndex(chart.getOption().series[0].data, nodeId)
                });
                
                // 添加成功定位的消息
                showTemporaryMessage(`已定位到: ${node.name}`, "success");
                
                // 添加动画效果
                createPulsingAnimation(chart, node);
                
                // 添加短暂的缩放弹跳动画，增强视觉效果
                let currentZoom = 1.3;
                const zoomSteps = [
                    { zoom: 1.4, delay: 100 },
                    { zoom: 1.2, delay: 200 },
                    { zoom: 1.3, delay: 100 }
                ];
                
                zoomSteps.forEach(step => {
                    setTimeout(() => {
                        chart.dispatchAction({
                            type: 'graphRoam',
                            zoom: step.zoom
                        });
                    }, step.delay);
                });
                
            }, 500); // 平移后等待500ms再放大
        }, 800); // 搜索动画显示800ms后开始平移
    }, 400); // 缩小后等待400ms再显示搜索动画
}

/**
 * 创建节点的脉动动画效果
 */
function createPulsingAnimation(chart, node) {
    // 获取当前图表配置
    const option = chart.getOption();
    const coordsys = chart.getModel().getSeriesByIndex(0).coordinateSystem;
    const point = coordsys.dataToPoint([node.x, node.y]);
    
    // 清除之前的动画效果（如果有）
    if (option.graphic) {
        const existingEffects = option.graphic.filter(item => item.id && item.id.startsWith('pulse-effect'));
        if (existingEffects.length > 0) {
            option.graphic = option.graphic.filter(item => !item.id || !item.id.startsWith('pulse-effect'));
        }
    }
    
    // 创建多层脉动效果
    const pulseEffects = [];
    const colors = [
        'rgba(255, 204, 0, ', // 亮黄色
        'rgba(255, 153, 0, ', // 橙色
        'rgba(255, 102, 0, ', // 深橙色
        'rgba(255, 51, 0, '   // 红橙色
    ];
    
    // 添加聚焦箭头指示符
    const arrowSize = 24;
    const arrowOffset = 60;
    
    // 创建四个方向的箭头指示器
    const directions = [
        { x: 0, y: -1, rotate: 0 },    // 上
        { x: 1, y: 0, rotate: 90 },    // 右
        { x: 0, y: 1, rotate: 180 },   // 下
        { x: -1, y: 0, rotate: 270 }   // 左
    ];
    
    directions.forEach((dir, index) => {
        const arrowX = point[0] + dir.x * arrowOffset;
        const arrowY = point[1] + dir.y * arrowOffset;
        
        // 创建箭头
        const arrow = {
            id: `pulse-effect-arrow-${index}`,
            type: 'path',
            shape: {
                pathData: 'M0,0 L10,20 L20,0 Z', // 简单的三角形箭头
                x: -10,
                y: -10
            },
            position: [arrowX, arrowY],
            rotation: dir.rotate * Math.PI / 180,
            style: {
                fill: colors[0] + '0.9)',
                stroke: '#ffffff',
                lineWidth: 1,
                shadowBlur: 10,
                shadowColor: colors[0] + '1)'
            },
            z: 200,
            silent: true
        };
        
        // 添加箭头动画
        arrow.keyframeAnimation = [
            {
                duration: 1000,
                delay: index * 200, // 错开每个箭头的动画开始时间
                loop: true,
                keyframes: [
                    {
                        percent: 0,
                        style: { opacity: 0.1, fill: colors[0] + '0.3)' },
                        position: [
                            arrowX - dir.x * 15, 
                            arrowY - dir.y * 15
                        ]
                    },
                    {
                        percent: 0.5,
                        style: { opacity: 0.9, fill: colors[0] + '0.9)' },
                        position: [arrowX, arrowY]
                    },
                    {
                        percent: 1,
                        style: { opacity: 0.1, fill: colors[0] + '0.3)' },
                        position: [
                            arrowX - dir.x * 15, 
                            arrowY - dir.y * 15
                        ]
                    }
                ]
            }
        ];
        
        pulseEffects.push(arrow);
    });
    
    // 创建围绕节点的聚光圈效果
    const spotlightRadius = 200;
    const spotlight = {
        id: 'pulse-effect-spotlight',
        type: 'circle',
        shape: {
            cx: point[0],
            cy: point[1],
            r: spotlightRadius
        },
        style: {
            fill: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(255, 204, 0, 0)' },
                { offset: 0.7, color: 'rgba(255, 204, 0, 0)' },
                { offset: 0.85, color: 'rgba(255, 204, 0, 0.15)' },
                { offset: 0.95, color: 'rgba(255, 204, 0, 0.3)' },
                { offset: 1, color: 'rgba(255, 204, 0, 0.5)' }
            ]),
            shadowBlur: 20,
            shadowColor: 'rgba(255, 204, 0, 0.3)'
        },
        z: 90,
        silent: true,
        keyframeAnimation: [
            {
                duration: 3000,
                loop: true,
                keyframes: [
                    {
                        percent: 0,
                        style: { opacity: 0.6 }
                    },
                    {
                        percent: 0.5,
                        style: { opacity: 0.2 }
                    },
                    {
                        percent: 1,
                        style: { opacity: 0.6 }
                    }
                ]
            }
        ]
    };
    pulseEffects.push(spotlight);
    
    // 为每层创建不同的动画效果
    for (let i = 0; i < 4; i++) {
        const delay = i * 300; // 错开每层动画的开始时间
        const scale = 1 + (i * 0.1); // 每层略微不同的缩放
        
        // 创建脉动圆圈
        const pulseEffect = {
            id: `pulse-effect-${i}`,
            type: 'circle',
            shape: {
                cx: point[0],
                cy: point[1],
                r: 15 + i * 5
            },
            style: {
                fill: colors[i % colors.length] + '0.7)',
                stroke: colors[i % colors.length] + '0.9)',
                lineWidth: 3 - i * 0.5,
                shadowBlur: 15,
                shadowColor: colors[i % colors.length] + '0.8)'
            },
            z: 100 - i, // 确保层叠顺序正确
            silent: true, // 不响应鼠标事件
            scale: [scale, scale],
            
            // 设置动画效果
            animation: true,
            animationDelay: delay,
            animationDuration: 1500,
            animationEasing: 'elasticOut',
            animationLoop: true
        };
        
        // 添加脉动和淡出效果
        const expandAndFade = {
            duration: 1200,
            easing: 'cubicOut',
            delay: delay,
            loop: true,
            keyframes: [
                {
                    percent: 0,
                    shape: { r: 15 + i * 5 },
                    style: { 
                        opacity: 0.9,
                        fill: colors[i % colors.length] + '0.7)',
                        stroke: colors[i % colors.length] + '0.9)',
                        shadowBlur: 15
                    },
                    scale: [scale, scale]
                },
                {
                    percent: 0.5,
                    shape: { r: 40 + i * 15 },
                    style: { 
                        opacity: 0.4,
                        fill: colors[i % colors.length] + '0.4)',
                        stroke: colors[i % colors.length] + '0.6)',
                        shadowBlur: 25
                    },
                    scale: [scale * 1.1, scale * 1.1]
                },
                {
                    percent: 1,
                    shape: { r: 65 + i * 20 },
                    style: { 
                        opacity: 0,
                        fill: colors[i % colors.length] + '0.1)',
                        stroke: colors[i % colors.length] + '0.2)',
                        shadowBlur: 5
                    },
                    scale: [scale, scale]
                }
            ]
        };
        
        pulseEffect.keyframeAnimation = [expandAndFade];
        pulseEffects.push(pulseEffect);
    }
    
    // 创建中心指示器
    const centerIndicator = {
        id: 'pulse-effect-center',
        type: 'circle',
        shape: {
            cx: point[0],
            cy: point[1],
            r: 14
        },
        style: {
            fill: 'rgba(255, 204, 0, 0.9)',
            stroke: 'rgba(255, 255, 255, 1)',
            lineWidth: 3,
            shadowBlur: 20,
            shadowColor: 'rgba(255, 204, 0, 1)'
        },
        z: 101,
        silent: true,
        
        // 中心指示器的闪烁效果
        keyframeAnimation: [
            {
                duration: 800,
                easing: 'sinusoidalInOut',
                loop: true,
                keyframes: [
                    {
                        percent: 0,
                        style: { 
                            shadowBlur: 15,
                            fill: 'rgba(255, 204, 0, 0.9)',
                            stroke: 'rgba(255, 255, 255, 1)',
                            lineWidth: 3
                        },
                        scale: [1, 1]
                    },
                    {
                        percent: 0.5,
                        style: { 
                            shadowBlur: 25,
                            fill: 'rgba(255, 153, 0, 1)',
                            stroke: 'rgba(255, 255, 255, 1)',
                            lineWidth: 4
                        },
                        scale: [1.2, 1.2]
                    },
                    {
                        percent: 1,
                        style: { 
                            shadowBlur: 15,
                            fill: 'rgba(255, 204, 0, 0.9)',
                            stroke: 'rgba(255, 255, 255, 1)',
                            lineWidth: 3
                        },
                        scale: [1, 1]
                    }
                ]
            }
        ]
    };
    
    pulseEffects.push(centerIndicator);
    
    // 添加中心十字准星
    const crosshairSize = 24;
    const crosshair = {
        id: 'pulse-effect-crosshair',
        type: 'group',
        position: [point[0], point[1]],
        z: 102,
        silent: true,
        children: [
            // 横线
            {
                type: 'rect',
                shape: {
                    x: -crosshairSize / 2,
                    y: -1,
                    width: crosshairSize,
                    height: 2
                },
                style: {
                    fill: '#ffffff'
                }
            },
            // 竖线
            {
                type: 'rect',
                shape: {
                    x: -1,
                    y: -crosshairSize / 2,
                    width: 2,
                    height: crosshairSize
                },
                style: {
                    fill: '#ffffff'
                }
            }
        ],
        keyframeAnimation: [
            {
                duration: 1500,
                loop: true,
                keyframes: [
                    {
                        percent: 0,
                        rotation: 0,
                        style: { opacity: 0.7 }
                    },
                    {
                        percent: 0.25,
                        rotation: Math.PI / 4,
                        style: { opacity: 1 }
                    },
                    {
                        percent: 0.5,
                        rotation: Math.PI / 2,
                        style: { opacity: 0.7 }
                    },
                    {
                        percent: 0.75,
                        rotation: 3 * Math.PI / 4,
                        style: { opacity: 1 }
                    },
                    {
                        percent: 1,
                        rotation: Math.PI,
                        style: { opacity: 0.7 }
                    }
                ]
            }
        ]
    };
    pulseEffects.push(crosshair);
    
    // 更新图表配置，添加动画效果
    if (!option.graphic) {
        option.graphic = [];
    }
    
    option.graphic = [...option.graphic, ...pulseEffects];
    chart.setOption(option);
    
    // 5秒后移除动画效果
    setTimeout(() => {
        const currentOption = chart.getOption();
        if (currentOption.graphic) {
            currentOption.graphic = currentOption.graphic.filter(
                item => !item.id || !item.id.startsWith('pulse-effect')
            );
            chart.setOption(currentOption);
        }
    }, 5000); // 延长动画持续时间到5秒
}

/**
 * 显示临时消息提示
 */
function showTemporaryMessage(message, type = "info") {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `temp-message temp-message-${type}`;
    messageEl.innerText = message;
    
    // 样式设置
    Object.assign(messageEl.style, {
        position: 'fixed',
        top: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        backgroundColor: type === 'error' ? '#ffdddd' : '#f0f9eb',
        color: type === 'error' ? '#f56c6c' : '#67c23a',
        border: `1px solid ${type === 'error' ? '#fbc4c4' : '#c2e7b0'}`
    });
    
    // 添加到文档
    document.body.appendChild(messageEl);
    
    // 显示动画
    setTimeout(() => {
        messageEl.style.opacity = 1;
    }, 10);
    
    // 2秒后隐藏并移除
    setTimeout(() => {
        messageEl.style.opacity = 0;
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 300);
    }, 2000);
}

/**
 * 在图表数据中查找指定ID的节点
 */
function findNodeInChartData(nodeId) {
    if (!myChart) return null;
    
    const option = myChart.getOption();
    if (!option.series || !option.series[0] || !option.series[0].data || !option.series[0].data[0]) {
        return null;
    }
    
    const rootNode = option.series[0].data[0];
    return findNodeById(rootNode, nodeId);
}

/**
 * 递归查找指定ID的节点
 */
function findNodeById(node, targetId) {
    if (!node) return null;
    
    // 检查当前节点
    if (node.id === targetId) {
        return node;
    }
    
    // 递归检查子节点
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const found = findNodeById(child, targetId);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * 获取节点在树中的索引
 */
function getNodeIndex(nodeId) {
    if (!myChart) return 0;
    
    // 查找节点在图表数据中的索引
    const dataIndices = [];
    
    const option = myChart.getOption();
    if (!option.series || !option.series[0] || !option.series[0].data) {
        return 0;
    }
    
    // 递归查找节点索引
    function findDataIndex(node, index = 0) {
        if (!node) return index;
        
        // 如果找到目标节点，记录索引
        if (node.id === nodeId) {
            dataIndices.push(index);
        }
        
        // 递归查找子节点
        let currentIndex = index + 1;
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                currentIndex = findDataIndex(child, currentIndex);
            }
        }
        
        return currentIndex;
    }
    
    // 从根节点开始查找
    findDataIndex(option.series[0].data[0], 0);
    
    // 返回找到的第一个匹配索引，或默认为0
    return dataIndices.length > 0 ? dataIndices[0] : 0;
}

/**
 * 获取从根节点到指定节点的路径
 */
function getNodePath(nodeId) {
    // 实际实现需要遍历树找到路径
    // 由于这是一个复杂的递归操作，这里只返回一个示例
    return [];  // 默认返回空路径
}

/**
 * 展开指定路径上的所有节点
 */
function expandNodePath(nodePath) {
    // 实际展开节点的实现取决于ECharts的API和当前图表的配置
    // 这里提供一个基本框架
    if (myChart && nodePath && nodePath.length > 0) {
        // 仅作为示例，实际实现可能不同
        console.log('尝试展开节点路径:', nodePath);
    }
}

/**
 * 处理搜索结果点击事件
 */
function handleSearchResultClick(result) {
    console.log("搜索结果点击:", result);
    
    if (!result || !result.id) {
        console.warn("无效的搜索结果项");
        return;
    }
    
    try {
        // 先从图表数据中查找节点
        const node = findNodeById(myChart.getOption().series[0].data, result.id);
        
        if (node) {
            console.log("找到节点:", node.name);
            
            // 更新搜索结果项的状态
            const allResultItems = document.querySelectorAll('.search-result-item');
            const resultItem = document.querySelector(`.search-result-item[data-id="${result.id}"]`);
            
            // 移除所有高亮
            allResultItems.forEach(item => {
                item.classList.remove('result-clicked');
                item.style.borderColor = 'transparent';
            });
            
            // 高亮当前选中的项目
            if (resultItem) {
                resultItem.classList.add('result-clicked');
                resultItem.style.borderColor = '#ff9900';
                
                // 确保选中项可见（滚动到视图内）
                resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // 添加点击反馈
                const lastNodeId = document.querySelector('#searchResults').getAttribute('data-last-selected');
                
                // 如果这是一个新节点（不是重复点击同一个节点）
                if (lastNodeId !== result.id) {
                    // 标记切换状态
                    myChart.getZr().dom.classList.add('node-switching');
                    
                    // 200ms后移除切换状态（与动画时长匹配）
                    setTimeout(() => {
                        myChart.getZr().dom.classList.remove('node-switching');
                    }, 2000);
                    
                    // 记录最后选择的节点
                    document.querySelector('#searchResults').setAttribute('data-last-selected', result.id);
                }
            }
            
            // 高亮并展开到节点
            expandToNode({
                id: result.id,
                name: result.name || node.name,
                depth: node.depth
            });
            
            // 显示节点详情（如果有对应功能）
            if (typeof showNodeDetails === 'function') {
                try {
                    showNodeDetails({
                        name: node.name,
                        id: node.id,
                        type: node.type || result.type || '节点',
                        properties: node.properties || result.properties || {}
                    });
                } catch (detailsError) {
                    console.warn("显示节点详情时出错:", detailsError);
                }
            }
        } else {
            console.warn("未在图表中找到对应节点:", result.id);
            showTemporaryMessage("未找到对应的节点: " + result.name, "error");
        }
    } catch (error) {
        console.error("处理搜索结果点击时出错:", error);
        showTemporaryMessage("处理点击时出错，请重试", "error");
    }
}

// 添加必要的CSS样式
function addCustomStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* 搜索结果区域样式 */
        #searchResults {
            scrollbar-width: thin;
            scrollbar-color: #4d4d4d #2f3136;
        }
        
        #searchResults::-webkit-scrollbar {
            width: 6px;
        }
        
        #searchResults::-webkit-scrollbar-track {
            background: #2f3136;
            border-radius: 3px;
        }
        
        #searchResults::-webkit-scrollbar-thumb {
            background-color: #4d4d4d;
            border-radius: 3px;
        }
        
        /* 搜索结果项样式 */
        .search-result-item {
            position: relative;
            cursor: pointer;
            transition: all 0.25s ease;
        }
        
        .search-result-item:hover {
            transform: translateY(-2px);
        }
        
        .search-result-item:focus {
            outline: none;
            border-color: #8ab4f8 !important;
            box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.3);
        }
        
        /* 搜索结果点击效果 */
        .result-clicked {
            animation: result-pulse 2.5s ease-in-out;
            position: relative;
        }
        
        .result-clicked::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 6px;
            box-shadow: 0 0 12px #ff9900;
            animation: glow-pulse 2.5s ease-in-out;
            pointer-events: none;
            z-index: 10;
        }
        
        @keyframes result-pulse {
            0% { background-color: rgba(255, 153, 0, 0.8); }
            30% { background-color: rgba(255, 153, 0, 0.4); }
            60% { background-color: rgba(255, 153, 0, 0.2); }
            100% { background-color: transparent; }
        }
        
        @keyframes glow-pulse {
            0% { opacity: 1; box-shadow: 0 0 15px #ff9900; }
            50% { opacity: 0.6; box-shadow: 0 0 8px #ff9900; }
            100% { opacity: 0; box-shadow: 0 0 0px #ff9900; }
        }
        
        /* 临时消息样式 */
        .temp-message {
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            animation: message-slide 2.5s ease-in-out;
            display: flex;
            align-items: center;
        }
        
        .temp-message::before {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 10px;
            border-radius: 50%;
        }
        
        .temp-message-success {
            background-color: rgba(47, 121, 46, 0.95);
            color: #ffffff;
            border-left: 4px solid #67c23a;
        }
        
        .temp-message-success::before {
            background-color: #67c23a;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
            background-size: 12px;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        .temp-message-error {
            background-color: rgba(148, 43, 43, 0.95);
            color: #ffffff;
            border-left: 4px solid #f56c6c;
        }
        
        .temp-message-error::before {
            background-color: #f56c6c;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E");
            background-size: 12px;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        .temp-message-info {
            background-color: rgba(40, 74, 117, 0.95);
            color: #ffffff;
            border-left: 4px solid #8ab4f8;
        }
        
        .temp-message-info::before {
            background-color: #8ab4f8;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='16' x2='12' y2='12'%3E%3C/line%3E%3Cline x1='12' y1='8' x2='12.01' y2='8'%3E%3C/line%3E%3C/svg%3E");
            background-size: 12px;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        @keyframes message-slide {
            0% { transform: translateY(-20px) translateX(-50%); opacity: 0; }
            10% { transform: translateY(0) translateX(-50%); opacity: 1; }
            80% { transform: translateY(0) translateX(-50%); opacity: 1; }
            100% { transform: translateY(-20px) translateX(-50%); opacity: 0; }
        }

        /* 当搜索结果之间切换时的过渡动画 */
        @keyframes node-switch-highlight {
            0% { filter: brightness(2) saturate(1.5); }
            30% { filter: brightness(1.5) saturate(1.3); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        .node-switching {
            animation: node-switch-highlight 2s ease-out forwards;
        }
    `;
    document.head.appendChild(styleEl);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加自定义样式
    addCustomStyles();
    
    // ... 其他初始化代码 ...
});

/**
 * 渲染搜索结果
 */
function renderSearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results" style="padding: 12px; text-align: center; color: #aaa;">无匹配结果</div>';
        return;
    }
    
    // 创建搜索结果顶部的简要说明
    const headerDiv = document.createElement('div');
    headerDiv.className = 'search-result-header';
    headerDiv.innerHTML = `
        <div style="padding: 6px 12px; margin-bottom: 8px; border-bottom: 1px solid #4d4d4d; font-size: 12px; color: #8ab4f8;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>找到 ${results.length} 个节点</span>
                <span style="font-style: italic;">点击项目可在图表中定位</span>
            </div>
        </div>
    `;
    resultsContainer.appendChild(headerDiv);
    
    // 创建结果列表容器
    const resultsList = document.createElement('div');
    resultsList.className = 'search-results-list';
    resultsList.style.maxHeight = '300px';
    resultsList.style.overflowY = 'auto';
    resultsList.style.paddingRight = '5px';
    
    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.setAttribute('data-id', result.id); // 添加数据属性用于识别
        resultItem.setAttribute('tabindex', '0'); // 使元素可聚焦，支持键盘导航
        
        // 设计更现代的样式
        Object.assign(resultItem.style, {
            position: 'relative',
            padding: '10px 14px',
            backgroundColor: index % 2 === 0 ? '#36393f' : '#2f3136',
            borderRadius: '6px',
            marginBottom: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid transparent'
        });
        
        // 图标和标题容器
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.flex = '1';
        
        // 添加可视提示图标
        const icon = document.createElement('div');
        icon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9900" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
        `;
        icon.style.marginRight = '12px';
        icon.style.flexShrink = '0';
        
        // 节点内容
        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';
        contentDiv.style.overflow = 'hidden';
        
        // 节点名称
        const nameSpan = document.createElement('div');
        nameSpan.textContent = result.name;
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.whiteSpace = 'nowrap';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        
        // 节点信息/类型
        const typeSpan = document.createElement('div');
        typeSpan.style.fontSize = '12px';
        typeSpan.style.color = '#aaa';
        typeSpan.style.marginTop = '2px';
        
        // 根据结果类型设置不同的显示
        if (result.type === 'table') {
            typeSpan.textContent = `表 · ${result.description || ''}`;
        } else if (result.type === 'column') {
            typeSpan.textContent = `列 · 所属表: ${result.tableName || '未知'}`;
        } else {
            typeSpan.textContent = `${result.type || '节点'} · ${result.description || ''}`;
        }
        
        contentDiv.appendChild(nameSpan);
        contentDiv.appendChild(typeSpan);
        
        titleContainer.appendChild(icon);
        titleContainer.appendChild(contentDiv);
        
        // 操作图标
        const actionIcon = document.createElement('div');
        actionIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8ab4f8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="2"></circle>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path>
            </svg>
        `;
        actionIcon.style.marginLeft = '10px';
        actionIcon.style.flexShrink = '0';
        actionIcon.title = "点击定位到此节点";
        
        resultItem.appendChild(titleContainer);
        resultItem.appendChild(actionIcon);
        
        // 添加鼠标悬停效果
        resultItem.addEventListener('mouseenter', () => {
            resultItem.style.backgroundColor = '#42464e';
            resultItem.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            resultItem.style.borderColor = '#8ab4f8';
        });
        
        resultItem.addEventListener('mouseleave', () => {
            resultItem.style.backgroundColor = index % 2 === 0 ? '#36393f' : '#2f3136';
            resultItem.style.boxShadow = 'none';
            resultItem.style.borderColor = 'transparent';
        });
        
        // 添加点击事件监听
        resultItem.addEventListener('click', () => {
            // 设置点击状态和过渡动画
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.classList.remove('result-clicked');
                item.style.borderColor = 'transparent';
            });
            
            resultItem.classList.add('result-clicked');
            resultItem.style.borderColor = '#ff9900';
            
            // 处理点击事件
            handleSearchResultClick(result);
        });
        
        // 支持键盘操作
        resultItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                resultItem.click();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextSibling = resultItem.nextElementSibling;
                if (nextSibling) nextSibling.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevSibling = resultItem.previousElementSibling;
                if (prevSibling) prevSibling.focus();
            }
        });
        
        // 添加提示信息
        resultItem.title = "点击将在图表中定位并高亮此节点";
        
        resultsList.appendChild(resultItem);
    });
    
    resultsContainer.appendChild(resultsList);
    
    // 自动聚焦到第一个结果项
    if (results.length > 0) {
        setTimeout(() => {
            const firstItem = resultsContainer.querySelector('.search-result-item');
            if (firstItem) firstItem.focus();
        }, 100);
    }
}

/**
 * 根据ID查找节点
 * @param {Array} data 图表数据
 * @param {String} nodeId 要查找的节点ID
 * @returns {Object|null} 找到的节点对象或null
 */
function findNodeById(data, nodeId) {
    if (!data || !nodeId) return null;
    
    // 处理单个节点的情况
    if (!Array.isArray(data)) {
        data = [data];
    }
    
    for (let i = 0; i < data.length; i++) {
        const node = data[i];
        
        // 检查当前节点
        if (node.id === nodeId) {
            return node;
        }
        
        // 递归检查子节点
        if (node.children && node.children.length > 0) {
            const found = findNodeById(node.children, nodeId);
            if (found) return found;
        }
    }
    
    return null;
}

/**
 * 获取节点在数据中的索引
 * @param {Array} data 图表数据
 * @param {String} nodeId 节点ID
 * @returns {Number} 节点索引，找不到返回-1
 */
function getNodeIndex(data, nodeId) {
    if (!data || !nodeId) return -1;
    
    // 处理单个节点的情况
    if (!Array.isArray(data)) {
        data = [data];
    }
    
    // 扁平化数据结构以查找索引
    const flattenNodes = [];
    
    function flatten(nodes) {
        if (!nodes) return;
        
        for (let i = 0; i < nodes.length; i++) {
            flattenNodes.push(nodes[i]);
            if (nodes[i].children && nodes[i].children.length > 0) {
                flatten(nodes[i].children);
            }
        }
    }
    
    flatten(data);
    
    // 查找节点索引
    for (let i = 0; i < flattenNodes.length; i++) {
        if (flattenNodes[i].id === nodeId) {
            return i;
        }
    }
    
    return -1;
}

/**
 * 加载数据库列表
 */
async function loadDatabaseList() {
    try {
        // 清空选择
        dbNameInput.value = '';
        dbNameSearchInput.value = '';
        
        // 清空下拉列表
        dbDropdown.innerHTML = '';
        
        // 获取当前环境
        const environment = dbEnvironmentSelect.value;
        
        // 获取当前环境的数据库配置
        const dbConfig = dbConfigs[environment];
        
        // 检查配置是否填写
        if (!dbConfig || !dbConfig.host || !dbConfig.port || !dbConfig.username || !dbConfig.password) {
            // 显示配置未设置的提示
            dbDropdown.innerHTML = '<div class="database-error">请先配置数据库连接信息</div>';
            showDatabaseDropdown();
            return;
        }
        
        // 显示加载中
        databaseLoading.style.display = 'block';
        
        try {
            // 调用API获取数据库列表
            databaseList = await fetchDatabaseList(environment, dbConfig);
            
            // 渲染数据库列表
            renderDatabaseOptions(databaseList);
        } catch (error) {
            console.error('获取数据库列表失败:', error);
            dbDropdown.innerHTML = `<div class="database-error">获取数据库列表失败: ${error.message}</div>`;
            showDatabaseDropdown();
        } finally {
            // 隐藏加载中
            databaseLoading.style.display = 'none';
        }
    } catch (error) {
        console.error('加载数据库列表出错:', error);
        databaseLoading.style.display = 'none';
    }
}

/**
 * 渲染数据库选项列表
 * @param {Array} databases 数据库列表
 */
function renderDatabaseOptions(databases) {
    // 清空下拉列表
    dbDropdown.innerHTML = '';
    
    // 检查是否有数据
    if (!databases || databases.length === 0) {
        dbDropdown.innerHTML = '<div class="database-empty">未找到数据库</div>';
        return;
    }
    
    // 创建选项
    databases.forEach(db => {
        const option = document.createElement('div');
        option.className = 'database-option';
        option.textContent = db;
        option.setAttribute('data-value', db);
        
        // 点击选择
        option.addEventListener('click', function() {
            selectDatabase(db);
        });
        
        dbDropdown.appendChild(option);
    });
}

/**
 * 显示数据库下拉列表
 */
function showDatabaseDropdown() {
    dbDropdown.style.display = 'block';
}

/**
 * 隐藏数据库下拉列表
 */
function hideDatabaseDropdown() {
    dbDropdown.style.display = 'none';
}

/**
 * 选择数据库
 * @param {string} database 数据库名
 */
function selectDatabase(database) {
    dbNameInput.value = database;
    dbNameSearchInput.value = database;
    hideDatabaseDropdown();
    
    // 数据库变化后，自动加载该数据库的表单编码列表
    loadBillNoList();
}

/**
 * 过滤数据库选项
 * @param {string} searchText 搜索文本
 */
function filterDatabaseOptions(searchText) {
    // 首先显示下拉列表
    showDatabaseDropdown();
    
    // 如果没有数据，尝试加载
    if (databaseList.length === 0) {
        loadDatabaseList();
        return;
    }
    
    // 清空高亮
    const options = dbDropdown.querySelectorAll('.database-option');
    options.forEach(option => {
        option.classList.remove('highlighted');
    });
    
    if (!searchText) {
        // 如果搜索框为空，显示所有选项
        renderDatabaseOptions(databaseList);
        return;
    }
    
    // 过滤匹配的选项
    const filteredDatabases = databaseList.filter(db => 
        db.toLowerCase().includes(searchText.toLowerCase())
    );
    
    // 渲染过滤后的选项
    renderDatabaseOptions(filteredDatabases);
    
    // 如果只有一个匹配项，高亮显示
    if (filteredDatabases.length === 1) {
        const option = dbDropdown.querySelector('.database-option');
        if (option) {
            option.classList.add('highlighted');
        }
    }
}

/**
 * 处理数据库选择框的键盘导航
 * @param {KeyboardEvent} event 键盘事件
 */
function handleDatabaseKeyboardNavigation(event) {
    // 获取所有选项
    const options = dbDropdown.querySelectorAll('.database-option');
    
    // 如果没有选项，不处理
    if (options.length === 0) return;
    
    // 获取当前高亮的选项
    let currentHighlighted = dbDropdown.querySelector('.database-option.highlighted');
    let currentIndex = -1;
    
    if (currentHighlighted) {
        // 找到当前高亮选项的索引
        for (let i = 0; i < options.length; i++) {
            if (options[i] === currentHighlighted) {
                currentIndex = i;
                break;
            }
        }
    }
    
    // 根据按键处理导航
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            // 向下导航，选择下一个选项
            if (currentIndex < options.length - 1) {
                if (currentHighlighted) currentHighlighted.classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            // 向上导航，选择上一个选项
            if (currentIndex > 0) {
                if (currentHighlighted) currentHighlighted.classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'Enter':
            event.preventDefault();
            // 回车选择当前高亮选项
            if (currentHighlighted) {
                selectDatabase(currentHighlighted.getAttribute('data-value'));
            } else if (options.length === 1) {
                // 如果只有一个选项，自动选择
                selectDatabase(options[0].getAttribute('data-value'));
            }
            break;
            
        case 'Escape':
            // ESC键隐藏下拉列表
            hideDatabaseDropdown();
            break;
    }
}

/**
 * 从JSON文件导入配置
 * 
 * @param {File} file 选择的文件
 */
async function importConfigFromFile(file) {
    try {
        if (!file) {
            console.error('未选择文件');
            return;
        }
        
        console.log('选择的文件:', file.name, '类型:', file.type);
        
        // 检查文件扩展名
        if (!file.name.toLowerCase().endsWith('.json')) {
            alert('请选择JSON格式的配置文件 (.json)');
            return;
        }
        
        // 读取文件内容
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const fileContent = e.target.result;
                console.log('文件内容:', fileContent.substring(0, 100) + '...');
                
                // 解析JSON
                const configData = JSON.parse(fileContent);
                
                // 验证配置格式
                if (!configData.configs) {
                    alert('无效的配置文件格式，请确保包含configs对象');
                    return;
                }
                
                // 更新配置
                dbConfigs = {
                    test: configData.configs.test || { host: '', port: '', username: '', password: '' },
                    daily: configData.configs.daily || { host: '', port: '', username: '', password: '' },
                    pre: configData.configs.pre || { host: '', port: '', username: '', password: '' },
                    other: configData.configs.other || { host: '', port: '', username: '', password: '' }
                };
                
                // 更新表单
                populateConfigForm();
                
                // 显示成功消息
                alert('配置已成功导入！');
                
                // 重置文件选择器
                document.getElementById('config-import-file').value = '';
            } catch (error) {
                console.error('配置文件解析失败:', error);
                alert(`配置文件解析失败: ${error.message}`);
                document.getElementById('config-import-file').value = '';
            }
        };
        
        reader.onerror = function() {
            console.error('文件读取错误');
            alert('文件读取失败，请重试');
            document.getElementById('config-import-file').value = '';
        };
        
        // 以文本形式读取文件
        reader.readAsText(file);
    } catch (error) {
        console.error('导入配置失败:', error);
        alert(`导入配置失败: ${error.message}`);
        if (document.getElementById('config-import-file')) {
            document.getElementById('config-import-file').value = '';
        }
    }
}

/**
 * 确保树形图控制浮窗可见
 */
function ensureTreeControlsVisible() {
    const treeControls = document.getElementById('tree-controls');
    const graphContainer = document.getElementById('graph-container');
    
    // 如果控制浮窗不存在，则创建它
    if (!treeControls) {
        console.warn('树形图控制浮窗未找到，正在创建');
        createTreeControls();
        return;
    }
    
    // 确保控制浮窗在图表容器内且可见
    if (!graphContainer.contains(treeControls)) {
        console.log('控制浮窗不在图表内，重新添加');
        graphContainer.appendChild(treeControls);
    }
    treeControls.style.display = 'block';
    console.log('已确保控制浮窗可见');
}

/**
 * 创建树形图控制浮窗
 */
function createTreeControls() {
    const graphContainer = document.getElementById('graph-container');
    if (!graphContainer) return;
    
    // 创建控制浮窗元素
    const treeControls = document.createElement('div');
    treeControls.id = 'tree-controls';
    // 修改控制窗口位置为左上角，同时添加transition属性用于平滑切换
    treeControls.style.cssText = 'position: absolute; top: 10px; left: 10px; z-index: 100; background-color: rgba(48, 49, 52, 0.9); padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); border: 1px solid #5f6368; transition: height 0.3s, opacity 0.3s;';
    
    // 获取当前滑块值
    const fontSizeValue = window.baseFontSize || 13;
    const spacingValue = 60;
    const layerValue = 180;
    const leafSpacingValue = 30; // 新增：叶子节点间距默认值
    
    // 创建控制窗口内容元素
    const controlsContent = document.createElement('div');
    controlsContent.id = 'tree-controls-content';
    
    // 设置控制窗口内容的HTML
    controlsContent.innerHTML = `
        <div style="margin-bottom: 8px;">
            <label>
                <input type="checkbox" id="enable-auto-grouping" checked> 自动分组节点
            </label>
        </div>
        <div style="margin-bottom: 8px;">
            <label>
                <input type="checkbox" id="expand-all-nodes" checked> 展开所有节点
            </label>
        </div>
        <div style="margin-bottom: 8px;">
            <label>
                <input type="checkbox" id="lock-node-collapse" ${!isNodeCollapseEnabled ? 'checked' : ''}> 锁定节点
            </label>
        </div>
        <div style="margin-bottom: 8px;">
            <label>
                <input type="checkbox" id="show-entity-tables" ${currentQuery && currentQuery.showEntityTables ? 'checked' : ''}> 显示实体表
            </label>
        </div>
        <div style="margin-bottom: 10px;">
            <label for="node-spacing" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>节点间距:</span>
                <span style="font-weight: 500; color: var(--accent-color);" id="node-spacing-value">${spacingValue}</span>
            </label>
            <input type="range" id="node-spacing" min="20" max="200" value="${spacingValue}" style="width: 100%;">
        </div>
        <div style="margin-bottom: 12px;">
            <label for="leaf-spacing" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>叶子节点间距:</span>
                <span style="font-weight: 500; color: var(--accent-color);" id="leaf-spacing-value">${leafSpacingValue}</span>
            </label>
            <input type="range" id="leaf-spacing" min="10" max="200" value="${leafSpacingValue}" style="width: 100%;">
        </div>
        <div style="margin-bottom: 12px;">
            <label for="layer-spacing" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>层级间距:</span>
                <span style="font-weight: 500; color: var(--accent-color);" id="layer-spacing-value">${layerValue}</span>
            </label>
            <input type="range" id="layer-spacing" min="120" max="500" value="${layerValue}" style="width: 100%;">
        </div>
        <div style="margin-bottom: 12px;">
            <label for="node-font-size" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>节点字体大小:</span>
                <span style="font-weight: 500; color: var(--accent-color);" id="node-font-size-value">${fontSizeValue}</span>
            </label>
            <input type="range" id="node-font-size" min="10" max="20" value="${fontSizeValue}" style="width: 100%;">
        </div>
        <div>
            <button id="apply-layout" class="button" style="width: 100%; background-color: var(--accent-color); color: white; font-weight: 500; font-size: 13px; height: 32px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
                应用布局
            </button>
        </div>
    `;
    
    // 创建标题栏元素，包含标题和最小化按钮
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'margin-bottom: 10px; font-weight: 600; display: flex; align-items: center; justify-content: space-between;';
    
    // 设置标题栏内容
    titleBar.innerHTML = `
        <div style="display: flex; align-items: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                <path d="M21 7v6h-6"></path>
                <path d="M3 17v-6h6"></path>
                <path d="M7 7l10 10"></path>
                <path d="M17 7l-3.5 3.5"></path>
                <path d="M7 17l3.5-3.5"></path>
            </svg>
            显示控制
        </div>
        <button id="toggle-controls" style="background: none; border: none; color: #e8eaed; cursor: pointer; padding: 0; margin: 0; display: flex; align-items: center; justify-content: center;">
            <svg id="minimize-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <svg id="expand-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
        </button>
    `;
    
    // 组装控制窗口
    treeControls.appendChild(titleBar);
    treeControls.appendChild(controlsContent);
    
    // 添加到图表容器
    graphContainer.appendChild(treeControls);
    
    // 重新绑定事件
    const applyLayoutButton = document.getElementById('apply-layout');
    const nodeSpacingCtrl = document.getElementById('node-spacing');
    const nodeSpacingValueEl = document.getElementById('node-spacing-value');
    const leafSpacingCtrl = document.getElementById('leaf-spacing'); // 新增：叶子节点间距控制器
    const leafSpacingValueEl = document.getElementById('leaf-spacing-value'); // 新增：叶子节点间距值显示
    const layerSpacingCtrl = document.getElementById('layer-spacing');
    const layerSpacingValueEl = document.getElementById('layer-spacing-value');
    const nodeFontSizeCtrl = document.getElementById('node-font-size');
    const nodeFontSizeValueEl = document.getElementById('node-font-size-value');
    const expandAllNodesCtrl = document.getElementById('expand-all-nodes');
    const lockNodeCollapseCtrl = document.getElementById('lock-node-collapse');
    const showEntityTablesCtrl = document.getElementById('show-entity-tables');
    const toggleControlsBtn = document.getElementById('toggle-controls');
    const minimizeIcon = document.getElementById('minimize-icon');
    const expandIcon = document.getElementById('expand-icon');
    
    // 控制窗口最小化/展开功能
    let isMinimized = false;
    if (toggleControlsBtn) {
        toggleControlsBtn.addEventListener('click', function() {
            const controlsContent = document.getElementById('tree-controls-content');
            if (isMinimized) {
                // 展开控制窗口
                controlsContent.style.display = 'block';
                minimizeIcon.style.display = 'block';
                expandIcon.style.display = 'none';
                isMinimized = false;
            } else {
                // 最小化控制窗口
                controlsContent.style.display = 'none';
                minimizeIcon.style.display = 'none';
                expandIcon.style.display = 'block';
                isMinimized = true;
            }
        });
    }
    
    // "显示实体表"复选框变化事件
    if (showEntityTablesCtrl) {
        showEntityTablesCtrl.addEventListener('change', function() {
            console.log('显示实体表选项变化:', this.checked ? '显示' : '不显示');
            // 选项变化时不会自动执行查询，仅在下次查询时生效
            showTemporaryMessage(
                this.checked 
                    ? '已选择显示实体表，点击查询按钮后生效' 
                    : '已取消显示实体表，点击查询按钮后生效',
                'info'
            );
        });
    }
    
    // 应用布局按钮点击事件
    if (applyLayoutButton) {
        applyLayoutButton.addEventListener('click', function() {
            applyCustomLayout();
        });
    }
    
    // 滑块值实时更新
    if (nodeSpacingCtrl && nodeSpacingValueEl) {
        nodeSpacingCtrl.addEventListener('input', function() {
            nodeSpacingValueEl.textContent = this.value;
        });
    }
    
    // 新增：叶子节点间距滑块值实时更新
    if (leafSpacingCtrl && leafSpacingValueEl) {
        leafSpacingCtrl.addEventListener('input', function() {
            leafSpacingValueEl.textContent = this.value;
        });
    }
    
    if (layerSpacingCtrl && layerSpacingValueEl) {
        layerSpacingCtrl.addEventListener('input', function() {
            layerSpacingValueEl.textContent = this.value;
        });
    }
    
    if (nodeFontSizeCtrl && nodeFontSizeValueEl) {
        nodeFontSizeCtrl.addEventListener('input', function() {
            nodeFontSizeValueEl.textContent = this.value;
            // 更新全局字体大小变量
            window.baseFontSize = parseInt(this.value);
            // 更新图表中的字体大小
            window.updateNodeLabelSize();
        });
    }
    
    // 展开所有节点选项变化事件
    if (expandAllNodesCtrl && myChart) {
        expandAllNodesCtrl.addEventListener('change', function() {
            if (myChart) {
                try {
                    // 自动应用布局，无需点击应用布局按钮
                    console.log('展开所有节点状态变化，自动应用布局...');
                    
                    // 调用布局函数以应用更新
                    applyCustomLayout();
                    
                    // 显示反馈消息
                    showTemporaryMessage(
                        this.checked 
                            ? '已展开所有节点，包括billitem_base等分组节点' 
                            : '已折叠部分节点至默认视图',
                        'info'
                    );
                } catch (error) {
                    console.error('展开/折叠所有节点时出错:', error);
                    showTemporaryMessage('展开/折叠操作失败: ' + error.message, 'error');
                }
            }
        });
    }
    
    // 锁定节点展开折叠选项变化事件
    if (lockNodeCollapseCtrl) {
        lockNodeCollapseCtrl.addEventListener('change', function() {
            // 更新全局锁定状态变量
            isNodeCollapseEnabled = !this.checked;
            console.log('节点展开折叠锁定状态:', this.checked ? '已锁定' : '已解锁');
            
            // 如果是锁定操作，首先展开所有节点
            if (this.checked) {
                console.log('锁定节点前先展开所有节点');
                
                try {
                    // 同步"展开所有节点"复选框状态
                    const expandAllNodesCtrl = document.getElementById('expand-all-nodes');
                    if (expandAllNodesCtrl && !expandAllNodesCtrl.checked) {
                        // 更新复选框状态但不触发其事件处理程序
                        expandAllNodesCtrl.checked = true;
                    }
                    
                    // 自动应用布局，无需点击应用布局按钮
                    console.log('锁定节点状态变化，自动应用布局...');
                    applyCustomLayout();
                    
                } catch (error) {
                    console.error('锁定前展开所有节点时出错:', error);
                }
            } else {
                // 解锁操作，恢复展开折叠功能
                try {
                    // 自动应用布局，无需点击应用布局按钮
                    console.log('解锁节点状态变化，自动应用布局...');
                    applyCustomLayout();
                } catch (error) {
                    console.error('解锁节点展开折叠功能时出错:', error);
                }
            }
            
            // 显示状态提示消息
            showTemporaryMessage(
                this.checked 
                    ? '已锁定节点：已展开所有节点并禁用节点折叠功能' 
                    : '已解锁节点：允许节点展开/折叠',
                this.checked ? 'warning' : 'success'
            );
        });
    }
    
    console.log('已创建树形图控制浮窗');
    return treeControls;
}

// 在文档加载完成后初始化控制窗口最小化/展开按钮
document.addEventListener('DOMContentLoaded', function() {
    const toggleControlsBtn = document.getElementById('toggle-controls');
    if (toggleControlsBtn) {
        toggleControlsBtn.addEventListener('click', function() {
            const controlsContent = document.getElementById('tree-controls-content');
            const minimizeIcon = document.getElementById('minimize-icon');
            const expandIcon = document.getElementById('expand-icon');
            
            if (controlsContent.style.display === 'none') {
                // 展开控制窗口
                controlsContent.style.display = 'block';
                minimizeIcon.style.display = 'block';
                expandIcon.style.display = 'none';
            } else {
                // 最小化控制窗口
                controlsContent.style.display = 'none';
                minimizeIcon.style.display = 'none';
                expandIcon.style.display = 'block';
            }
        });
    }
});

/**
 * 加载表单编码列表
 */
async function loadBillNoList() {
    try {
        // 清空选择
        tableCodeInput.value = '';
        tableCodeSearchInput.value = '';
        
        // 清空下拉列表
        tableCodeDropdown.innerHTML = '';
        
        // 获取当前环境和数据库
        const environment = dbEnvironmentSelect.value;
        const dbName = dbNameInput.value;
        const ytenant_id = document.getElementById('ytenant_id').value.trim() || "0";
        
        // 检查数据库是否选择
        if (!dbName) {
            // 显示数据库未选择的提示
            tableCodeDropdown.innerHTML = '<div class="database-error">请先选择数据库</div>';
            showTableCodeDropdown();
            return;
        }
        
        // 获取当前环境的数据库配置
        const dbConfig = dbConfigs[environment];
        
        // 检查配置是否填写
        if (!dbConfig || !dbConfig.host || !dbConfig.port || !dbConfig.username || !dbConfig.password) {
            // 显示配置未设置的提示
            tableCodeDropdown.innerHTML = '<div class="database-error">请先配置数据库连接信息</div>';
            showTableCodeDropdown();
            return;
        }
        
        // 显示加载中
        tableCodeLoading.style.display = 'block';
        
        try {
            // 调用API获取表单编码列表
            billNoList = await fetchBillNoList(environment, dbName, ytenant_id, dbConfig);
            
            // 渲染表单编码列表
            renderTableCodeOptions(billNoList);
        } catch (error) {
            console.error('获取表单编码列表失败:', error);
            tableCodeDropdown.innerHTML = `<div class="database-error">获取表单编码列表失败: ${error.message}</div>`;
            showTableCodeDropdown();
        } finally {
            // 隐藏加载中
            tableCodeLoading.style.display = 'none';
        }
    } catch (error) {
        console.error('加载表单编码列表出错:', error);
        tableCodeLoading.style.display = 'none';
    }
}

/**
 * 渲染表单编码选项列表
 * @param {Array} billNos 表单编码列表
 */
function renderTableCodeOptions(billNos) {
    // 清空下拉列表
    tableCodeDropdown.innerHTML = '';
    
    // 检查是否有数据
    if (!billNos || billNos.length === 0) {
        tableCodeDropdown.innerHTML = '<div class="database-empty">未找到表单编码</div>';
        return;
    }
    
    // 创建选项
    billNos.forEach(billNo => {
        const option = document.createElement('div');
        option.className = 'database-option';
        option.textContent = billNo;
        option.setAttribute('data-value', billNo);
        
        // 点击选择
        option.addEventListener('click', function() {
            selectTableCode(billNo);
        });
        
        tableCodeDropdown.appendChild(option);
    });
}

/**
 * 显示表单编码下拉列表
 */
function showTableCodeDropdown() {
    tableCodeDropdown.style.display = 'block';
}

/**
 * 隐藏表单编码下拉列表
 */
function hideTableCodeDropdown() {
    tableCodeDropdown.style.display = 'none';
}

/**
 * 选择表单编码
 * @param {string} billNo 表单编码
 */
function selectTableCode(billNo) {
    tableCodeInput.value = billNo;
    tableCodeSearchInput.value = billNo;
    hideTableCodeDropdown();
}

/**
 * 过滤表单编码选项
 * @param {string} searchText 搜索文本
 */
function filterTableCodeOptions(searchText) {
    // 首先显示下拉列表
    showTableCodeDropdown();
    
    // 如果没有数据，尝试加载
    if (billNoList.length === 0) {
        loadBillNoList();
        return;
    }
    
    // 清空高亮
    const options = tableCodeDropdown.querySelectorAll('.database-option');
    options.forEach(option => {
        option.classList.remove('highlighted');
    });
    
    if (!searchText) {
        // 如果搜索框为空，显示所有选项
        renderTableCodeOptions(billNoList);
        return;
    }
    
    // 过滤匹配的选项
    const filteredBillNos = billNoList.filter(billNo => 
        billNo.toLowerCase().includes(searchText.toLowerCase())
    );
    
    // 渲染过滤后的选项
    renderTableCodeOptions(filteredBillNos);
    
    // 如果只有一个匹配项，高亮显示
    if (filteredBillNos.length === 1) {
        const option = tableCodeDropdown.querySelector('.database-option');
        if (option) {
            option.classList.add('highlighted');
        }
    }
}

/**
 * 处理表单编码选择框的键盘导航
 * @param {KeyboardEvent} event 键盘事件
 */
function handleTableCodeKeyboardNavigation(event) {
    // 获取所有选项
    const options = tableCodeDropdown.querySelectorAll('.database-option');
    
    // 如果没有选项，不处理
    if (options.length === 0) return;
    
    // 获取当前高亮的选项
    let currentHighlighted = tableCodeDropdown.querySelector('.database-option.highlighted');
    let currentIndex = -1;
    
    if (currentHighlighted) {
        // 找到当前高亮选项的索引
        for (let i = 0; i < options.length; i++) {
            if (options[i] === currentHighlighted) {
                currentIndex = i;
                break;
            }
        }
    }
    
    // 根据按键处理导航
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            // 向下导航，选择下一个选项
            if (currentIndex < options.length - 1) {
                if (currentHighlighted) currentHighlighted.classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            // 向上导航，选择上一个选项
            if (currentIndex > 0) {
                if (currentHighlighted) currentHighlighted.classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
            break;
            
        case 'Enter':
            event.preventDefault();
            // 回车选择当前高亮选项
            if (currentHighlighted) {
                selectTableCode(currentHighlighted.getAttribute('data-value'));
            } else if (options.length === 1) {
                // 如果只有一个选项，自动选择
                selectTableCode(options[0].getAttribute('data-value'));
            }
            break;
            
        case 'Escape':
            // ESC键隐藏下拉列表
            hideTableCodeDropdown();
            break;
    }
}

/**
 * 加载并显示查询历史
 */
function loadQueryHistory() {
    try {
        const historyContainer = document.getElementById('history-container');
        if (!historyContainer) return;
        
        // 获取查询历史
        const history = window.getQueryHistory();
        
        // 如果没有历史记录，隐藏容器
        if (!history || history.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }
        
        // 清空现有历史记录
        // 保留第一个子元素（标题）
        const historyTitle = historyContainer.querySelector('.history-title');
        historyContainer.innerHTML = '';
        historyContainer.appendChild(historyTitle);
        
        // 添加历史记录项
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            // 检查是否为当前查询
            const isCurrentQuery = 
                item.environment === currentQuery.environment && 
                item.dbName === currentQuery.dbName && 
                item.billNo === currentQuery.billNo && 
                (item.ytenant_id || "0") === (currentQuery.ytenant_id || "0") &&
                (!!item.showEntityTables) === (!!currentQuery.showEntityTables);
            
            // 如果是当前查询，添加高亮样式
            if (isCurrentQuery) {
                historyItem.classList.add('current-query');
            }
            
            // 显示格式：环境-数据库-表单编码
            historyItem.textContent = `${getEnvironmentLabel(item.environment)} | ${item.dbName} | ${item.billNo}`;
            
            // 点击历史记录项时加载该查询
            historyItem.addEventListener('click', () => {
                restoreQueryFromHistory(item);
            });
            
            // 添加到容器
            historyContainer.appendChild(historyItem);
        });
        
        // 显示历史记录容器
        historyContainer.style.display = 'flex';
        
    } catch (error) {
        console.error('加载查询历史失败:', error);
    }
}

/**
 * 根据环境代码获取显示标签
 * 
 * @param {string} environment 环境代码
 * @returns {string} 环境显示标签
 */
function getEnvironmentLabel(environment) {
    const labels = {
        'test': '测试',
        'daily': '日常',
        'pre': '预发',
        'other': '其他'
    };
    return labels[environment] || environment;
}

/**
 * 从历史记录恢复查询
 * 
 * @param {Object} historyItem 历史记录项
 */
async function restoreQueryFromHistory(historyItem) {
    try {
        // 设置表单值
        dbEnvironmentSelect.value = historyItem.environment;
        dbNameInput.value = historyItem.dbName;
        tableCodeInput.value = historyItem.billNo;
        
        // 如果存在租户ID输入框，设置其值
        if (document.getElementById('ytenant_id')) {
            document.getElementById('ytenant_id').value = historyItem.ytenant_id || "0";
        }
        
        // 设置"显示实体表"复选框状态
        const showEntityTablesCheckbox = document.getElementById('show-entity-tables');
        if (showEntityTablesCheckbox) {
            showEntityTablesCheckbox.checked = !!historyItem.showEntityTables;
        }
        
        // 更新当前查询信息（在执行搜索前）
        currentQuery = {
            environment: historyItem.environment,
            dbName: historyItem.dbName,
            billNo: historyItem.billNo,
            ytenant_id: historyItem.ytenant_id || "0",
            showEntityTables: !!historyItem.showEntityTables
        };
        
        // 执行搜索
        await performSearch();
    } catch (error) {
        console.error('恢复历史查询失败:', error);
        alert('恢复历史查询失败: ' + error.message);
    }
}

// 页面加载时初始化查询历史
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadQueryHistory, 500); // 延迟加载以确保DOM已完全加载
});
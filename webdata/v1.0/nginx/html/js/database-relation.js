/**
 * 数据库关联树形图 页面交互与渲染
 */

// DOM元素
const dbEnvironmentSelect = document.getElementById('dbEnvironment');
const dbNameInput = document.getElementById('dbName');
const tableCodeInput = document.getElementById('tableCode');
const searchButton = document.getElementById('searchButton');
const configButton = document.getElementById('configButton');
const saveConfigButton = document.getElementById('saveConfigButton');
const closeConfigModal = document.getElementById('closeConfigModal');
const configModal = document.getElementById('configModal');
const loadingIndicator = document.getElementById('loadingIndicator');
const graphContainer = document.getElementById('graph-container');
const nodeDetails = document.getElementById('nodeDetails');
const nodeDetailContent = document.getElementById('nodeDetailContent');

// 图表实例
let myChart = null;

// 数据库配置存储
let dbConfigs = {
    test: { host: '', port: '', username: '', password: '' },
    daily: { host: '', port: '', username: '', password: '' },
    pre: { host: '', port: '', username: '', password: '' }
};

// 当前选中的节点数据
let currentNodeData = null;

// 初始加载时从服务器加载配置
document.addEventListener('DOMContentLoaded', async function() {
    await loadDbConfigsFromServer();
    initEventListeners();
    
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
}

/**
 * 执行搜索，获取并展示树形图
 */
async function performSearch() {
    const environment = dbEnvironmentSelect.value;
    const dbName = dbNameInput.value.trim();
    const billNo = tableCodeInput.value.trim();
    
    // 验证输入
    if (!billNo) {
        alert('请输入表单编码！');
        tableCodeInput.focus();
        return;
    }
    
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
                currentDbConfig
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
                return;
            }
            
            // 转换数据格式
            const formattedData = transformToEChartsFormat(treeData);
            console.log('转换后的图表数据:', formattedData);
            
            // 渲染图表
            renderGraph(formattedData);
        } catch (error) {
            console.error('API调用失败:', error);
            loadingIndicator.style.display = 'none';
            
            // 尝试使用模拟数据
            const mockData = generateMockData(billNo);
            renderGraph(mockData);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        loadingIndicator.style.display = 'none';
        alert(`搜索失败: ${error.message}`);
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
        graphContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#e8eaed">无效的数据结构，无法渲染图表</div>';
        return;
    }
    
    // 检查ECharts是否可用
    if (typeof echarts === 'undefined') {
        console.error('ECharts库未加载，无法渲染图表');
        graphContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#e8eaed">图表库未正确加载，请刷新页面重试</div>';
        return;
    }
    
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
        
        // 计算容器高度 - 至少80vh，但如果节点很多，则增加高度
        let containerHeight = '80vh';
        if (treeMetrics.nodeCount > 200) {
            containerHeight = '90vh';
        } else if (treeMetrics.maxDepth > 7 || treeMetrics.maxChildren > 15) {
            containerHeight = '85vh';
        }
        
        // 动态设置容器高度
        graphContainer.style.height = containerHeight;
        
        // 确定是否应该启用自动分组功能
        const shouldEnableAutoGrouping = treeMetrics.nodeCount > 50 || treeMetrics.maxChildren > 12;
        
        // 预处理数据 - 对大量相同类型的子节点进行分组
        const processedData = shouldEnableAutoGrouping ? processTreeGrouping(data, true) : data;
        
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
                    right: '15%',
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
                        fontSize: 12,
                        color: '#e8eaed',
                        distance: 8,
                        formatter: function(params) {
                            // 如果文本过长，截断并添加省略号
                            const text = params.name;
                            return text.length > 20 ? text.substring(0, 18) + '...' : text;
                        }
                    },
                    leaves: {
                        label: {
                            position: 'right',
                            rotate: 0,
                            verticalAlign: 'middle',
                            align: 'left',
                            fontSize: 11,
                            color: '#d0d0d0'
                        }
                    },
                    expandAndCollapse: true,
                    animationDuration: 550,
                    animationDurationUpdate: 750,
                    lineStyle: {
                        color: '#5f6368',
                        width: 1,
                        curveness: treeMetrics.nodeCount > 100 ? 0.3 : 0.5 // 节点多时降低曲率
                    },
                    itemStyle: {
                        borderWidth: 1
                    },
                    // 使用基于树结构分析的布局参数
                    nodeGap: treeMetrics.recommendedNodeGap,
                    layerPadding: treeMetrics.recommendedLayerPadding,
                    // 大量节点时启用力导向布局辅助
                    force: {
                        repulsion: treeMetrics.nodeCount > 150 ? 50 : 0,
                        layoutAnimation: treeMetrics.nodeCount <= 200 // 节点太多时禁用布局动画
                    },
                    // 大量节点时默认不显示全部节点
                    initialTreeDepth: treeMetrics.nodeCount > 150 ? 2 : -1
                }
            ]
        };
        
        console.log('设置图表选项');
        
        // 设置图表
        myChart.setOption(option);
        console.log('图表设置完成');
        
        // 绑定图表点击事件
        myChart.on('click', async function(params) {
            console.log('图表节点点击:', params.data);
            if (params.data) {
                try {
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
                        return;
                    }
                    
                    // 获取当前环境的数据库配置
                    const environment = dbEnvironmentSelect.value;
                    const dbName = dbNameInput.value.trim();
                    const currentDbConfig = dbConfigs[environment];
                    
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
                        return;
                    }
                    
                    console.log('获取表详情参数:', {
                        environment,
                        dbName,
                        tableName: params.data.tableName,
                        id: params.data.id
                    });
                    
                    // 尝试获取节点详细信息
                    try {
                        const details = await fetchTableDetails(
                            environment,
                            dbName,
                            params.data.tableName,
                            params.data.id,
                            currentDbConfig
                        );
                        showNodeDetails(details);
                    } catch (error) {
                        console.warn('无法获取详细信息，使用节点数据:', error);
                        // 使用现有节点数据显示
                        showNodeDetails({ 
                            tableName: params.data.tableName,
                            data: { id: params.data.id, name: params.data.name, '错误信息': error.message }
                        });
                    }
                } catch (error) {
                    console.error('处理节点点击事件失败:', error);
                    alert('处理节点点击事件失败: ' + error.message);
                }
            }
        });
        
        // 检查图表是否正确渲染
        setTimeout(() => {
            if (graphContainer.querySelector('canvas')) {
                console.log('图表已成功渲染，找到canvas元素');
            } else {
                console.error('图表可能未正确渲染，未找到canvas元素');
            }
        }, 500);
        
    } catch (error) {
        console.error('渲染图表失败:', error);
        graphContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#e8eaed">图表渲染失败: ${error.message}</div>`;
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
    
    // 创建表格显示详情
    const table = document.createElement('table');
    table.className = 'data-table';
    
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
    
    // 添加表名信息
    const tableNameRow = document.createElement('tr');
    const tableNameLabelCell = document.createElement('td');
    tableNameLabelCell.textContent = '表名';
    const tableNameValueCell = document.createElement('td');
    tableNameValueCell.textContent = details.tableName;
    tableNameRow.appendChild(tableNameLabelCell);
    tableNameRow.appendChild(tableNameValueCell);
    tbody.appendChild(tableNameRow);
    
    // 添加所有字段信息
    if (details.data) {
        // 按字段名排序，把重要字段排在前面
        const priorityFields = ['id', 'name', 'cName', '节点类型', '节点数量'];
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
            if (key === 'tableName') return; // 已经显示过表名，跳过
            
            const row = document.createElement('tr');
            
            const labelCell = document.createElement('td');
            labelCell.textContent = key;
            
            const valueCell = document.createElement('td');
            const displayValue = value !== null && value !== undefined ? String(value) : '';
            
            // 如果值太长，截断显示
            if (displayValue.length > 50) {
                valueCell.textContent = displayValue.substring(0, 47) + '...';
                valueCell.title = displayValue; // 鼠标悬停时显示完整值
            } else {
                valueCell.textContent = displayValue;
            }
            
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
    const detailsWidth = 280; // 详情面板宽度
    
    // 设置位置 - 距离右侧10px
    nodeDetails.style.position = 'absolute';
    nodeDetails.style.right = '10px';
    nodeDetails.style.top = '60px'; // 设置顶部位置，避免遮挡工具栏
    nodeDetails.style.zIndex = '100';
    nodeDetails.style.width = `${detailsWidth}px`;
    nodeDetails.style.maxHeight = `${containerRect.height - 70}px`; // 减少高度，避免超出容器
    nodeDetails.style.overflowY = 'auto';
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
            pre: configs.pre || { host: '', port: '', username: '', password: '' }
        };
        
        // 填充配置表单
        populateConfigForm();
        
        // 移除加载消息
        document.body.removeChild(message);
    } catch (error) {
        console.error('加载数据库配置失败:', error);
        
        // 使用默认配置
        dbConfigs = {
            test: { host: 'localhost', port: '3306', username: 'root', password: '' },
            daily: { host: 'localhost', port: '3306', username: 'root', password: '' },
            pre: { host: 'localhost', port: '3306', username: 'root', password: '' }
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
            
            // 隐藏缩放提示
            hideZoomHint();
            
            if (params.data) {
                try {
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
                        return;
                    }
                    
                    // 获取当前环境的数据库配置
                    const environment = dbEnvironmentSelect.value;
                    const dbName = dbNameInput.value.trim();
                    const currentDbConfig = dbConfigs[environment];
                    
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
                        return;
                    }
                    
                    console.log('获取表详情参数:', {
                        environment,
                        dbName,
                        tableName: params.data.tableName,
                        id: params.data.id
                    });
                    
                    // 尝试获取节点详细信息
                    try {
                        const details = await fetchTableDetails(
                            environment,
                            dbName,
                            params.data.tableName,
                            params.data.id,
                            currentDbConfig
                        );
                        showNodeDetails(details);
                    } catch (error) {
                        console.warn('无法获取详细信息，使用节点数据:', error);
                        // 使用现有节点数据显示
                        showNodeDetails({ 
                            tableName: params.data.tableName,
                            data: { id: params.data.id, name: params.data.name, '错误信息': error.message }
                        });
                    }
                } catch (error) {
                    console.error('处理节点点击事件失败:', error);
                    alert('处理节点点击事件失败: ' + error.message);
                }
            }
        });
        
        return myChart;
    } catch (error) {
        console.error('初始化图表失败:', error);
        graphContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#e8eaed">图表初始化失败: ' + error.message + '</div>';
        return null;
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
                    
                    // 对于大组，添加可展开/折叠功能
                    const isLargeGroup = typeCounts[child.tableName] > 10;
                    
                    groups[child.tableName] = {
                        name: `${child.tableName} (${typeCounts[child.tableName]}个)`,
                        tableName: `${child.tableName}_group`,
                        id: `group_${child.tableName}_${Date.now()}`, // 确保ID唯一
                        isGroup: true, // 标记为分组节点
                        collapsed: isLargeGroup, // 大组默认折叠
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
    let recommendedNodeGap = 60; // 默认节点间距
    let recommendedLayerPadding = 180; // 默认层级间距
    
    // 根据节点数量和深度调整
    if (nodeCount > 200) {
        recommendedNodeGap = 30; // 节点很多时，间距适当缩小
    } else if (nodeCount > 100) {
        recommendedNodeGap = 40;
    }
    
    // 根据树的宽度动态调整层级间距
    if (maxDepth > 5) {
        // 树很深时，增加层级间距，但考虑总宽度
        recommendedLayerPadding = Math.min(220, Math.max(180, 360 / maxDepth));
    }
    
    // 根据每层最多节点数调整节点间距
    if (widestLevelNodes > 20) {
        recommendedNodeGap = Math.max(20, Math.min(40, 800 / widestLevelNodes));
    }
    
    // 叶子节点过多时，调整策略
    if (leafCount > 100) {
        recommendedNodeGap = Math.min(recommendedNodeGap, 35);
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
    
    try {
        // 重新处理数据
        const processedData = enableGrouping 
            ? processTreeGrouping(window.originalTreeData, true) 
            : window.originalTreeData;
        
        // 更新配置
        const option = myChart.getOption();
        option.series[0].data = [processedData];
        option.series[0].nodeGap = nodeSpacing;
        option.series[0].layerPadding = layerSpacing;
        option.series[0].initialTreeDepth = expandAll ? -1 : 2;
        
        // 应用更新
        myChart.setOption(option);
        
        console.log('自定义布局已应用', {
            enableGrouping,
            nodeSpacing,
            layerSpacing,
            expandAll
        });
    } catch (error) {
        console.error('应用自定义布局失败:', error);
    }
}
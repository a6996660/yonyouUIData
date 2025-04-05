/**
 * 数据库关联树形图 API 接口
 */

// API基础URL
const API_BASE_URL = 'http://127.0.0.1:8090/api/v1';

/**
 * 获取数据库表关联树形结构
 * 
 * @param {string} environment 环境（测试、日常、预发）
 * @param {string} dbName 数据库名称
 * @param {string} billNo 表单编码
 * @param {Object} dbConfig 数据库配置信息
 * @param {string} ytenant_id 租户ID
 * @returns {Promise} 返回表关联数据
 */
async function fetchDbRelationTree(environment, dbName, billNo, dbConfig, ytenant_id) {
    try {
        const url = `${API_BASE_URL}/db-relation/tree`;
        
        const requestData = {
            environment: environment,
            dbName: dbName,
            billNo: billNo,
            ytenant_id: ytenant_id,
            dbConfig: dbConfig
        };
        
        console.log("请求数据:", requestData);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: '未知错误' };
            }
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '获取数据库关联树失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('获取数据库关联树失败:', error);
        throw error;
    }
}

/**
 * 获取表节点详细信息
 * 
 * @param {string} environment 环境（测试、日常、预发）
 * @param {string} dbName 数据库名称
 * @param {string} tableName 表名
 * @param {string} id 节点ID
 * @param {Object} dbConfig 数据库配置
 * @param {string} ytenant_id 租户ID
 * @returns {Promise} 返回表详情
 */
async function fetchTableDetails(environment, dbName, tableName, id, dbConfig, ytenant_id) {
    try {
        const url = `${API_BASE_URL}/db-relation/table-details`;
        
        // 确保所有必要参数存在
        if (!dbName) {
            throw new Error('数据库名称未指定');
        }
        
        if (!tableName) {
            throw new Error('表名未指定');
        }
        
        if (!id) {
            throw new Error('节点ID未指定');
        }
        
        const requestData = {
            environment: environment,
            dbName: dbName,
            tableName: tableName,
            id: id,
            ytenant_id: ytenant_id,
            dbConfig: dbConfig
        };
        
        console.log("获取表详情请求数据:", {
            environment,
            dbName,
            tableName,
            id,
            ytenant_id,
            dbConfig: { ...dbConfig, password: '******' } // 隐藏密码
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: '未知错误' };
            }
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '获取表详情失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('获取表详情失败:', error);
        throw error;
    }
}

/**
 * 保存数据库配置
 * 
 * @param {Object} configs 数据库配置信息
 * @returns {Promise} 返回保存结果
 */
async function saveDbConfigsToServer(configs) {
    try {
        const url = `${API_BASE_URL}/db-config/save`;
        
        // 构建请求数据
        const requestData = {
            configs: configs
        };
        
        console.log("保存配置数据:", requestData);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: '未知错误' };
            }
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '保存数据库配置失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('保存数据库配置失败:', error);
        throw error;
    }
}

/**
 * 从服务器获取数据库配置
 * 
 * @returns {Promise} 返回数据库配置信息
 */
async function fetchDbConfigsFromServer() {
    try {
        const url = `${API_BASE_URL}/db-config/get`;
        
        console.log("获取配置数据");
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: '未知错误' };
            }
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '获取数据库配置失败');
        }
        
        return data.data.configs || {};
    } catch (error) {
        console.error('获取数据库配置失败:', error);
        throw error;
    }
}

/**
 * 将API返回的数据转换为ECharts可用的树形结构格式
 * 
 * @param {Object} data API返回的数据
 * @returns {Object} ECharts树形图数据
 */
window.transformToEChartsFormat = function(data) {
    // 无数据时返回空结构
    if (!data || !data.rootNode) {
        return {
            name: '未找到数据',
            children: []
        };
    }
    
    // 递归构建树形结构
    function buildTree(node) {
        if (!node) return null;
        
        const result = {
            name: getNodeDisplayName(node),
            tableName: node.tableName,
            id: node.id,
            itemStyle: {
                color: getNodeColor(node.tableName)
            }
        };
        
        if (node.children && node.children.length > 0) {
            result.children = node.children.map(child => buildTree(child));
        }
        
        return result;
    }
    
    // 根据表名获取节点的显示名称
    function getNodeDisplayName(node) {
        if (!node) return '未知节点';
        
        let displayName = '';
        const attrs = node.attributes || {};
        
        // 根据需求文档中的规则设置节点名称
        switch (node.tableName) {
            case 'bill_base':
                displayName = `${attrs.cBillNo || node.cBillNo || ''} ${attrs.cName || node.cName || ''}`;
                break;
            case 'billentity_base':
                displayName = attrs.cName || node.cName || '实体';
                break;
            case 'billtemplate_base':
                displayName = attrs.cName || node.cName || '模板';
                break;
            case 'billtplgroup_base':
                displayName = `${attrs.ccode || node.ccode || ''} ${attrs.cName || node.cName || ''}`;
                break;
            case 'billitem_base':
                displayName = `${attrs.cName || node.cName || ''} ${attrs.cShowCaption || node.cShowCaption || ''}`;
                break;
            case 'bill_toolbar':
                displayName = attrs.name || node.name || '工具栏';
                break;
            case 'bill_toolbaritem':
                displayName = attrs.name || node.name || '工具栏项';
                break;
            case 'bill_command':
                displayName = attrs.name || node.name || '命令';
                break;
            case 'pb_meta_filters':
                displayName = attrs.filterDesc || node.filterDesc || '过滤区';
                break;
            case 'pb_meta_filter_item':
                displayName = attrs.itemTitle || node.itemTitle || '过滤项';
                break;
            case 'pb_filter_solution':
                displayName = attrs.solutionName || node.solutionName || '过滤方案';
                break;
            case 'pb_filter_solution_common':
                displayName = attrs.itemTitle || node.itemTitle || '公共过滤方案';
                break;
            default:
                displayName = node.tableName || '未知表';
        }
        
        return displayName;
    }
    
    // 根据表名设置节点颜色
    function getNodeColor(tableName) {
        // 为不同类型的表设置不同颜色
        const colorMap = {
            'bill_base': '#F28B82', // 红色
            'billentity_base': '#FBBC04', // 黄色
            'billtemplate_base': '#FAD166', // 浅黄色
            'billtplgroup_base': '#E8EAED', // 白色
            'billitem_base': '#A142F4', // 紫色
            'bill_toolbar': '#8AB4F8', // 蓝色
            'bill_toolbaritem': '#81C995', // 绿色
            'bill_command': '#F6AEA9', // 粉色
            'pb_meta_filters': '#C58AF9', // 紫色
            'pb_meta_filter_item': '#F8BD88', // 橙色
            'pb_filter_solution': '#AECBFA', // 浅蓝色
            'pb_filter_solution_common': '#CEEAD6' // 浅绿色
        };
        
        return colorMap[tableName] || '#E8EAED'; // 默认颜色为白色
    }
    
    // 构建树结构并返回
    return buildTree(data.rootNode);
}

/**
 * 生成模拟数据用于开发测试
 * 
 * @param {string} billNo 表单编码
 * @returns {Object} 模拟的树形结构数据
 */
window.generateMockData = function(billNo) {
    // 根据提供的SQL查询逻辑创建模拟数据
    const mockApiData = {
        rootNode: {
            tableName: 'bill_base',
            id: '1',
            cBillNo: billNo,
            cName: '单据基本信息',
            cFilterId: '101',
            children: [
                {
                    tableName: 'billentity_base',
                    id: '11',
                    cName: '单据实体信息',
                    children: [
                        {
                            tableName: 'billtemplate_base',
                            id: '111',
                            cName: '单据模板信息',
                            children: [
                                {
                                    tableName: 'billtplgroup_base',
                                    id: '1111',
                                    ccode: 'btn-group',
                                    cName: '按钮组',
                                    children: [
                                        {
                                            tableName: 'billitem_base',
                                            id: '11111',
                                            cName: 'item1',
                                            cShowCaption: '字段1',
                                            children: []
                                        },
                                        {
                                            tableName: 'billitem_base',
                                            id: '11112',
                                            cName: 'item2',
                                            cShowCaption: '字段2',
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    tableName: 'bill_toolbar',
                                    id: '1112',
                                    name: '工具栏',
                                    children: [
                                        {
                                            tableName: 'bill_toolbaritem',
                                            id: '11121',
                                            name: '工具栏项1',
                                            children: [
                                                {
                                                    tableName: 'bill_command',
                                                    id: '111211',
                                                    name: '命令1',
                                                    children: []
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    tableName: 'pb_meta_filters',
                    id: '12',
                    filterDesc: '过滤器描述',
                    children: [
                        {
                            tableName: 'pb_meta_filter_item',
                            id: '121',
                            itemTitle: '过滤项1',
                            children: []
                        },
                        {
                            tableName: 'pb_filter_solution',
                            id: '122',
                            solutionName: '过滤方案1',
                            children: [
                                {
                                    tableName: 'pb_filter_solution_common',
                                    id: '1221',
                                    itemTitle: '通用过滤方案1',
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
    
    return transformToEChartsFormat(mockApiData);
} 
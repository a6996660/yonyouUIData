/**
 * 代码知识图谱 API 接口
 */

// API基础URL
const API_BASE_URL = 'http://127.0.0.1:8090/api/v1';

/**
 * 获取方法调用关系图谱
 * 
 * @param {string} className 类名
 * @param {string} methodName 方法名
 * @param {number} depth 递归深度，默认为3
 * @returns {Promise} 返回方法调用关系数据
 */
async function fetchMethodGraph(className, methodName, depth = 3) {
    try {
        // 使用类名#方法名格式，更符合Java方法引用的标准格式
        const classMethod = `${className}#${methodName}`;
        
        // 使用单独的参数传递，避免解析错误
        const url = `${API_BASE_URL}/code-graph/method?className=${encodeURIComponent(className)}&methodName=${encodeURIComponent(methodName)}&depth=${depth}`;
        
        // 使用classMethod参数作为备用
        // const url = `${API_BASE_URL}/code-graph/method?classMethod=${encodeURIComponent(classMethod)}&depth=${depth}`;
        
        console.log("请求URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '获取方法调用图谱失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('获取方法调用图谱失败:', error);
        throw error;
    }
}

/**
 * 搜索相关方法
 * 
 * @param {string} query 搜索关键词
 * @returns {Promise} 返回相关方法列表
 */
async function searchMethods(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/code-graph/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '搜索方法失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('搜索方法失败:', error);
        throw error;
    }
}

/**
 * 获取方法详细信息
 * 
 * @param {string} className 类名
 * @param {string} methodName 方法名
 * @returns {Promise} 返回方法详情
 */
async function fetchMethodDetails(className, methodName) {
    try {
        // 改为使用单独的参数，避免解析错误
        const url = `${API_BASE_URL}/code-graph/method-details?className=${encodeURIComponent(className)}&methodName=${encodeURIComponent(methodName)}`;
        
        // 使用classMethod参数作为备用
        // const classMethod = `${className}#${methodName}`;
        // const url = `${API_BASE_URL}/code-graph/method-details?classMethod=${encodeURIComponent(classMethod)}`;
        
        console.log("请求URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API错误响应:", errorData);
            throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        if (data.code !== '0000') {
            throw new Error(data.message || '获取方法详情失败');
        }
        
        return data.data;
    } catch (error) {
        console.error('获取方法详情失败:', error);
        throw error;
    }
}

/**
 * 将API返回的数据转换为ECharts可用的格式
 * 
 * @param {Object} data API返回的数据
 * @returns {Object} ECharts图表数据
 */
function transformToEChartsFormat(data) {
    // 无数据时返回空结构
    if (!data) {
        return {
            name: '未找到方法',
            children: []
        };
    }
    
    // 将calledBy数组转换为children
    const calledByChildren = (data.calledBy || []).map(caller => {
        return {
            name: caller.methodName,
            className: caller.className,
            value: caller.count || 1,
            params: caller.params,
            returnType: caller.returnType,
            filePath: caller.filePath,
            itemStyle: {
                color: '#8AB4F8'  // 调用者节点使用蓝色
            }
        };
    });
    
    // 将calls数组转换为children
    const callsChildren = (data.calls || []).map(callee => {
        return {
            name: callee.methodName,
            className: callee.className,
            value: callee.count || 1,
            params: callee.params,
            returnType: callee.returnType,
            filePath: callee.filePath,
            children: callee.children || [],
            itemStyle: {
                color: '#81C995'  // 被调用者节点使用绿色
            }
        };
    });
    
    // 构建完整的树结构
    return {
        name: data.methodName,
        className: data.className,
        value: data.count || 1,
        params: data.params,
        returnType: data.returnType,
        filePath: data.filePath,
        itemStyle: {
            color: '#F28B82'  // 中心节点使用红色
        },
        children: [...calledByChildren, ...callsChildren]
    };
} 
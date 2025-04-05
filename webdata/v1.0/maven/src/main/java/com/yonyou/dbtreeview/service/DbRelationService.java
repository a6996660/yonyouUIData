package com.yonyou.dbtreeview.service;

import com.yonyou.dbtreeview.dto.DbConfigDTO;
import com.yonyou.dbtreeview.model.DbTreeResponse;
import com.yonyou.dbtreeview.model.TableDetailsResponse;

import java.util.Map;

/**
 * 数据库关系服务接口
 */
public interface DbRelationService {
    
    /**
     * 获取数据库表关联树形结构
     *
     * @param environment 环境（测试、日常、预发）
     * @param dbName 数据库名称
     * @param billNo 表单编码
     * @param ytenant_id 租户ID
     * @param dbConfig 数据库配置
     * @return 树形结构数据
     */
    DbTreeResponse getDbRelationTree(String environment, String dbName, String billNo, String ytenant_id, DbConfigDTO dbConfig);
    
    /**
     * 获取表节点详细信息
     *
     * @param environment 环境（测试、日常、预发）
     * @param dbName 数据库名称
     * @param tableName 表名
     * @param id 记录ID
     * @param ytenant_id 租户ID
     * @param dbConfig 数据库配置
     * @return 表详情数据
     */
    TableDetailsResponse getTableDetails(String environment, String dbName, String tableName, String id, String ytenant_id, DbConfigDTO dbConfig);
    
    /**
     * 更新表数据
     *
     * @param environment 环境（测试、日常、预发）
     * @param dbName 数据库名称
     * @param tableName 表名
     * @param id 记录ID
     * @param ytenant_id 租户ID
     * @param editedFields 已编辑的字段，键为字段名，值为新值
     * @param dbConfig 数据库配置
     * @return 是否更新成功
     */
    boolean updateTableData(String environment, String dbName, String tableName, String id, String ytenant_id, Map<String, Object> editedFields, DbConfigDTO dbConfig);
} 
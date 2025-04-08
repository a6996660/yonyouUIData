package com.yonyou.dbtreeview.controller;

import com.yonyou.dbtreeview.dto.ApiResponse;
import com.yonyou.dbtreeview.dto.DbConfigDTO;
import com.yonyou.dbtreeview.dto.DbRelationRequest;
import com.yonyou.dbtreeview.model.DbTreeResponse;
import com.yonyou.dbtreeview.model.TableDetailsResponse;
import com.yonyou.dbtreeview.service.DbRelationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据库关联关系控制器
 */
@RestController
@RequestMapping("/api/v1/db-relation")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DbRelationController {

    private static final Logger logger = LoggerFactory.getLogger(DbRelationController.class);

    @Autowired
    private DbRelationService dbRelationService;

    /**
     * 获取数据库表关联树形结构
     *
     * @param request 包含环境、数据库名称、表单编码和数据库配置的请求
     * @return 树形结构数据
     */
    @PostMapping("/tree")
    public ApiResponse<DbTreeResponse> getDbRelationTree(@RequestBody DbRelationRequest request) {
        logger.info("接收到获取数据库关联树请求: 环境={}, 数据库名={}, 表单编码={}, 租户ID={}", 
                request.getEnvironment(), request.getDbName(), request.getBillNo(), request.getYtenant_id());
        
        try {
            return ApiResponse.success(dbRelationService.getDbRelationTree(
                    request.getEnvironment(),
                    request.getDbName(),
                    request.getBillNo(),
                    request.getYtenant_id(),
                    request.getDbConfig()
            ));
        } catch (Exception e) {
            logger.error("获取数据库关联树失败", e);
            return ApiResponse.error("获取数据库关联树失败: " + e.getMessage());
        }
    }

    /**
     * 获取表详情
     *
     * @param request 请求参数
     * @return 返回表详情
     */
    @PostMapping("/table-details")
    public ApiResponse<TableDetailsResponse> getTableDetails(@RequestBody DbRelationRequest request) {
        try {
            logger.info("获取表详情, 参数: {}", request.toString());
            
            // 参数验证
            if (request.getDbName() == null || request.getDbName().isEmpty()) {
                logger.error("数据库名称未指定");
                return ApiResponse.error("数据库名称未指定");
            }
            
            if (request.getTableName() == null || request.getTableName().isEmpty()) {
                logger.error("表名未指定");
                return ApiResponse.error("表名未指定");
            }
            
            if (request.getId() == null || request.getId().isEmpty()) {
                logger.error("ID未指定");
                return ApiResponse.error("ID未指定");
            }
            
            if (request.getDbConfig() == null) {
                logger.error("数据库配置未指定");
                return ApiResponse.error("数据库配置未指定");
            }
            
            // 添加日志记录参数
            logger.info("获取表详情, 参数详情: 环境={}, 数据库名={}, 表名={}, ID={}, 租户ID={}", 
                request.getEnvironment(), request.getDbName(), request.getTableName(), request.getId(), request.getYtenant_id());
            
            // 创建DTO对象
            DbConfigDTO dbConfigDTO = new DbConfigDTO();
            dbConfigDTO.setHost(request.getDbConfig().getHost());
            dbConfigDTO.setPort(request.getDbConfig().getPort());
            dbConfigDTO.setUsername(request.getDbConfig().getUsername());
            dbConfigDTO.setPassword(request.getDbConfig().getPassword());
            
            // 调用服务
            TableDetailsResponse response = dbRelationService.getTableDetails(
                request.getEnvironment(),
                request.getDbName(),
                request.getTableName(),
                request.getId(),
                request.getYtenant_id(),
                dbConfigDTO
            );
            
            return ApiResponse.success(response);
        } catch (Exception e) {
            logger.error("获取表详情失败", e);
            return ApiResponse.error("获取表详情失败: " + e.getMessage());
        }
    }

    /**
     * 更新表数据
     * 
     * @param request 包含环境、数据库名称、表名、ID、租户ID、编辑字段和数据库配置的请求
     * @return 更新结果
     */
    @PostMapping("/table-update")
    public ApiResponse<?> updateTableData(@RequestBody DbRelationRequest request) {
        logger.info("接收到更新表数据请求: 环境={}, 数据库名={}, 表名={}, ID={}, 租户ID={}", 
                request.getEnvironment(), request.getDbName(), request.getTableName(), 
                request.getId(), request.getYtenant_id());
        
        try {
            // 参数验证
            if (request.getDbName() == null || request.getDbName().isEmpty()) {
                return ApiResponse.error("数据库名称未指定");
            }
            
            if (request.getTableName() == null || request.getTableName().isEmpty()) {
                return ApiResponse.error("表名未指定");
            }
            
            if (request.getId() == null || request.getId().isEmpty()) {
                return ApiResponse.error("ID未指定");
            }
            
            if (request.getEditedFields() == null || request.getEditedFields().isEmpty()) {
                return ApiResponse.error("没有需要更新的字段");
            }
            
            if (request.getDbConfig() == null) {
                return ApiResponse.error("数据库配置未指定");
            }
            
            // 创建DTO对象
            DbConfigDTO dbConfigDTO = new DbConfigDTO();
            dbConfigDTO.setHost(request.getDbConfig().getHost());
            dbConfigDTO.setPort(request.getDbConfig().getPort());
            dbConfigDTO.setUsername(request.getDbConfig().getUsername());
            dbConfigDTO.setPassword(request.getDbConfig().getPassword());
            
            // 调用服务更新数据
            Map<String, Object> result = dbRelationService.updateTableData(
                request.getEnvironment(),
                request.getDbName(),
                request.getTableName(),
                request.getId(),
                request.getYtenant_id(),
                request.getEditedFields(),
                dbConfigDTO
            );
            
            Boolean success = (Boolean) result.get("success");
            String sql = (String) result.get("sql");
            
            if (success) {
                return ApiResponse.success("数据更新成功", sql);
            } else {
                return ApiResponse.error("数据更新失败", sql);
            }
        } catch (Exception e) {
            logger.error("更新表数据失败", e);
            return ApiResponse.error("更新表数据失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取数据库列表
     * 
     * @param request 包含环境和数据库配置的请求
     * @return 数据库列表
     */
    @PostMapping("/database-list")
    public ApiResponse<List<String>> getDatabaseList(@RequestBody DbRelationRequest request) {
        logger.info("接收到获取数据库列表请求: 环境={}", request.getEnvironment());
        
        try {
            // 参数验证
            if (request.getDbConfig() == null) {
                return ApiResponse.error("数据库配置未指定");
            }
            
            // 创建DTO对象
            DbConfigDTO dbConfigDTO = new DbConfigDTO();
            dbConfigDTO.setHost(request.getDbConfig().getHost());
            dbConfigDTO.setPort(request.getDbConfig().getPort());
            dbConfigDTO.setUsername(request.getDbConfig().getUsername());
            dbConfigDTO.setPassword(request.getDbConfig().getPassword());
            
            // 调用服务获取数据库列表
            List<String> databaseList = dbRelationService.getDatabaseList(
                request.getEnvironment(),
                dbConfigDTO
            );
            
            return ApiResponse.success(databaseList);
        } catch (Exception e) {
            logger.error("获取数据库列表失败", e);
            return ApiResponse.error("获取数据库列表失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取表单编码列表
     * 
     * @param request 包含环境、数据库名称、租户ID和数据库配置的请求
     * @return 表单编码列表
     */
    @PostMapping("/billno-list")
    public ApiResponse<List<String>> getBillNoList(@RequestBody DbRelationRequest request) {
        logger.info("接收到获取表单编码列表请求: 环境={}, 数据库名={}, 租户ID={}", 
                request.getEnvironment(), request.getDbName(), request.getYtenant_id());
        
        try {
            // 参数验证
            if (request.getDbName() == null || request.getDbName().isEmpty()) {
                return ApiResponse.error("数据库名称未指定");
            }
            
            if (request.getDbConfig() == null) {
                return ApiResponse.error("数据库配置未指定");
            }
            
            // 创建DTO对象
            DbConfigDTO dbConfigDTO = new DbConfigDTO();
            dbConfigDTO.setHost(request.getDbConfig().getHost());
            dbConfigDTO.setPort(request.getDbConfig().getPort());
            dbConfigDTO.setUsername(request.getDbConfig().getUsername());
            dbConfigDTO.setPassword(request.getDbConfig().getPassword());
            
            // 调用服务获取表单编码列表
            List<String> billNoList = dbRelationService.getBillNoList(
                request.getEnvironment(),
                request.getDbName(),
                request.getYtenant_id(),
                dbConfigDTO
            );
            
            return ApiResponse.success(billNoList);
        } catch (Exception e) {
            logger.error("获取表单编码列表失败", e);
            return ApiResponse.error("获取表单编码列表失败: " + e.getMessage());
        }
    }
} 
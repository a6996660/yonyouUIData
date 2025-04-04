package com.yonyou.dbtreeview.controller;

import com.yonyou.dbtreeview.dto.ApiResponse;
import com.yonyou.dbtreeview.dto.DbConfigsDTO;
import com.yonyou.dbtreeview.service.DbConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 数据库配置控制器
 */
@RestController
@RequestMapping("/api/v1/db-config")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DbConfigController {

    private static final Logger logger = LoggerFactory.getLogger(DbConfigController.class);

    @Autowired
    private DbConfigService dbConfigService;

    /**
     * 保存数据库配置
     *
     * @param configs 数据库配置信息
     * @return 保存结果
     */
    @PostMapping("/save")
    public ApiResponse<Void> saveDbConfigs(@RequestBody DbConfigsDTO configs) {
        logger.info("接收到保存数据库配置请求");
        
        try {
            dbConfigService.saveDbConfigs(configs);
            return ApiResponse.success();
        } catch (Exception e) {
            logger.error("保存数据库配置失败", e);
            return ApiResponse.error("保存数据库配置失败: " + e.getMessage());
        }
    }

    /**
     * 获取数据库配置
     *
     * @return 数据库配置信息
     */
    @GetMapping("/get")
    public ApiResponse<DbConfigsDTO> getDbConfigs() {
        logger.info("接收到获取数据库配置请求");
        
        try {
            DbConfigsDTO configs = dbConfigService.getDbConfigs();
            return ApiResponse.success(configs);
        } catch (Exception e) {
            logger.error("获取数据库配置失败", e);
            return ApiResponse.error("获取数据库配置失败: " + e.getMessage());
        }
    }
} 
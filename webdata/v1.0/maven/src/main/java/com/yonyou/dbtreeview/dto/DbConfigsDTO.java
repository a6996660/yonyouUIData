package com.yonyou.dbtreeview.dto;

import java.util.Map;
import java.util.HashMap;

/**
 * 数据库配置集合DTO
 */
public class DbConfigsDTO {
    
    private Map<String, DbConfigDTO> configs;
    
    public DbConfigsDTO() {
        this.configs = new HashMap<>();
    }
    
    public DbConfigsDTO(Map<String, DbConfigDTO> configs) {
        this.configs = configs;
    }

    public Map<String, DbConfigDTO> getConfigs() {
        return configs;
    }

    public void setConfigs(Map<String, DbConfigDTO> configs) {
        this.configs = configs;
    }
    
    /**
     * 获取指定环境的配置
     *
     * @param environment 环境名称
     * @return 数据库配置
     */
    public DbConfigDTO getConfigForEnvironment(String environment) {
        return configs.get(environment);
    }
    
    /**
     * 设置指定环境的配置
     *
     * @param environment 环境名称
     * @param config 数据库配置
     */
    public void setConfigForEnvironment(String environment, DbConfigDTO config) {
        this.configs.put(environment, config);
    }
} 
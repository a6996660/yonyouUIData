package com.yonyou.dbtreeview.service;

import com.yonyou.dbtreeview.dto.DbConfigsDTO;

/**
 * 数据库配置服务接口
 */
public interface DbConfigService {
    
    /**
     * 保存数据库配置
     *
     * @param configs 数据库配置集合
     */
    void saveDbConfigs(DbConfigsDTO configs);
    
    /**
     * 获取数据库配置
     *
     * @return 数据库配置集合
     */
    DbConfigsDTO getDbConfigs();
} 
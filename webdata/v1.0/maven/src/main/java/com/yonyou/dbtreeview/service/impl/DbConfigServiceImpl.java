package com.yonyou.dbtreeview.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yonyou.dbtreeview.dto.DbConfigDTO;
import com.yonyou.dbtreeview.dto.DbConfigsDTO;
import com.yonyou.dbtreeview.service.DbConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据库配置服务实现类
 */
@Service
public class DbConfigServiceImpl implements DbConfigService {

    private static final Logger logger = LoggerFactory.getLogger(DbConfigServiceImpl.class);
    
    /**
     * 配置文件路径
     */
    @Value("${app.db-config-file:./db-config.json}")
    private String configFilePath;
    
    /**
     * JSON对象映射器
     */
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void saveDbConfigs(DbConfigsDTO configs) {
        try {
            // 创建配置文件目录（如果不存在）
            File configFile = new File(configFilePath);
            File configDir = configFile.getParentFile();
            if (configDir != null && !configDir.exists()) {
                configDir.mkdirs();
            }
            
            // 将配置对象序列化为JSON字符串
            String configJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(configs);
            
            // 写入配置文件
            Files.write(Paths.get(configFilePath), configJson.getBytes());
            
            logger.info("数据库配置已保存到文件: {}", configFilePath);
        } catch (Exception e) {
            logger.error("保存数据库配置失败", e);
            throw new RuntimeException("保存数据库配置失败: " + e.getMessage(), e);
        }
    }

    @Override
    public DbConfigsDTO getDbConfigs() {
        try {
            // 检查配置文件是否存在
            File configFile = new File(configFilePath);
            if (!configFile.exists()) {
                logger.info("配置文件不存在，返回默认配置: {}", configFilePath);
                return createDefaultConfig();
            }
            
            // 读取配置文件内容
            byte[] jsonData = Files.readAllBytes(Paths.get(configFilePath));
            
            // 反序列化JSON为配置对象
            return objectMapper.readValue(jsonData, DbConfigsDTO.class);
        } catch (Exception e) {
            logger.error("读取数据库配置失败", e);
            // 发生错误时返回默认配置
            return createDefaultConfig();
        }
    }
    
    /**
     * 创建默认配置
     *
     * @return 默认配置对象
     */
    private DbConfigsDTO createDefaultConfig() {
        Map<String, DbConfigDTO> configs = new HashMap<>();
        
        // 测试环境默认配置
        configs.put("test", new DbConfigDTO("localhost", "3306", "root", ""));
        
        // 日常环境默认配置
        configs.put("daily", new DbConfigDTO("localhost", "3306", "root", ""));
        
        // 预发环境默认配置
        configs.put("pre", new DbConfigDTO("localhost", "3306", "root", ""));
        
        return new DbConfigsDTO(configs);
    }
} 
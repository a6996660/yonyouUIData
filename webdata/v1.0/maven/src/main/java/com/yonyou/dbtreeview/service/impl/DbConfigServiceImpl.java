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
import java.nio.file.Path;
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
            Path path = resolveConfigPath();
            
            // 创建配置文件目录（如果不存在）
            File configDir = path.getParent().toFile();
            if (configDir != null && !configDir.exists()) {
                configDir.mkdirs();
            }
            
            // 将配置对象序列化为JSON字符串
            String configJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(configs);
            
            // 写入配置文件
            Files.write(path, configJson.getBytes());
            
            logger.info("数据库配置已保存到文件: {}", path);
        } catch (Exception e) {
            logger.error("保存数据库配置失败", e);
            throw new RuntimeException("保存数据库配置失败: " + e.getMessage(), e);
        }
    }

    @Override
    public DbConfigsDTO getDbConfigs() {
        try {
            Path path = resolveConfigPath();
            
            // 检查配置文件是否存在
            if (!Files.exists(path)) {
                logger.info("配置文件不存在，返回默认配置: {}", path);
                return createDefaultConfig();
            }
            
            // 读取配置文件内容
            byte[] jsonData = Files.readAllBytes(path);
            
            // 反序列化JSON为配置对象
            return objectMapper.readValue(jsonData, DbConfigsDTO.class);
        } catch (Exception e) {
            logger.error("读取数据库配置失败: {}", e.getMessage(), e);
            // 发生错误时返回默认配置
            return createDefaultConfig();
        }
    }
    
    /**
     * 解析配置文件路径
     * 尝试多种路径以找到配置文件，包括相对路径和绝对路径
     * 
     * @return 配置文件路径
     */
    private Path resolveConfigPath() {
        // 首先尝试直接使用配置的路径
        Path path = Paths.get(configFilePath);
        if (Files.exists(path)) {
            logger.debug("使用配置的路径: {}", path.toAbsolutePath());
            return path;
        }
        
        // 尝试相对于应用程序运行目录的路径
        Path workDirPath = Paths.get(System.getProperty("user.dir"), configFilePath);
        if (Files.exists(workDirPath)) {
            logger.debug("使用工作目录路径: {}", workDirPath.toAbsolutePath());
            return workDirPath;
        }
        
        // 尝试相对于JAR文件所在目录的路径
        try {
            String jarPath = DbConfigServiceImpl.class.getProtectionDomain().getCodeSource().getLocation().toURI().getPath();
            File jarFile = new File(jarPath);
            if (jarFile.isFile()) { // 确保是JAR文件
                Path jarDirPath = Paths.get(jarFile.getParent(), configFilePath);
                if (Files.exists(jarDirPath)) {
                    logger.debug("使用JAR目录路径: {}", jarDirPath.toAbsolutePath());
                    return jarDirPath;
                }
            }
        } catch (Exception e) {
            logger.warn("无法确定JAR文件路径", e);
        }
        
        logger.warn("找不到配置文件，将使用默认路径: {}", path.toAbsolutePath());
        return path;
    }
    
    /**
     * 创建默认配置
     *
     * @return 默认配置对象
     */
    private DbConfigsDTO createDefaultConfig() {
        Map<String, DbConfigDTO> configs = new HashMap<>();
        
        // 测试环境默认配置
        configs.put("test", new DbConfigDTO("dbproxy.diwork.com", "12368", "bip_yxy_serv", "hbvzOoHcocB2y9SFtV8iWDjY5DKLXIjn"));
        
        // 日常环境默认配置
        configs.put("daily", new DbConfigDTO("dbproxy.diwork.com", "12003", "ro_all_db", "eruij6g98_35"));
        
        // 预发环境默认配置
        configs.put("pre", new DbConfigDTO("dbproxy.diwork.com", "12108", "ro_db_all", "MbRWs9QRjjKAGbERXFaJcE8k6eDhbRMf"));
        
        return new DbConfigsDTO(configs);
    }
} 
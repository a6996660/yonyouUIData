package com.yonyou.dbtreeview.dto;

/**
 * 数据库配置DTO
 */
public class DbConfigDTO {
    
    private String host;
    private String port;
    private String username;
    private String password;
    
    public DbConfigDTO() {
    }
    
    public DbConfigDTO(String host, String port, String username, String password) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public String getPort() {
        return port;
    }

    public void setPort(String port) {
        this.port = port;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
    
    /**
     * 构建JDBC URL
     *
     * @param dbName 数据库名称
     * @return JDBC URL
     */
    public String buildJdbcUrl(String dbName) {
        // 基础URL模板
        String baseUrl = "jdbc:mysql://%s:%s%s?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true";
        
        // 处理数据库名称
        String dbPart = "";
        if (dbName != null && !dbName.trim().isEmpty()) {
            dbPart = "/" + dbName;
        }
        
        return String.format(baseUrl, host, port, dbPart);
    }
} 
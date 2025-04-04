package com.yonyou.dbtreeview.dto;

/**
 * 表详情请求DTO
 */
public class TableDetailsRequest {
    
    private String environment;
    private String dbName;
    private String tableName;
    private String id;
    private DbConfigDTO dbConfig;
    
    public TableDetailsRequest() {
    }
    
    public TableDetailsRequest(String environment, String dbName, String tableName, String id, DbConfigDTO dbConfig) {
        this.environment = environment;
        this.dbName = dbName;
        this.tableName = tableName;
        this.id = id;
        this.dbConfig = dbConfig;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getDbName() {
        return dbName;
    }

    public void setDbName(String dbName) {
        this.dbName = dbName;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public DbConfigDTO getDbConfig() {
        return dbConfig;
    }

    public void setDbConfig(DbConfigDTO dbConfig) {
        this.dbConfig = dbConfig;
    }
} 
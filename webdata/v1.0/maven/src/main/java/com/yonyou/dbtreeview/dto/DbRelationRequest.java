package com.yonyou.dbtreeview.dto;

/**
 * 数据库关联树请求DTO
 */
public class DbRelationRequest {
    
    private String environment;
    private String dbName;
    private String billNo;
    private String tableName; // 表名
    private String id;        // 节点ID
    private DbConfigDTO dbConfig;
    
    public DbRelationRequest() {
    }
    
    public DbRelationRequest(String environment, String dbName, String billNo, String tableName, String id, DbConfigDTO dbConfig) {
        this.environment = environment;
        this.dbName = dbName;
        this.billNo = billNo;
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

    public String getBillNo() {
        return billNo;
    }

    public void setBillNo(String billNo) {
        this.billNo = billNo;
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
    
    @Override
    public String toString() {
        return "DbRelationRequest{" +
                "environment='" + environment + '\'' +
                ", dbName='" + dbName + '\'' +
                ", billNo='" + billNo + '\'' +
                ", tableName='" + tableName + '\'' +
                ", id='" + id + '\'' +
                ", dbConfig=" + (dbConfig != null ? "[已设置]" : "null") +
                '}';
    }
} 
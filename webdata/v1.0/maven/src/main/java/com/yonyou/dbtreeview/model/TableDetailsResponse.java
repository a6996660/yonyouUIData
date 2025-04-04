package com.yonyou.dbtreeview.model;

import java.util.Map;

/**
 * 表详情响应
 */
public class TableDetailsResponse {
    
    private String tableName;
    private Map<String, Object> data;
    
    public TableDetailsResponse() {
    }
    
    public TableDetailsResponse(String tableName, Map<String, Object> data) {
        this.tableName = tableName;
        this.data = data;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
} 
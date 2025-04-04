package com.yonyou.dbtreeview.model;

/**
 * 数据库树结构响应
 */
public class DbTreeResponse {
    
    private DbTreeNode rootNode;
    
    public DbTreeResponse() {
    }
    
    public DbTreeResponse(DbTreeNode rootNode) {
        this.rootNode = rootNode;
    }

    public DbTreeNode getRootNode() {
        return rootNode;
    }

    public void setRootNode(DbTreeNode rootNode) {
        this.rootNode = rootNode;
    }
} 
package com.yonyou.dbtreeview.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据库树节点模型
 */
public class DbTreeNode {
    
    private String tableName;
    private String id;
    private List<DbTreeNode> children;
    private Map<String, Object> attributes;
    
    public DbTreeNode() {
        this.children = new ArrayList<>();
        this.attributes = new HashMap<>();
    }
    
    public DbTreeNode(String tableName, String id) {
        this();
        this.tableName = tableName;
        this.id = id;
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

    public List<DbTreeNode> getChildren() {
        return children;
    }

    public void setChildren(List<DbTreeNode> children) {
        this.children = children;
    }
    
    /**
     * 添加子节点
     *
     * @param child 子节点
     */
    public void addChild(DbTreeNode child) {
        if (this.children == null) {
            this.children = new ArrayList<>();
        }
        this.children.add(child);
    }

    public Map<String, Object> getAttributes() {
        return attributes;
    }

    public void setAttributes(Map<String, Object> attributes) {
        this.attributes = attributes;
    }
    
    /**
     * 设置属性
     *
     * @param key 属性键
     * @param value 属性值
     */
    public void setAttribute(String key, Object value) {
        if (this.attributes == null) {
            this.attributes = new HashMap<>();
        }
        this.attributes.put(key, value);
    }
    
    /**
     * 获取属性
     *
     * @param key 属性键
     * @return 属性值
     */
    public Object getAttribute(String key) {
        return this.attributes != null ? this.attributes.get(key) : null;
    }
    
    /**
     * 判断是否是叶子节点
     *
     * @return 是否是叶子节点
     */
    public boolean isLeaf() {
        return this.children == null || this.children.isEmpty();
    }
} 
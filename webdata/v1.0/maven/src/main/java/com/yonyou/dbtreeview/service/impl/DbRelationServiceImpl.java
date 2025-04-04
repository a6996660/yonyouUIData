package com.yonyou.dbtreeview.service.impl;

import com.yonyou.dbtreeview.dto.DbConfigDTO;
import com.yonyou.dbtreeview.model.DbTreeNode;
import com.yonyou.dbtreeview.model.DbTreeResponse;
import com.yonyou.dbtreeview.model.TableDetailsResponse;
import com.yonyou.dbtreeview.service.DbRelationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据库关系服务实现
 */
@Service
public class DbRelationServiceImpl implements DbRelationService {
    
    private static final Logger logger = LoggerFactory.getLogger(DbRelationServiceImpl.class);
    
    @Override
    public DbTreeResponse getDbRelationTree(String environment, String dbName, String billNo, DbConfigDTO dbConfig) {
        Connection conn = null;
        
        try {
            // 连接数据库
            conn = getConnection(dbName, dbConfig);
            
            // 创建树形结构根节点
            DbTreeNode rootNode = getBillBaseNode(conn, billNo);
            
            if (rootNode != null) {
                // 添加billentity_base子节点
                addBillEntityNodes(conn, rootNode);
                
                // 添加pb_meta_filters子节点
                addMetaFilterNodes(conn, rootNode);
            }
            
            return new DbTreeResponse(rootNode);
        } catch (Exception e) {
            logger.error("获取数据库关联树失败", e);
            throw new RuntimeException("获取数据库关联树失败: " + e.getMessage(), e);
        } finally {
            closeConnection(conn);
        }
    }
    
    @Override
    public TableDetailsResponse getTableDetails(String environment, String dbName, String tableName, String id, DbConfigDTO dbConfig) {
        Connection conn = null;
        
        try {
            // 连接数据库
            conn = getConnection(dbName, dbConfig);
            
            // 查询表详情
            Map<String, Object> data = queryTableDetails(conn, tableName, id);
            
            return new TableDetailsResponse(tableName, data);
        } catch (Exception e) {
            logger.error("获取表详情失败", e);
            throw new RuntimeException("获取表详情失败: " + e.getMessage(), e);
        } finally {
            closeConnection(conn);
        }
    }
    
    /**
     * 获取数据库连接
     */
    private Connection getConnection(String dbName, DbConfigDTO dbConfig) throws SQLException {
        if (dbConfig == null || dbConfig.getHost() == null || dbConfig.getPort() == null) {
            throw new SQLException("数据库配置不完整");
        }
        
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            
            // 处理可能的空数据库名
            String url;
            if (dbName == null || dbName.trim().isEmpty()) {
                // 不指定数据库，仅连接到MySQL服务器
                url = String.format("jdbc:mysql://%s:%s?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai", 
                    dbConfig.getHost(), dbConfig.getPort());
                logger.warn("未提供数据库名，将仅连接到MySQL服务器");
            } else {
                url = dbConfig.buildJdbcUrl(dbName);
            }
            
            logger.info("连接数据库URL: {}", url);
            return DriverManager.getConnection(url, dbConfig.getUsername(), dbConfig.getPassword());
        } catch (ClassNotFoundException e) {
            throw new SQLException("MySQL驱动加载失败", e);
        }
    }
    
    /**
     * 关闭数据库连接
     */
    private void closeConnection(Connection conn) {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException e) {
                logger.error("关闭数据库连接失败", e);
            }
        }
    }
    
    /**
     * 获取bill_base根节点
     */
    private DbTreeNode getBillBaseNode(Connection conn, String billNo) throws SQLException {
        String sql = "SELECT id, cBillNo, cName, cFilterId FROM bill_base WHERE cBillNo = ? AND tenant_id = 0";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billNo);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    DbTreeNode node = new DbTreeNode("bill_base", rs.getString("id"));
                    node.setAttribute("cBillNo", rs.getString("cBillNo"));
                    node.setAttribute("cName", rs.getString("cName"));
                    node.setAttribute("cFilterId", rs.getString("cFilterId"));
                    return node;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 添加billentity_base子节点
     */
    private void addBillEntityNodes(Connection conn, DbTreeNode parentNode) throws SQLException {
        String billId = parentNode.getId();
        String sql = "SELECT id, cName FROM billentity_base WHERE iBillId = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode entityNode = new DbTreeNode("billentity_base", rs.getString("id"));
                    entityNode.setAttribute("cName", rs.getString("cName"));
                    
                    // 添加子节点
                    parentNode.addChild(entityNode);
                    
                    // 添加billtemplate_base子节点
                    addBillTemplateNodes(conn, entityNode, billId);
                }
            }
        }
    }
    
    /**
     * 添加billtemplate_base子节点
     */
    private void addBillTemplateNodes(Connection conn, DbTreeNode parentNode, String billId) throws SQLException {
        String sql = "SELECT id, cName FROM billtemplate_base WHERE iBillId = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode templateNode = new DbTreeNode("billtemplate_base", rs.getString("id"));
                    templateNode.setAttribute("cName", rs.getString("cName"));
                    
                    // 添加子节点
                    parentNode.addChild(templateNode);
                    
                    // 添加billtplgroup_base子节点
                    addBillTplGroupNodes(conn, templateNode, billId);
                }
            }
        }
    }
    
    /**
     * 添加billtplgroup_base子节点
     */
    private void addBillTplGroupNodes(Connection conn, DbTreeNode parentNode, String billId) throws SQLException {
        String sql = "SELECT id, ccode, cName FROM billtplgroup_base WHERE iBillId = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode groupNode = new DbTreeNode("billtplgroup_base", rs.getString("id"));
                    groupNode.setAttribute("ccode", rs.getString("ccode"));
                    groupNode.setAttribute("cName", rs.getString("cName"));
                    
                    // 添加子节点
                    parentNode.addChild(groupNode);
                    
                    // 添加billitem_base子节点
                    addBillItemNodes(conn, groupNode, billId);
                    
                    // 添加bill_toolbar子节点
                    addBillToolbarNodes(conn, groupNode, rs.getString("ccode"));
                }
            }
        }
    }
    
    /**
     * 添加billitem_base子节点
     */
    private void addBillItemNodes(Connection conn, DbTreeNode parentNode, String billId) throws SQLException {
        String sql = "SELECT id, cName, cShowCaption FROM billitem_base WHERE iBillId = ? AND tenant_id = 0";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode itemNode = new DbTreeNode("billitem_base", rs.getString("id"));
                    itemNode.setAttribute("cName", rs.getString("cName"));
                    itemNode.setAttribute("cShowCaption", rs.getString("cShowCaption"));
                    
                    // 添加子节点
                    parentNode.addChild(itemNode);
                }
            }
        }
    }
    
    /**
     * 添加bill_toolbar子节点
     */
    private void addBillToolbarNodes(Connection conn, DbTreeNode parentNode, String parent) throws SQLException {
        String billNo = String.valueOf(parentNode.getAttributes().get("cBillNo"));
        if (billNo == null) {
            // 从根节点获取billNo
            DbTreeNode rootNode = findRootNode(parentNode);
            if (rootNode != null) {
                billNo = String.valueOf(rootNode.getAttribute("cBillNo"));
            }
        }
        
        if (billNo != null) {
            String sql = "SELECT id, name FROM bill_toolbar WHERE billnumber = ? AND parent = ? AND tenant_id = 0";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, parent);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        DbTreeNode toolbarNode = new DbTreeNode("bill_toolbar", rs.getString("id"));
                        toolbarNode.setAttribute("name", rs.getString("name"));
                        
                        // 添加子节点
                        parentNode.addChild(toolbarNode);
                        
                        // 添加bill_toolbaritem子节点
                        addBillToolbarItemNodes(conn, toolbarNode, rs.getString("name"));
                    }
                }
            }
        }
    }
    
    /**
     * 添加bill_toolbaritem子节点
     */
    private void addBillToolbarItemNodes(Connection conn, DbTreeNode parentNode, String toolbar) throws SQLException {
        String billNo = findBillNo(parentNode);
        
        if (billNo != null) {
            String sql = "SELECT id, name, command FROM bill_toolbaritem WHERE billnumber = ? AND toolbar = ? AND tenant_id = 0";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, toolbar);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        DbTreeNode itemNode = new DbTreeNode("bill_toolbaritem", rs.getString("id"));
                        itemNode.setAttribute("name", rs.getString("name"));
                        itemNode.setAttribute("command", rs.getString("command"));
                        
                        // 添加子节点
                        parentNode.addChild(itemNode);
                        
                        // 添加bill_command子节点
                        addBillCommandNodes(conn, itemNode, rs.getString("command"));
                    }
                }
            }
        }
    }
    
    /**
     * 添加bill_command子节点
     */
    private void addBillCommandNodes(Connection conn, DbTreeNode parentNode, String command) throws SQLException {
        String billNo = findBillNo(parentNode);
        
        if (billNo != null && command != null) {
            String sql = "SELECT id, name FROM bill_command WHERE billnumber = ? AND name = ? AND tenant_id = 0";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, command);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        DbTreeNode commandNode = new DbTreeNode("bill_command", rs.getString("id"));
                        commandNode.setAttribute("name", rs.getString("name"));
                        
                        // 添加子节点
                        parentNode.addChild(commandNode);
                    }
                }
            }
        }
    }
    
    /**
     * 添加pb_meta_filters子节点
     */
    private void addMetaFilterNodes(Connection conn, DbTreeNode parentNode) throws SQLException {
        String filterId = String.valueOf(parentNode.getAttribute("cFilterId"));
        
        if (filterId != null && !"null".equals(filterId)) {
            String sql = "SELECT id, filterDesc FROM pb_meta_filters WHERE id = ?";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, filterId);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        DbTreeNode filterNode = new DbTreeNode("pb_meta_filters", rs.getString("id"));
                        filterNode.setAttribute("filterDesc", rs.getString("filterDesc"));
                        
                        // 添加子节点
                        parentNode.addChild(filterNode);
                        
                        // 添加pb_meta_filter_item子节点
                        addMetaFilterItemNodes(conn, filterNode, filterId);
                        
                        // 添加pb_filter_solution子节点
                        addFilterSolutionNodes(conn, filterNode, filterId);
                    }
                }
            }
        }
    }
    
    /**
     * 添加pb_meta_filter_item子节点
     */
    private void addMetaFilterItemNodes(Connection conn, DbTreeNode parentNode, String filtersId) throws SQLException {
        String sql = "SELECT id, itemTitle FROM pb_meta_filter_item WHERE filtersId = ? ORDER BY tenant_id";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, filtersId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode itemNode = new DbTreeNode("pb_meta_filter_item", rs.getString("id"));
                    itemNode.setAttribute("itemTitle", rs.getString("itemTitle"));
                    
                    // 添加子节点
                    parentNode.addChild(itemNode);
                }
            }
        }
    }
    
    /**
     * 添加pb_filter_solution子节点
     */
    private void addFilterSolutionNodes(Connection conn, DbTreeNode parentNode, String filtersId) throws SQLException {
        String sql = "SELECT id, solutionName FROM pb_filter_solution WHERE filtersId = ? AND tenant_id = 0";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, filtersId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode solutionNode = new DbTreeNode("pb_filter_solution", rs.getString("id"));
                    solutionNode.setAttribute("solutionName", rs.getString("solutionName"));
                    
                    // 添加子节点
                    parentNode.addChild(solutionNode);
                    
                    // 添加pb_filter_solution_common子节点
                    addFilterSolutionCommonNodes(conn, solutionNode, rs.getString("id"));
                }
            }
        }
    }
    
    /**
     * 添加pb_filter_solution_common子节点
     */
    private void addFilterSolutionCommonNodes(Connection conn, DbTreeNode parentNode, String solutionId) throws SQLException {
        String sql = "SELECT id, itemTitle FROM pb_filter_solution_common WHERE solutionId = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, solutionId);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode commonNode = new DbTreeNode("pb_filter_solution_common", rs.getString("id"));
                    commonNode.setAttribute("itemTitle", rs.getString("itemTitle"));
                    
                    // 添加子节点
                    parentNode.addChild(commonNode);
                }
            }
        }
    }
    
    /**
     * 查询表详情
     */
    private Map<String, Object> queryTableDetails(Connection conn, String tableName, String id) throws SQLException {
        Map<String, Object> data = new HashMap<>();
        
        if (tableName == null || id == null) {
            return data;
        }
        
        // 构建查询SQL
        String sql = String.format("SELECT * FROM %s WHERE id = ?", tableName);
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int columnCount = meta.getColumnCount();
                    
                    for (int i = 1; i <= columnCount; i++) {
                        String columnName = meta.getColumnName(i);
                        Object value = rs.getObject(i);
                        data.put(columnName, value);
                    }
                }
            }
        }
        
        return data;
    }
    
    /**
     * 查找根节点
     */
    private DbTreeNode findRootNode(DbTreeNode node) {
        if (node == null) {
            return null;
        }
        
        if ("bill_base".equals(node.getTableName())) {
            return node;
        }
        
        // TODO: 实现向上查找根节点的逻辑
        // 由于当前实现是递归构建树，无法向上查找父节点
        // 在实际项目中，可能需要双向引用或使用其他策略
        
        return null;
    }
    
    /**
     * 查找表单编码
     */
    private String findBillNo(DbTreeNode node) {
        if (node == null) {
            return null;
        }
        
        // 尝试从当前节点获取
        Object billNo = node.getAttribute("cBillNo");
        if (billNo != null) {
            return String.valueOf(billNo);
        }
        
        // 尝试从根节点获取
        DbTreeNode rootNode = findRootNode(node);
        if (rootNode != null) {
            billNo = rootNode.getAttribute("cBillNo");
            if (billNo != null) {
                return String.valueOf(billNo);
            }
        }
        
        return null;
    }
} 
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
    public DbTreeResponse getDbRelationTree(String environment, String dbName, String billNo, String ytenant_id, DbConfigDTO dbConfig) {
        Connection conn = null;
        
        try {
            // 连接数据库
            conn = getConnection(dbName, dbConfig);
            
            // 创建树形结构根节点
            DbTreeNode rootNode = getBillBaseNode(conn, billNo, ytenant_id);
            
            if (rootNode != null) {
                // 保存billNo到根节点，使其易于传递
                rootNode.setAttribute("cBillNo", billNo);
                
                // 添加billentity_base子节点
                addBillEntityNodes(conn, rootNode, ytenant_id);
                
                // 添加pb_meta_filters子节点
                addMetaFilterNodes(conn, rootNode, ytenant_id);
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
    public TableDetailsResponse getTableDetails(String environment, String dbName, String tableName, String id, String ytenant_id, DbConfigDTO dbConfig) {
        Connection conn = null;
        
        try {
            // 连接数据库
            conn = getConnection(dbName, dbConfig);
            
            // 查询表详情
            Map<String, Object> data = queryTableDetails(conn, tableName, id, ytenant_id);
            
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
    private DbTreeNode getBillBaseNode(Connection conn, String billNo, String ytenant_id) throws SQLException {
        String sql = "SELECT id, cBillNo, cName, cFilterId FROM bill_base WHERE cBillNo = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billNo);
            stmt.setString(2, ytenant_id);
            
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
    private void addBillEntityNodes(Connection conn, DbTreeNode parentNode, String ytenant_id) throws SQLException {
        String billId = parentNode.getId();
        String billNo = (String) parentNode.getAttribute("cBillNo");
        String sql = "SELECT id, cName FROM billentity_base WHERE iBillId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            stmt.setString(2, ytenant_id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode entityNode = new DbTreeNode("billentity_base", rs.getString("id"));
                    entityNode.setAttribute("cName", rs.getString("cName"));
                    // 传递billNo属性
                    if (billNo != null) {
                        entityNode.setAttribute("cBillNo", billNo);
                    }
                    
                    // 添加子节点
                    parentNode.addChild(entityNode);
                    
                    // 添加billtemplate_base子节点 - 直接关联到billentity_base
                    addBillTemplateNodes(conn, entityNode, billId, billNo, ytenant_id);
                }
            }
        }
    }
    
    /**
     * 添加billtemplate_base子节点
     */
    private void addBillTemplateNodes(Connection conn, DbTreeNode parentNode, String billId, String billNo, String ytenant_id) throws SQLException {
        String sql = "SELECT id, cName FROM billtemplate_base WHERE iBillId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            stmt.setString(2, ytenant_id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode templateNode = new DbTreeNode("billtemplate_base", rs.getString("id"));
                    templateNode.setAttribute("cName", rs.getString("cName"));
                    // 传递billNo属性
                    if (billNo != null) {
                        templateNode.setAttribute("cBillNo", billNo);
                    }
                    
                    // 添加子节点
                    parentNode.addChild(templateNode);
                    
                    // 添加billtplgroup_base子节点 - 作为billtemplate_base的子节点
                    addBillTplGroupNodes(conn, templateNode, billId, billNo, ytenant_id);
                }
            }
        }
    }
    
    /**
     * 添加billtplgroup_base子节点
     */
    private void addBillTplGroupNodes(Connection conn, DbTreeNode parentNode, String billId, String billNo, String ytenant_id) throws SQLException {
        String sql = "SELECT id, ccode, cName FROM billtplgroup_base WHERE iBillId = ? AND iTplId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            stmt.setString(2, parentNode.getId());
            stmt.setString(3, ytenant_id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String groupId = rs.getString("id");
                    String ccode = rs.getString("ccode");
                    
                    DbTreeNode groupNode = new DbTreeNode("billtplgroup_base", groupId);
                    groupNode.setAttribute("ccode", ccode);
                    groupNode.setAttribute("cName", rs.getString("cName"));
                    // 传递billNo属性
                    if (billNo != null) {
                        groupNode.setAttribute("cBillNo", billNo);
                    }
                    
                    // 添加子节点
                    parentNode.addChild(groupNode);
                    
                    // 创建按钮节点（作为billtplgroup_base的子节点）
                    DbTreeNode buttonNode = new DbTreeNode("按钮", "button_" + groupId);
                    buttonNode.setAttribute("cName", "按钮");
                    // 传递billNo和ccode属性
                    if (billNo != null) {
                        buttonNode.setAttribute("cBillNo", billNo);
                    }
                    buttonNode.setAttribute("ccode", ccode);
                    
                    // 添加bill_toolbar子节点（作为按钮的子节点）
                    addBillToolbarNodes(conn, buttonNode, ccode, billNo, ytenant_id, groupNode);
                    
                    // 创建billitem_base节点（作为billtplgroup_base的子节点）
                    DbTreeNode itemsNode = new DbTreeNode("billitem_base", "billitem_" + groupId);
                    itemsNode.setAttribute("cName", "billitem_base");
                    // 传递billNo属性
                    if (billNo != null) {
                        itemsNode.setAttribute("cBillNo", billNo);
                        itemsNode.setAttribute("groupId", groupId);
                    }
                    groupNode.addChild(itemsNode);
                    
                    // 添加实际的billitem_base子节点
                    addBillItemNodes(conn, itemsNode, billId, ytenant_id);
                }
            }
        }
    }
    
    /**
     * 添加billitem_base子节点
     */
    private void addBillItemNodes(Connection conn, DbTreeNode parentNode, String billId, String ytenant_id) throws SQLException {
        String sql = "SELECT * FROM billitem_base WHERE iBillId = ? AND iBillTplGroupId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, billId);
            stmt.setString(2, String.valueOf(parentNode.getAttribute("groupId")));
            stmt.setString(3, ytenant_id);
            
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
    private void addBillToolbarNodes(Connection conn, DbTreeNode parentNode, String parent, String billNo, String ytenant_id, DbTreeNode groupNode) throws SQLException {
        if (billNo == null) {
            billNo = findBillNo(parentNode);  // 尝试从节点中获取billNo，作为备用方案
        }
        
        if (billNo != null) {
            String sql = "SELECT id, name FROM bill_toolbar WHERE billnumber = ? AND parent = ? AND tenant_id = ?";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, parent);
                stmt.setString(3, ytenant_id);
                
                boolean isExist = false;
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        String toolbarId = rs.getString("id");
                        String name = rs.getString("name");
                        
                        DbTreeNode toolbarNode = new DbTreeNode("bill_toolbar", toolbarId);
                        toolbarNode.setAttribute("name", name);
                        // 传递billNo属性
                        toolbarNode.setAttribute("cBillNo", billNo);
                        
                        // 添加子节点
                        parentNode.addChild(toolbarNode);
                        isExist = true;
                        
                        // 添加bill_toolbaritem子节点
                        addBillToolbarItemNodes(conn, toolbarNode, name, billNo, ytenant_id);
                    }
                }
                if (isExist){
                    groupNode.addChild(parentNode);
                }
            }
        }
    }
    
    /**
     * 添加bill_toolbaritem子节点
     */
    private void addBillToolbarItemNodes(Connection conn, DbTreeNode parentNode, String toolbar, String billNo, String ytenant_id) throws SQLException {
        if (billNo == null) {
            billNo = findBillNo(parentNode);  // 尝试从节点中获取billNo
        }
        
        if (billNo != null) {
            String sql = "SELECT id, name, command FROM bill_toolbaritem WHERE billnumber = ? AND toolbar = ? AND tenant_id = ?";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, toolbar);
                stmt.setString(3, ytenant_id);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        DbTreeNode itemNode = new DbTreeNode("bill_toolbaritem", rs.getString("id"));
                        itemNode.setAttribute("name", rs.getString("name"));
                        itemNode.setAttribute("command", rs.getString("command"));
                        // 传递billNo属性
                        itemNode.setAttribute("cBillNo", billNo);
                        
                        // 添加子节点
                        parentNode.addChild(itemNode);
                        
                        // 添加bill_command子节点
                        String command = rs.getString("command");
                        if (command != null && !command.isEmpty()) {
                            addBillCommandNodes(conn, itemNode, command, billNo, ytenant_id);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 添加bill_command子节点
     */
    private void addBillCommandNodes(Connection conn, DbTreeNode parentNode, String command, String billNo, String ytenant_id) throws SQLException {
        if (billNo == null) {
            billNo = findBillNo(parentNode);  // 尝试从节点中获取billNo
        }
        
        if (billNo != null && command != null) {
            String sql = "SELECT id, name FROM bill_command WHERE billnumber = ? AND name = ? AND tenant_id = ?";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, billNo);
                stmt.setString(2, command);
                stmt.setString(3, ytenant_id);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        DbTreeNode commandNode = new DbTreeNode("bill_command", rs.getString("id"));
                        commandNode.setAttribute("name", rs.getString("name"));
                        // 传递billNo属性
                        commandNode.setAttribute("cBillNo", billNo);
                        
                        // 添加子节点
                        parentNode.addChild(commandNode);
                    }
                }
            }
        }
    }
    
    /**
     * 添加pb_meta_filters子节点 - 作为过滤区
     */
    private void addMetaFilterNodes(Connection conn, DbTreeNode parentNode, String ytenant_id) throws SQLException {
        String filterId = String.valueOf(parentNode.getAttribute("cFilterId"));
        
        if (filterId != null && !"null".equals(filterId)) {
            // 创建过滤区节点
            DbTreeNode filterAreaNode = new DbTreeNode("过滤区", "filter_area");
            filterAreaNode.setAttribute("cName", "过滤区");
            parentNode.addChild(filterAreaNode);
            
            String sql = "SELECT id, filterDesc FROM pb_meta_filters WHERE id = ? AND tenant_id = ?";
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, filterId);
                stmt.setString(2, ytenant_id);
                
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        DbTreeNode filterNode = new DbTreeNode("pb_meta_filters", rs.getString("id"));
                        filterNode.setAttribute("filterDesc", rs.getString("filterDesc"));
                        
                        // 添加到过滤区节点下
                        filterAreaNode.addChild(filterNode);
                        
                        // 添加pb_meta_filter_item子节点
                        addMetaFilterItemNodes(conn, filterNode, filterId, ytenant_id);
                        
                        // 添加pb_filter_solution子节点
                        addFilterSolutionNodes(conn, filterNode, filterId, ytenant_id);
                    }
                }
            }
        }
    }
    
    /**
     * 添加pb_meta_filter_item子节点
     */
    private void addMetaFilterItemNodes(Connection conn, DbTreeNode parentNode, String filtersId, String ytenant_id) throws SQLException {
        String sql = "SELECT id, itemTitle FROM pb_meta_filter_item WHERE filtersId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, filtersId);
            stmt.setString(2, ytenant_id);
            
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
    private void addFilterSolutionNodes(Connection conn, DbTreeNode parentNode, String filtersId, String ytenant_id) throws SQLException {
        String sql = "SELECT id, solutionName FROM pb_filter_solution WHERE filtersId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, filtersId);
            stmt.setString(2, ytenant_id);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    DbTreeNode solutionNode = new DbTreeNode("pb_filter_solution", rs.getString("id"));
                    solutionNode.setAttribute("solutionName", rs.getString("solutionName"));
                    
                    // 添加子节点
                    parentNode.addChild(solutionNode);
                    
                    // 添加pb_filter_solution_common子节点
                    addFilterSolutionCommonNodes(conn, solutionNode, rs.getString("id"), ytenant_id);
                }
            }
        }
    }
    
    /**
     * 添加pb_filter_solution_common子节点
     */
    private void addFilterSolutionCommonNodes(Connection conn, DbTreeNode parentNode, String solutionId, String ytenant_id) throws SQLException {
        String sql = "SELECT id, itemTitle FROM pb_filter_solution_common WHERE solutionId = ? AND tenant_id = ?";
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, solutionId);
            stmt.setString(2, ytenant_id);
            
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
    private Map<String, Object> queryTableDetails(Connection conn, String tableName, String id, String ytenant_id) throws SQLException {
        Map<String, Object> data = new HashMap<>();
        
        if (tableName == null || id == null) {
            return data;
        }
        
        // 构建查询SQL
        String sql = String.format("SELECT * FROM %s WHERE id = ? AND tenant_id = ?", tableName);
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, id);
            stmt.setString(2, ytenant_id);
            
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
        // 这里由于缺少向上查找的能力，我们直接使用查找billNo逻辑
        // 在实际项目中，可能需要维护父节点引用
        return null;
    }
    
    /**
     * 查找表单编码
     * 注意：此方法在当前实现中有局限性，因为我们没有维护父节点引用
     * 在实际项目中，应该改进树结构实现或使用其他策略传递billNo
     */
    private String findBillNo(DbTreeNode node) {
        if (node == null) {
            return null;
        }
        
        // 直接尝试从节点属性获取billNo
        Object billNo = node.getAttribute("cBillNo");
        if (billNo != null && !"null".equals(billNo.toString())) {
            return billNo.toString();
        }
        
        // 如果是bill_base节点，从cBillNo属性获取
        if ("bill_base".equals(node.getTableName())) {
            billNo = node.getAttribute("cBillNo");
            if (billNo != null && !"null".equals(billNo.toString())) {
                return billNo.toString();
            }
        }
        
        // 在当前实现中，我们依赖开始创建树时已经把billNo传递给了所有需要的节点
        // 此方法是一个fallback，实际应用中应该在每个节点创建时就把billNo作为属性存储
        
        return null;
    }
} 
@index.html 根据此前端页面所用到的框架修改前端页面实现一个数据库不同表的关联树形展示需求,按照下面要求实现前端和后端java代码，后端使用spring框架。

# 前端需求：

## 上方输入信息区域：首页有几个输入区域，分别如下：

### 1.数据库环境选择区域，可以选择测试、日常、预发（枚举类型）。

### 2.数据库名称输入框，可以输入数据库名称。

### 3.表单编码输入框，可以输入表单编码。

### 4.数据库配置按钮，打开为列表形式，可以填写测试、日常、预发环境的mysql数据库链接信息，分别为主机、端口、用户名、密码。

## 首页搜索按钮：上方输入信息区域后有个搜索按钮，点击搜索后会在下方区域根据后端的数据生成类似思维导图的树形结构

# 后端需求：

## 后端接口

### 1.在前端点击搜索按钮后，向后端发送请求，根据前端传入的数据库信息链接对应数据库。根据如下关联关系查询如下表的信息所有信息，生成相应的树形数据节点给前端，前端点击每个节点会展示当前节点id对应的所有字段及内容

```
set names utf8;
set @billno="ec_splitstrategycard";
set @tenant_id=0;

SELECT id into @billid from bill_base where cBillNo=@billno and tenant_id=@tenant_id;
SELECT * from bill_base where id=@billid;
SELECT * from billentity_base where iBillId=@billid;
SELECT * from billtemplate_base where iBillId=@billid;
SELECT * from billtplgroup_base where iBillId=@billid;
-- 5
SELECT * from billitem_base where iBillId=@billid and tenant_id=@tenant_id;
SELECT * from bill_toolbar where billnumber=@billno and tenant_id=@tenant_id;
SELECT * from bill_toolbaritem where billnumber=@billno and tenant_id=@tenant_id;
SELECT * from bill_command where billnumber=@billno and tenant_id=@tenant_id;

SELECT cFilterId into @filterid from bill_base where cBillNo=@billno and tenant_id=@tenant_id;
SELECT * from pb_meta_filters where id=@filterid;
SELECT * from pb_meta_filter_item where filtersId=@filterid ORDER BY tenant_id;
SELECT * from pb_filter_solution where filtersId=@filterid and tenant_id=@tenant_id;
SELECT id into @solutionid from pb_filter_solution where filtersId=@filterid and tenant_id=@tenant_id;
SELECT * from pb_filter_solution_common where solutionId=1066634036;
```

# 前端不同表节点展示名称和对应关系补充如下，每个节点可以点击查看表的所有详情数据：

## 1.根节点bill_base表数据（唯一），展示cBillNo字段内容+cName字段内容

## 2.深度为1的billentity_base表节点数据，展示cName

## 3.深度为2 的billtemplate_base表节点展示cName

## 4深度为3的billtplgroup_base表节点展示ccode+cName

## 5.深度为4的billitem_base展示cName+cShowCaption

## 6.bill_toolbar表的parent字段与billtplgroup_base的ccode对应，展现在billtplgroup_base节点表的按钮节点后，名称显示为name字段数据

## 7.bill_toolbaritem表的toolbar字段与bill_toolbar字段的name字段关联，数据展现在bill_toolbar节点后

## 8.bill_command表name字段与bill_toolbaritem的command字段对应，数据展现在bill_toolbaritem节点后

## 9.pb_meta_filters的id与bill_base的cFilterId对应，展现在bill_base表的名为过滤区的节点后，展现名称为filterDesc字段数据

## 10.pb_meta_filter_item表展现为itemTitle字段数据

## 11.pb_filter_solution展现filterDesc字段

## 12.pb_filter_solution_common表展现itemTitle字段
---
title: "MySQL 常用操作笔记"
subtitle: ""
date: 2024-11-20T01:48:53+08:00
categories: ["后端", "数据库"]
draft: false
---

记录 MySQL 的登录、建库建表、增删改查，以及索引和慢查询相关的要点。示例按本地测试库编写。

## 客户端

### 1. 登录

```bash
mysql -h localhost -P 3306 -u root -p
```

执行后会提示输入密码。

### 2. 创建账号

```sql
create user 'tester' identified by '123456';
```

### 3. 操作 database

- 展示全部库：`show databases;`
- 创建库：`create database test;`
- 进入库：`use test;`

### 4. 操作 table

#### 4.1 创建表

```sql
create table if not exists student (
  id int not null auto_increment comment '主键自增 id',
  name char(10) not null comment '姓名',
  addr varchar(100) default '' comment '地址',
  province char(10) not null default '' comment '省份',
  city char(10) not null default '' comment '城市',
  score int not null default 0 comment '分数',
  enrollment date comment '入学日期',
  primary key (id),
  unique key idx_name (name), -- 唯一索引
  key idx_location (province, city) -- 普通索引，联合索引
);
```

`char` 是定长字符串，`varchar` 是变长字符串。

#### 索引

- 没加索引时，查询需要遍历整张表
- 加了索引后，会基于索引建立查找树
- 联合索引：`where` 条件总是同时用到多个字段时，适合建联合索引

#### 4.2 插入数据

```sql
insert into student (name, province, city, enrollment) values
('张三', '北京', '北京', '2002-02-04'),
('李四', '北京', '北京', '2002-02-04'),
('王五', '北京', '北京', '2002-02-04');
```

#### 4.3 查询

```sql
select id, name from student where id > 1;
```

```sql
select province, avg(score) as avg_score from student
where score > 0
group by province having avg_score > 50
order by avg_score desc;
```

#### 4.4 修改

```sql
update student set
score = score + 10, addr = '海淀'
where province = '北京';
```

```sql
update
  student set
  score = case province
    when '北京' then score + 10
    when '四川' then score + 5
    else score + 7
  end,
  addr = case province
    when '北京' then '东城区'
    when '四川' then '幸福里'
    else '朝阳区'
  end
 where id > 0;
```

#### 4.5 删除

- 删除一行：`delete from student where city = '郑州'`
- 删除全部行：`delete from student`
- 删除表：`drop table student`

#### 4.6 替换

`id` 是唯一索引，所以 `replace` 会按 `id` 查找并替换。

```sql
replace into edge (id, name, created_by) values ("11", "EEE", "张三呀");
```

## 最佳实践

- 写 SQL 用小写
- 建表时先判断表是否已存在：`if not exists`
- 所有的列和表都加 comment
- 字符串较短时尽量使用 `char`：定长有利于内存对齐，读写性能更好；`varchar` 字段频繁修改时，容易引起内存碎片
- 满足需求的前提下，尽量使用短的数据类型，如 tinyint 与 int、float 与 double、date 与 datetime

## 索引

### B+ 树

1. B 即 Balanced（平衡）。对于 m 叉树，每个节点上最多有 m 个数据，最少有 m/2 个数据（根节点除外）
2. 叶节点上存储了所有数据，把叶节点连接起来可以顺序遍历所有数据
3. 每个节点设计成内存页的整数倍，MySQL 的 m=1200，树的前两层放在内存中

内存页是数据库与操作系统之间读写数据的最小单位。

- MySQL 的索引默认使用 B+ 树
- 主键默认有索引
- 联合索引遵循最左前缀原则
- SQL 语句前加 `explain` 可以查看索引使用情况
- 如果 MySQL 没有选择最优索引，可以在 `where` 前加 `force index (index_name)`

### 规避慢查询

常规查询最好在 100ms 之内，超出后可以认为是慢查询（个人定义）。

- 大部分慢查询都是因为没有正确使用索引
- 一次 `select` 不要超过 1000 行
- 分页查询 `limit m, n` 会扫描前 `m+n` 行，只返回后 `n` 行；通常用 `id > x` 代替这种分页方式
- 批量操作时最好用一条 SQL 语句完成；其次打包成一个事务，一次性提交（高并发情况下减少对共享资源的争用）
- 不要使用连表操作，join 逻辑在业务代码里完成

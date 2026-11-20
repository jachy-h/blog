---
title: "SQL 基础教程"
date: 2026-02-26
categories: ["后端", "数据库"]
draft: false
---

## 主键原则

- 不使用业务相关的数据作为主键
- 没有必要的情况下，我们尽量不使用联合主键，因为它给关系表带来了复杂度的上升

## 外键原则

- 不用外键约束，用程序逻辑做外键关联

## 关系

### 一对多

**class 表**

| id | name |
|----|------|
| 1 | class1 |
| 2 | class2 |

**student 表**

| id | name | class_id |
|----|------|----------|
| 1 | zhangsan | 1 |
| 2 | lisi | 2 |
| 3 | wangwu | 2 |

### 多对多

**class 表**

| id | name |
|----|------|
| 1 | class1 |
| 2 | class2 |

**teacher 表**

| id | name |
|----|------|
| 1 | teacher-Wang |
| 2 | teacher-Zhang |
| 3 | teacher-Li |

**class_teacher 表**

| id | class_id | teacher_id |
|----|----------|------------|
| 1 | 1 | 1 |
| 2 | 1 | 2 |
| 3 | 2 | 1 |
| 4 | 2 | 3 |

### 一对一

- 也可以用一张大表
- 拆成两张表，可以把不经常查的内容区分开来

## 索引

### 定义

索引是关系数据库中**对某一列或多个列的值进行预排序**的**数据结构**。

### 建立方式

建立一个索引，索引名为 `idx_score`, 列名为 `score`

```sql
ALTER TABLE students
ADD INDEX idx_score (score);
```

### 建立前提

**建立索引的列数据尽量互不相同**

- 索引的效率取决于索引列的值是否散列，即该列的值如果越互不相同，那么索引效率越高

### 注意点

- 索引越多，插入/更新/删除的速度越慢
- 数据库会自动给主键做索引

### 约束

可以对身份证这类唯一的列做唯一索引：**可以保证某一列的值具有唯一性**

```sql
ALTER TABLE students
ADD UNIQUE INDEX uni_name (name);
```

或唯一约束

```sql
ALTER TABLE students
ADD CONSTRAINT uni_name UNIQUE (name);
```

## 查询

### 基本查询

使用 SELECT 查询的基本语句 `SELECT * FROM <表名>` 可以查询一个表的所有行和所有列的数据。

SELECT 查询的结果是一个**二维表**。

```sql
SELECT * FROM table_name
```

### 投影查询

使用 `SELECT *` 表示查询表的所有列，使用 `SELECT 列1, 列2, 列3` 则可以仅返回指定列，这种操作称为投影。

```sql
SELECT 列1 别名1, 列2 别名2, 列3 别名3 FROM ...
```

### 条件查询

通过 WHERE 条件查询，可以筛选出符合指定条件的记录，而不是整个表的所有记录。

```sql
SELECT * FROM table_name WHERE 条件表达式
```

逻辑运算符的优先级如下，可以用小括号改变计算顺序：

- `NOT`
- `AND`
- `OR`

### 排序

```sql
SELECT * FROM table_name ORDER BY score;
SELECT * FROM table_name ORDER BY score DESC;
```

- 降序：`DESC`
- 升序：`ASC`（默认，可省略）

PS：执行时先 `where` 再 `order by`。

### 分页

`LIMIT n OFFSET m` 跳过前 m 条记录，再取 n 条。

```sql
SELECT * FROM table_name LIMIT 10 OFFSET 40
```

注意：

- offset 是可选的，不写则为 `offset 0`
- 在 MySQL 中，`LIMIT 15 OFFSET 30` 还可以简写成 `LIMIT 30, 15`
- `OFFSET` 越大，扫描的行越多，效率越低

### 分组

根据 `column_a`, `column_b` 分组，注意这里是 `,` 分隔

```sql
SELECT * FROM table_name GROUP BY column_a, column_b
```

**分组条件：**

```sql
SELECT * FROM table_name GROUP BY column_a, column_b HAVING count(name) > 1
```

### 聚合

#### count

查询行数。结果是一张只有一行一列的二维表，列名为 `count(*)`。

```sql
SELECT count(*) FROM table_name
```

可以给结果列起别名，例如列名为 `num`：

```sql
SELECT count(*) num FROM table_name
```

#### SUM, AVG, MAX, MIN

| 函数 | 说明 |
|------|------|
| SUM | 计算某一列的合计值，该列必须为数值类型 |
| AVG | 计算某一列的平均值，该列必须为数值类型 |
| MAX | 计算某一列的最大值 |
| MIN | 计算某一列的最小值 |

注意：如果聚合查询的 WHERE 条件没有匹配到任何行，`COUNT()` 会返回 0，而 `SUM()`、`AVG()`、`MAX()` 和 `MIN()` 会返回 `NULL`

## 多表查询

### 就硬查

下面这种查询会形成笛卡尔积：a 表里的每条数据都和 b 表里的每条数据匹配一次。结果集的列数是两表列数之和，行数是两表行数之积。

```sql
SELECT * FROM table_a, table_b
```

### 连接查询 - INNER JOIN

```sql
SELECT * FROM table_a a INNER JOIN table_b b ON a.id = b.aid
```

**使用步骤：**

1. 确认**主表**，仍然是 `FROM table_name` 的写法
2. 确认**要连接的表**，使用 `INNER JOIN table_name` 语法
3. 确认**连接条件**，使用 `ON a.id = b.aid` 语法
4. 可选，加上 `where` 和 `order by` 等子句

**⚠️注意：**

- `INNER JOIN` 只返回同时存在于两张表的行数据
- `RIGHT OUTER JOIN` 返回右表都存在的行。如果某一行仅在右表存在，那么结果集就会以 NULL 填充剩下的字段
- `LEFT OUTER JOIN` 则返回左表都存在的行。如果某一行仅在左表存在，那么结果集就会用 NULL 填充剩下的字段
- `FULL OUTER JOIN` 会返回两表全部记录，不存在则给 NULL

💡Tip:

- FROM 后面的主表即为左表。JOIN 后面的副表即为右表
- **ON 和 WHERE 的区别：**
  - on 条件是在生成临时表时使用的条件，它不管 on 中的条件是否为真，都会返回左边表中的记录
  - where 条件是在临时表生成好后，再对临时表进行过滤的条件。这时已经没有 left join 的含义（必须返回左边表的记录）了，条件不为真的就全部过滤掉

### 连接图示

当有如下语句时：

```sql
SELECT ... FROM tableA ??? JOIN tableB ON tableA.column1 = tableB.column2;
```

- **INNER JOIN**

![](https://cdn.nlark.com/yuque/0/2022/png/268561/1667397864532-08e30ffb-67cd-48b5-a89e-9014e8be6469.png)

- **LEFT OUTER JOIN**

![](https://cdn.nlark.com/yuque/0/2022/png/268561/1667397879412-672763de-1286-4737-a464-c1542cc026c2.png)

- **RIGHT OUTER JOIN**

![](https://cdn.nlark.com/yuque/0/2022/png/268561/1667397892133-8991680d-5fc6-4bd2-8ae9-953f21c55461.png)

- **FULL OUTER JOIN**

![](https://cdn.nlark.com/yuque/0/2022/png/268561/1667397899371-f427d51a-df2f-412d-881a-94eeec78a072.png)

## 查询条件

- 判断为空：`IS NULL`

## DELETE

```sql
DELETE FROM table_name WHERE ...
```

```sql
DELETE p.* FROM Person p, Person p1
	WHERE p.email = p1.email AND p.id > p1.id
```

## INSERT

```sql
INSERT INTO 表名 (字段1, 字段2, ...) VALUES (值1, 值2, ...);
```

插入多条记录时，每组值都要用小括号括起来。

```sql
INSERT INTO Activity (player_id, device_id, event_date, games_played)
VALUES
	(1, 2, '2016-03-01', 5),
	(1, 2, '2016-05-02', 6),
	(2, 3, '2017-06-25', 1),
	(3, 1, '2016-03-02', 0),
	(3, 4, '2018-07-03', 5)
```

## UPDATE

```sql
UPDATE 表名 SET 字段1=值1, 字段2=值2, ... WHERE ...;
```

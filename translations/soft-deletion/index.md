---
title: "也许没必要做“软删除”（Soft Deletion Probably Isn't Worth It）"
description: "在每张业务表里塞一个 deleted_at 字段，看似安全可逆，实则会把污染泄露进所有业务代码、废掉数据库外键约束，还让合规物理清理变成噩梦。前 Stripe / Heroku 架构师 Brandur Leach 给出更优雅的 Postgres 替代方案：独立 JSONB 删除归档表。"
date: 2026-11-17
category: 译文
tags:
  - Brandur Leach
  - 译文
  - PostgreSQL
  - 数据库设计
  - 后端架构
---

# 也许没必要做“软删除”（Soft Deletion Probably Isn't Worth It）

> **原文标题：** [Soft Deletion Probably Isn't Worth It](https://brandur.org/soft-deletion)  
> **原文作者：** Brandur Leach（2022 年 7 月 19 日） · [查看英文原版](./en.md)

---

![软删除陷阱 vs 独立删除归档表手绘全览](/images/soft-deletion/soft-deletion.webp)

只要见识过几套真实生产环境数据库的人，多半都对“软删除（Soft Deletion）”模式耳熟能详：不直接用 `DELETE` 语句把数据删掉，而是在每张表里多加一个 `deleted_at` 时间戳字段，每次删除时改为执行一条更新语句：

```sql
UPDATE foo SET deleted_at = now() WHERE id = $1;
```

软删除背后的初衷是让删除操作更安全、而且可逆。一旦某条记录被物理 `DELETE` 硬删了，从底层存储引擎深处强行捞回来在理论上或许还有一线可能，但实操中想恢复简直难如登天。而在理想状态的软删除方案里，你只要把 `deleted_at` 重新改回 `NULL` 就大功告成了：

```sql
-- 像变魔术一样，数据又回来了！
UPDATE foo SET deleted_at = NULL WHERE id = $1;
```

## 弊端：逻辑泄漏到每一行代码

可这套看似巧妙的做法，其实藏着几处硬伤。第一大弊端就是：==软删除的判断逻辑会像渗水一样泄漏到你业务代码的每一个角落。== 几乎每一条查询语句都得写成这副模样：

```sql
SELECT *
FROM customer
WHERE id = @id
    AND deleted_at IS NULL;
```

而且只要哪个接口不小心漏写了这句 `deleted_at` 过滤条件，就可能闯出严重事故，把本不该再露面的数据直接吐给前台或外部接口。

有些 ORM 框架或插件确实替你省了些事，它们会自动往每条查询后头挂上 `deleted_at` 条件（比如 Rails 生态里的 [`acts_as_paranoid`](https://github.com/ActsAsParanoid/acts_as_paranoid)）。可“把条件藏在底层看不见”，并不意味着隐患就真消除了。相反，一旦运维或研发人员哪天直接连库手写 SQL 查数，反而更容易把 `deleted_at` 忘到九霄云外，因为平时他们习惯了全靠 ORM 代劳。

### 外键约束形同虚设

软删除带来的第二个后果，是数据库的外键（Foreign Key）实际上几乎失效了。

外键最大的价值在于替你兜底保证引用完整性（Referential Integrity）。举个例子：你有一张客户表 `customer`，另一张发票表 `invoice` 里的记录通过外键指向它。如果没有外键约束，你完全可能删掉了一个客户，却忘了顺手清理名下的发票，结果库里就留下了一大堆指向“幽灵客户”的孤儿发票。

有了外键约束之后，只要没先清理掉关联发票就直接删客户，数据库就会当场拦住并报错：

```sql
ERROR:  update or delete on table "customer" violates
    foreign key constraint "invoice_customer_id_fkey" on table "invoice"

DETAIL:  Key (id)=(64977e2b-40cc-4261-8879-1c1e6243699b) is still
    referenced from table "invoice".
```

就跟预定义表结构（Schema）、字段类型和检查约束（Check constraints）一样，关系型数据库本身就在替你严防死守、维持数据干净合法。

可一旦用上软删除，这道防线当场就废了。你把一条客户记录标上了 `deleted_at` 就算“删了”，结果一下子退回到了解放前：你照样很容易忘了顺带软删他名下的所有发票。数据库里的外键检查照样亮绿灯放行，因为从物理层面来看那条客户记录明明还好好躺在表里；偏偏数据库又没有任何内置机制能校验“主表软删时子表是否也一并软删了”。==最终你的库里照样充斥着“主记录明明已删除、关联子记录却还在活蹦乱跳”的脏状态。==

### 合规清理（物理硬删）变得极其痛苦

过去几年里，随着欧洲 [GDPR（通用数据保护条例）](https://en.wikipedia.org/wiki/General_Data_Protection_Regulation) 这类消费者数据保护法规相继落地，数据无限期永久留存早已成了行业忌讳，而默认采用软删除的行记录恰好就会永远赖在库里不走。

于是早晚有一天，你还是得硬着头皮写一套定期硬删任务，把软删除时间超过一定期限的老数据彻底从数据库里抹掉。

可这时候讽刺的事情发生了：平时靠软删除早就变得形同虚设的那堆外键约束，如今在你要做真删除时反而站出来添大乱了！因为想删掉一条主记录，你必须确保把它牵连到的全部下游依赖记录先清理干净。（虽说建表时加上 `ON DELETE CASCADE` 级联删除能自动包办，但级联自动删实在太过凶险，在严谨的核心业务数据上一般不推荐这么干。）

好在像 Postgres 这样支持公用表表达式（CTE）的数据库好歹还算有解，只是最终写出来的 SQL 会膨大到令人发指。下面就是我前阵子亲手写过的一段清理查询片段，为了在单次操作里同时满足所有外键约束，把一整串关联数据一锅端掉：

```sql
WITH team_deleted AS (
    DELETE FROM team
    WHERE (
        team.archived_at IS NOT NULL
        AND team.archived_at < @archived_at_horizon::timestamptz
    )
    RETURNING *
),

--
-- team resources
--
cluster_deleted AS (
    DELETE FROM cluster
    WHERE team_id IN (
        SELECT id FROM team_deleted
    )
    OR (
        archived_at IS NOT NULL
        AND archived_at < @archived_at_horizon::timestamptz
    )
    RETURNING *
),
invoice_deleted AS (
    DELETE FROM invoice
    WHERE team_id IN (
        SELECT id FROM team_deleted
    )
    OR (
        archived_at IS NOT NULL
        AND archived_at < @archived_at_horizon::timestamptz
    )
    RETURNING *
),

--
-- cluster + team resources
--
subscription_deleted AS (
    DELETE FROM subscription
    WHERE cluster_id IN (
        SELECT id FROM cluster_deleted
    ) OR team_id IN (
        SELECT id FROM team_deleted
    )
    RETURNING *
)

SELECT 'cluster', array_agg(id) FROM cluster_deleted
UNION ALL
SELECT 'invoice', array_agg(id) FROM invoice_deleted
UNION ALL
SELECT 'subscription', array_agg(id) FROM subscription_deleted
UNION ALL
SELECT 'team', array_agg(id) FROM team_deleted;
```

上面贴出来的还只是节选，完整未删节版本足足有五倍那么长，一口气牵扯整整 30 张独立数据表。这玩意儿能跑通固然挺酷，但维护这么一坨过于精密庞大的怪物查询，本身就已经成了系统里的重大负担。

而且哪怕你把单测写得再足，这种巨型清理语句日后照样容易暴雷：只要未来哪天开发顺手加了一张新的下游依赖表，却忘了同步来改这条每年才清理一批老数据的 CTE 定时任务，整套任务就会在潜伏整整一年（或者你设定的那条硬删保留期）之后突然半夜报错罢工。

### “反悔撤销删除”真的行得通吗？

说到底，软删除存在的理论依据无非是替“手滑误删数据”买一份保险。作为反驳软删除的最后一条理由，我想请你极其现实地扪心自问一句：在真实生产环境里，“靠软删除把删掉的东西直接还原”，你们到底真正干过几回？

我当年在 Heroku 工作时，全线用的都是软删除。

后来去 Stripe 工作时，用的也是软删除。

再到我现在供职的公司，用的还是软删除。

可在我印象里，横跨十几年时间，这些地方从来**没有哪怕一次**真正动用软删除去把被删的东西“一键恢复”过。[[1]](#f1n)

这背后最大的原因在于：==绝大多数时候，删除一条数据都会伴随一系列数据库之外的副作用。== 比方说，删除流程里顺手调了第三方外部系统去做归档，或者顺带把对象存储里的文件删掉了，甚至已经把对应的云主机实例直接销毁下线。整套删除动作绝不是把 `deleted_at` 改回 `NULL` 就能时光倒流的，你得为那堆外部副作用也分别配齐对应的回滚撤销逻辑，而现实中几乎没人去写那些东西。

当年在 Heroku，确实遇到过几次大客户手滑误删了线上应用跑来求恢复的急事。当时我们手里明明备着软删除，理论上其他外部销毁副作用也并非完全没法逆转，但临到头团队拍板还是一致决定“千万别试着直接恢复”。原因很简单：过去从来没人在真实线上这么恢复过，大紧急状况下当场拿重要客户的数据做小白鼠摸着石头恢复，十有八九会在某个冷门角落弄漏一样状态，把客户账号直接搞进半死不活的畸形烂摊子里。最后我们选择的稳妥方案，始终是“向前滚动”：帮客户新建一个应用，再协助把老应用残留下来的环境变量与数据迁过去。你看，哪怕是在理论上最该由软删除大显身手的救火场景下，我们最终依然不敢用它。

## 替代方案：建立一张专门的“已删除记录表”

话虽如此，我倒也不是说软删除过去毫无用处。虽说真没见过拿它直接还原恢复数据的，但我们在日常排障时倒确实时不时翻一翻那些已删数据，通常是为了人工排查一个工单、协助客服核实情况，或者顺藤摸瓜定位某个刁钻 Bug。

所以，即便因为上面这一箩筐毛病我不建议再沿用传统软删除，好在世上正好有两全其美的折中方案。

==与其把死掉的尸体和活着的记录混塞在同一张业务表里，不如单独建一张专门存放全库所有被删数据的归档表==，并且给它配上一个灵活的 `jsonb` 字段，用来原封不动接住任何业务表的完整行字段：

```sql
CREATE TABLE deleted_record (
    id uuid PRIMARY KEY DEFAULT gen_ulid(),
    deleted_at timestamptz NOT NULL default now(),
    original_table varchar(200) NOT NULL,
    original_id uuid NOT NULL,
    data jsonb NOT NULL
);
```

这样一来，每当需要删除一条数据时，SQL 只需写成这样（在 Postgres 中一条原子 CTE 语句即可完成“删主表 + 留存根”）：

```sql
WITH deleted AS (
    DELETE FROM customer
    WHERE id = @id
    RETURNING *
)
INSERT INTO deleted_record
		(original_table, original_id, data)
SELECT 'foo', id, to_jsonb(deleted.*)
FROM deleted
RETURNING *;
```

比起直接改 `deleted_at`，这种做法确实有一处代价：把一行数据转存进 `jsonb` 之后，想原样塞回原表就没法只靠一句 `UPDATE` 那么轻松可逆了。真要往回倒，虽然并非完全办不到，多半也得临时手写一次性的插回脚本配合人工核对。但还是那句话，这代价完全可以接受，想想你这辈子到底能碰上几次真需要“把死数据原地复活”的场景。

而换回来的好处，却把前面列出的所有痛点一扫而空：

- 正常业务查询彻底解放，再也不用满世界提心吊胆地拼 `deleted_at IS NULL`。
- 数据库的外键约束满血复活：谁敢不清理关联子表就直接删主记录，数据库当场就给你拦下来报错。
- 应对 GDPR 等法规要求的周期性物理彻底清理变得极其简单，全库只剩一行语句：`DELETE FROM deleted_record WHERE deleted_at < now() - '1 year'::interval`。

以后查已删数据虽然比以前多敲半句 SQL、稍微费了一点点事，但也费事不到哪儿去；与此同时，历史快照依然安安静静地留在库里随时待命。

> **[本土化注：国内后端工程里的“逻辑删除 is_deleted 陷阱”与审计归档实践]**
> 放在国内 Java / Go 后端团队的日常开发里，MyBatis-Plus 等 ORM 框架一键开启的 `@TableLogic`（`is_deleted = 0 / 1` 或 `deleted_at`）几乎成了行业标配，却也制造了大量隐蔽的线上坑点：
>
> 1. **唯一索引冲突与联表漏过滤的灾难**：国内研发极少启用外键约束，更常踩的坑反而是“逻辑删除 + 唯一索引（Unique Key）”。比如用户注销后手机号/邮箱列还占位在原表，重新注册就报唯一键冲突；被迫改成 `UNIQUE(email, is_deleted)`，结果同一个人注销两次又撞车，最后只能往 `deleted_at` 塞时间戳或把 `id` 拼进软删标记里，表结构越改越丑。而一旦某个慢 SQL 或数据大盘统计报表忘了带 `AND is_deleted = 0`，指标立刻虚高或直接泄露已注销用户隐私。
> 2. **把“业务删除”和“数据归档”彻底解耦**：Brandur Leach 给出的 `deleted_record` 归档表思路在国产 MySQL / PostgreSQL 业务里同样极为实用：日常在线热表只留真正活着的数据，唯一索引、外键（或领域层强校验）与高并发索引体积全部保持极致干净；所有删掉的数据通过同一个数据库事务（CTE 或事务内 `INSERT ... SELECT`）落进归档表或冷存储。万一遇到极端“假注销、真误删”客诉，写个带审核的脚本回捞即可，彻底省去 99% 日常开发里的心理负担与坏味道代码。

---

## 注释

<span id="f1n">**[1]**</span> 刚有位前 Stripe 同事发邮件提醒我：起码在公司最早期那些年头，偶尔遇到客户实在把自己搞进了极其棘手的烂摊子时，团队确实破例动用过一次软删除去恢复客户记录，但那在内部也是极其罕见且明确不鼓励使用的做法。（感谢 OB 的补充！）

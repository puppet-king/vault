---
title: "如何制定真正有效的设计原则"
date: 2026-11-10
category: 译文
tags: ["Luke Wroblewski", "译文", "设计原则", "产品设计", "交互设计", "团队协作"]
description: "《移动优先（Mobile First）》作者卢克·沃罗布莱夫斯基（Luke Wroblewski）经典设计方法论：为什么大多数团队写出的设计原则都是“简单易用、保持快速”之类的正确废话？对比 Facebook、HTC Sense、Windows 7 与 Office 2007，拆解如何制定真正能帮团队做取舍的产品原则。"
---

# 如何制定真正有效的设计原则

> 原文：[Developing Design Principles](https://www.lukew.com/ff/854/developing-design-principles) · 作者：Luke Wroblewski（2009年7月13日） · [查看英文原版](./en.md)

![如何制定真正有效的设计原则](/images/developing-design-principles/developing-design-principles.webp)

在我的演讲《[核心概念与设计三明治（Parti & the Design Sandwich）](https://www.lukew.com/ff/821/video-parti-the-design-sandwich)》中，我重点强调了“**设计原则（Design Principles）**”在推动复杂、多方利益相关者参与的大型项目朝着统一整体演进时所发挥的关键作用。[如果设计原则能在微软](https://www.lukew.com/ff/796/design-principles-at-microsoft)的 Windows 和 Office（这两个复杂度极高、利益相关方多如牛毛的巨型产品）上行之有效，那么它在任何其他地方也同样能够奏效。

> ==“设计原则是任何软件应用程序的指路明灯。它们向包括客户、同事和团队成员在内的各方利益相关者定义并传递产品的核心特征。设计原则清晰地阐明了衡量一切决策的根本目标，从而确保项目的各个局部始终朝着一个有机的整体协同演进。”==

然而，要想让设计原则真正发挥最大效力，它必须为团队提供一把**衡量和裁决设计决策的标尺**。换句话说，==设计原则必须足够具体，具体到能够帮一群人在不同的设计方案之间做出明确的取舍。== 遗憾的是，许多团队在制定设计原则时的第一本能往往是定得过于宽泛。诸如“让产品简单易用”、“保持快速响应”或者“把用户放在第一位”，通常大家脑子里第一反应蹦出来的全都是这类放之四海而皆准的口号。

但真正管用的设计原则，必须紧密贴合一款产品独特的用户需求与商业目标。为了直观说明这一点，不妨对比一下 Facebook 近期公开的设计原则，与支撑 HTC Sense 用户界面的设计原则之间的显著差异。

---

## 一、宽泛的通用原则：以 Facebook 为例

先来看 [Facebook 的七条设计原则](http://www.facebook.com/note.php?note_id=118951047792&ref=mf)：

- **普适（Universal）：** 我们的设计需要服务于每一个人、每一种文化、每一种语言、每一台设备以及人生的每一个阶段。
- **以人为本（Human）：** 我们的产品腔调与视觉风格应当退居幕后，让位于用户自己的声音、面孔与表达。
- **简洁（Clean）：** 我们的视觉风格干净洗练、低调克制。
- **一致（Consistent）：** 精简、复用，不要重复造轮子重新设计。
- **实用（Useful）：** 专为每天高频重复使用而打造。
- **快速（Fast）：** 越快的体验效率越高，用起来也越轻松无感。
- **透明（Transparent）：** 对于正在发生什么以及为什么发生，我们始终保持清晰坦诚。

正如你所看到的，Facebook 的这套设计原则相当宽泛，虽然在某些顶层决策上依然能帮上点忙（比如用它来驳回某个方案：“这个界面看起来太乱太满当了”，或者“我们已经有现成的设计模式了，直接复用它，别再发明一套新的”）。但从整体上看，这些原则还不够具体，不足以定义出一种独一无二的专属产品体验。毕竟，世上几乎每一个网站都渴望做到“普适、实用、快速、一致”。其中的“以人为本、简洁、透明”或许稍微多了一点 Facebook 的个人特色，但即便如此，它们听起来依然更像是“优秀设计的通用基本常识”，而不是一份能够定义产品灵魂的独特宣言。

不妨对比一下工业设计大师[迪特·拉姆斯（Dieter Rams）著名的“好设计十诫”](/translations/dieter-rams-10-principles/)：

- 好的设计是创新的（Good design is innovative）
- 好的设计让产品实用（Good design makes a product useful）
- 好的设计是唯美的（Good design is aesthetic）
- 好的设计让产品不言自明（Good design helps a product to be understood）
- 好的设计是克制而不张扬的（Good design is unobtrusive）
- 好的设计是诚实的（Good design is honest）
- 好的设计在每一个细节上都深思熟虑（Good design is thorough to the last detail）
- 好的设计是环保的（Good design is concerned with the environment）
- 好的设计是尽可能少的设计（Good design is as little design as possible）

看出两者有多相似了吗？

---

## 二、定义独特体验的具体原则：以 HTC Sense 为例

现在，让我们把上面这种宽泛的写法，与 [HTC Sense 手机界面的三条设计原则](http://www.htc.com/www/product/hero/overview.html)做个对比：

- **属于我的专属感（Make it Mine）：** 个性化定制必须达到前所未有的深度。
- **保持亲密连接（Stay Close）：** 与你生命中重要的人保持联系，意味着将分散在各种沟通渠道与应用中的信息聚合到以“人”为中心。
- **发现意外之喜（Discover the Unexpected）：** 生命中许多最难忘的瞬间，是靠亲身体验感知到的，而不是靠文字解释出来的。

HTC Sense 的这三条设计原则极其具体，正因如此，它们精准地定义出了独属于这款产品的差异化体验。甚至可以说，这套设计原则具体而鲜明到了可以直接拿来当成整款产品核心营销主轴（Marketing Message）的程度。

---

## 三、用于工程裁决的实战信条：微软 Windows 7 与 Office 2007

微软对设计原则的运用同样极其具体且具有极强的实操裁决力。不妨看看支撑 Microsoft Windows 与 Microsoft Office 这两大旗舰产品重构背后的设计原则有何不同。

在 **Windows 7** 桌面体验的重构设计中，[斯蒂芬·霍夫纳格尔（Stephan Hoefnagel）展示了以下六条实战原则](https://www.lukew.com/ff/790/mix09-designing-the-windows-7-desktop-experience)：

1. **减少概念数量，以增强用户的掌控信心**（Reduce concepts to increase confidence）
2. **微小的细节至关重要，无论好坏都会被放大**（Small things matter, good and bad）
3. **着力消除干扰，而不是一味强推功能曝光度**（Solve distractions, not discoverability）
4. **时间宝贵，为移动奔波中的人们而构建**（Time matters, build for people on the go）
5. **珍视从初次上手到日常高频使用的全生命周期体验**（Value the full lifecycle of the experience）
6. **在“好看（Look）”与“好用（Do）”上同时做到极致**（Be great at "look" and "do"）

而在 **Microsoft Office 2007**（引入颠覆性 Ribbon 功能区界面）的重构设计中，[詹森·哈里斯（Jensen Harris）则展示了](http://blogs.msdn.com/jensenh/archive/2008/03/12/the-story-of-the-ribbon.aspx)以下六条“设计信条（Design Tenets）”是如何帮助团队在无数次争论中做出果断决策的：

1. **用户的注意力焦点应当留在他们创作的文档内容上，而不是留在软件界面（UI）上。帮助人们毫无干扰地投入工作。**（A person's focus should be on their content, not on the UI. Help people work without interference.）
2. **减少在任何单一时刻摆在用户面前的选项数量。**（Reduce the number of choices presented at any given time.）
3. **提升操作效率。**（Increase efficiency.）
4. **拥抱一致性（Consistency），但拒绝千篇一律的同质化（Homogeneity）。**（Embrace consistency, but not homogeneity.）
5. ==**给每一个功能一个永久固定的家。宁可选择位置始终如一的固定 UI，也不要搞那种自作聪明、根据上下文动态隐藏或移位的“智能自适应 UI”。**==（Give features a permanent home. Prefer consistent-location UI over "smart" UI.）
6. ==**直白明了，永远胜过耍小聪明。**==（Straightforward is better than clever.）

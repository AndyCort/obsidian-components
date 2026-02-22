---
name: card
description: 一个带标题和内容的卡片组件
props:
  title: 标题
  content: 这里是内容
  color: "#6366f1"
---

<div class="oc-card">
  <div class="oc-card__header" style="background: {{color}};">
    <span class="oc-card__title">{{title}}</span>
  </div>
  <div class="oc-card__body">
    <p>{{content}}</p>
  </div>
</div>

<style>
.oc-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-width: 320px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: var(--background-primary);
}
.oc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.oc-card__header {
  padding: 16px 20px;
  color: white;
}
.oc-card__title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.oc-card__body {
  padding: 16px 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-normal);
}
.oc-card__body p {
  margin: 0;
}
</style>

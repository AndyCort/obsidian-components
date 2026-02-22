---
name: callout
description: 彩色提示框/警告框
props:
  type: info
  title: 提示
  content: 这是一条提示信息
---

<div class="oc-callout oc-callout--{{type}}">
  <div class="oc-callout__title">
    <span class="oc-callout__icon"></span>
    {{title}}
  </div>
  <div class="oc-callout__content">{{content}}</div>
</div>

<style>
.oc-callout {
  border-radius: 10px;
  padding: 14px 18px;
  margin: 4px 0;
  border-left: 4px solid;
  font-size: 14px;
  line-height: 1.5;
}
.oc-callout--info {
  background: rgba(59, 130, 246, 0.08);
  border-color: #3b82f6;
  color: var(--text-normal);
}
.oc-callout--success {
  background: rgba(34, 197, 94, 0.08);
  border-color: #22c55e;
  color: var(--text-normal);
}
.oc-callout--warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: #f59e0b;
  color: var(--text-normal);
}
.oc-callout--danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
  color: var(--text-normal);
}
.oc-callout__title {
  font-weight: 700;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.oc-callout--info .oc-callout__icon::before { content: "ℹ️"; }
.oc-callout--success .oc-callout__icon::before { content: "✅"; }
.oc-callout--warning .oc-callout__icon::before { content: "⚠️"; }
.oc-callout--danger .oc-callout__icon::before { content: "🚫"; }
.oc-callout__content {
  color: var(--text-muted);
}
</style>

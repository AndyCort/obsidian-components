---
name: progress
description: 进度条组件
props:
  value: "70"
  color: "#6366f1"
  label: 进度
---

<div class="oc-progress">
  <div class="oc-progress__header">
    <span class="oc-progress__label">{{label}}</span>
    <span class="oc-progress__value">{{value}}%</span>
  </div>
  <div class="oc-progress__track">
    <div class="oc-progress__bar" style="width: {{value}}%; background: {{color}};"></div>
  </div>
</div>

<style>
.oc-progress {
  min-width: 200px;
  max-width: 400px;
}
.oc-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.oc-progress__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-normal);
}
.oc-progress__value {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  font-family: var(--font-monospace);
}
.oc-progress__track {
  height: 8px;
  border-radius: 999px;
  background: var(--background-modifier-border);
  overflow: hidden;
}
.oc-progress__bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

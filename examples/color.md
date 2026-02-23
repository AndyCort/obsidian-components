---
name: color
description: 颜色展示组件，支持纯色、渐变
props:
  color: "#6366f1"
  name: ""
  size: "default"
---

<div class="oc-color oc-color--{{size}}">
  <div class="oc-color__swatch" style="background: {{color}};"></div>
  {{#if name}}<div class="oc-color__info">
    <span class="oc-color__name">{{name}}</span>
    <span class="oc-color__value">{{color}}</span>
  </div>{{/if}}
</div>

<style>
.oc-color {
  display: inline-flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
  margin: 4px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.oc-color:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06);
}
.oc-color__swatch {
  width: 120px;
  height: 80px;
}
.oc-color--small .oc-color__swatch {
  width: 60px;
  height: 40px;
  border-radius: 8px;
}
.oc-color--small {
  border-radius: 8px;
}
.oc-color--large .oc-color__swatch {
  width: 200px;
  height: 120px;
}
.oc-color__info {
  padding: 8px 10px;
  background: var(--background-primary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.oc-color__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-normal);
  line-height: 1.3;
}
.oc-color__value {
  font-size: 10px;
  font-family: var(--font-monospace);
  color: var(--text-muted);
  word-break: break-all;
  line-height: 1.3;
}
</style>

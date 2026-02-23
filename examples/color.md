---
name: color
description: 行内圆形颜色展示
props:
  color: "#6366f1"
  name: ""
---

<span class="oc-color-dot" style="background: {{color}};" title="{{color}}"></span>{{#if name}}<span class="oc-color-label">{{name}}</span>{{/if}}

<style>
.oc-color-dot {
  display: inline-block;
  width: 1em;
  height: 1em;
  border-radius: 50%;
  vertical-align: middle;
  box-shadow: 0 0 0 1.5px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}
.oc-color-label {
  font-size: 0.85em;
  color: var(--text-muted);
  margin-left: 3px;
  vertical-align: middle;
}
</style>

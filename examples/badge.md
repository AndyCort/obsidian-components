---
name: badge
description: 一个小徽章/标签组件
props:
  text: NEW
  color: "#ef4444"
---

<span class="oc-badge" style="background: {{color}};">{{text}}</span>

<style>
.oc-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  vertical-align: middle;
  line-height: 1.6;
}
</style>

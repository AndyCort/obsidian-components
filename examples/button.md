---
name: button
description: 一个可自定义的按钮组件
props:
  text: Click Me
  color: "#7c5cbf"
  size: medium
---

<button class="oc-btn oc-btn--{{size}}" style="background: {{color}};">
  {{text}}
</button>

<style>
.oc-btn {
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-family: inherit;
}
.oc-btn--small {
  padding: 4px 14px;
  font-size: 12px;
}
.oc-btn--medium {
  padding: 8px 22px;
  font-size: 14px;
}
.oc-btn--large {
  padding: 12px 32px;
  font-size: 16px;
}
.oc-btn:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.oc-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}
</style>

---
name: color
description: 行内圆形颜色展示
props:
  color: "#6366f1"
---

<span class="oc-dot" style="display:inline-block;width:1em;height:1em;border-radius:50%;vertical-align:middle;background:{{color}};box-shadow:0 0 0 1px rgba(0,0,0,0.1);"></span>

<script>
var d = el.querySelector('.oc-dot');
if (d) {
  var c = (props.color || '').trim();
  var i = c.indexOf(':');
  if (i > 0 && i < 20) c = c.slice(i + 1).trim();
  if (c.endsWith(';')) c = c.slice(0, -1).trim();
  d.style.background = c;
}
</script>

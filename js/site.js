/* MaverInk: tiny template runtime for the interactive pages (Work, Co-Lab, SciType, Elemental, Home, Microbial Realm). */
(function () {
  var tpl = document.getElementById('dc-tpl');
  var root = document.getElementById('dc-root');
  var src = document.getElementById('dc-logic');
  if (!tpl || !root || !src) return;

  var inst;
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u) {
    Object.assign(this.state, typeof u === 'function' ? u(this.state) : u);
    render();
  };

  function get(scope, expr) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    return expr.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  function interp(str, scope) {
    var whole = str.match(/^\s*\{\{([^}]*)\}\}\s*$/);
    if (whole) return get(scope, whole[1]);
    return str.replace(/\{\{([^}]*)\}\}/g, function (_, e) { var v = get(scope, e); return v == null ? '' : v; });
  }
  function bindHandler(el, type, fn) {
    el.__h = el.__h || {};
    if (!el.__h[type]) el.addEventListener(type, function (e) { var f = el.__h[type]; if (f) f(e); });
    el.__h[type] = fn;
  }
  function build(node, scope, out) {
    node.childNodes.forEach(function (ch) {
      if (ch.nodeType === 3) { out.appendChild(document.createTextNode(ch.data.indexOf('{{') < 0 ? ch.data : interp(ch.data, scope))); return; }
      if (ch.nodeType !== 1) return;
      var tag = ch.localName;
      if (tag === 'sc-for') {
        var list = interp(ch.getAttribute('list'), scope) || [];
        var as = ch.getAttribute('as');
        list.forEach(function (it) { var s = Object.create(scope); s[as] = it; build(ch, s, out); });
        return;
      }
      if (tag === 'sc-if') { if (interp(ch.getAttribute('value'), scope)) build(ch, scope, out); return; }
      var el = ch.cloneNode(false);
      Array.prototype.slice.call(ch.attributes).forEach(function (a) {
        if (a.value.indexOf('{{') < 0) return;
        if (/^on/i.test(a.name)) {
          el.removeAttribute(a.name);
          var fn = interp(a.value, scope);
          if (typeof fn === 'function') { el.__pending = el.__pending || {}; el.__pending[a.name.slice(2).toLowerCase()] = fn; }
        } else {
          var v = interp(a.value, scope);
          if (v === false || v == null) el.removeAttribute(a.name); else el.setAttribute(a.name, v);
        }
      });
      if (el.__pending) { for (var t in el.__pending) bindHandler(el, t, el.__pending[t]); delete el.__pending; }
      build(ch.content || ch, scope, el);
      out.appendChild(el);
    });
  }
  function morph(a, b) {
    var ac = a.childNodes, bc = Array.prototype.slice.call(b.childNodes);
    for (var i = 0; i < bc.length; i++) {
      var x = ac[i], y = bc[i];
      if (!x) { a.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
      if (x.nodeType === 3) { if (x.data !== y.data) x.data = y.data; continue; }
      if (x.nodeType !== 1) continue;
      Array.prototype.slice.call(x.attributes).forEach(function (at) { if (!y.hasAttribute(at.name)) x.removeAttribute(at.name); });
      Array.prototype.slice.call(y.attributes).forEach(function (at) { if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value); });
      if (y.__h) for (var t in y.__h) bindHandler(x, t, y.__h[t]);
      morph(x, y);
    }
    while (ac.length > bc.length) a.removeChild(a.lastChild);
  }
  function render() {
    var frag = document.createElement('div');
    build(tpl.content, Object.assign({}, inst.renderVals()), frag);
    if (!root.firstChild) { while (frag.firstChild) root.appendChild(frag.firstChild); }
    else morph(root, frag);
  }

  var Component = new Function('DCLogic', src.textContent + '\nreturn Component;')(DCLogic);
  inst = new Component({});
  render();
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && inst.state && typeof inst.state.sel === 'number' && inst.state.sel >= 0) inst.setState({ sel: -1 });
  });
})();

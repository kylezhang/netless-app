var x=Object.defineProperty,E=Object.defineProperties;var M=Object.getOwnPropertyDescriptors;var $=Object.getOwnPropertySymbols;var R=Object.prototype.hasOwnProperty,L=Object.prototype.propertyIsEnumerable;var N=(e,a,o)=>a in e?x(e,a,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[a]=o,S=(e,a)=>{for(var o in a||(a={}))R.call(a,o)&&N(e,o,a[o]);if($)for(var o of $(a))L.call(a,o)&&N(e,o,a[o]);return e},O=(e,a)=>E(e,M(a));import{U as I,V as J}from"./vendor.8ff05f75.js";import{L as z}from"./logger.2c785e5a.js";import"./randomColor.f3878626.js";var W=`.app-talkative-container{width:100%;height:100%;overflow:hidden;display:flex;justify-content:center;align-items:center;flex-direction:column}.app-talkative-container iframe{width:100%;height:100%;border:none;display:block}.app-talkative-footer{position:absolute;bottom:0;left:0;width:100%;display:flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;background-color:#fff9;height:26px;padding:0 16px;border-top:1px solid #eeeef7;color:#191919}.telebox-color-scheme-dark .app-talkative-footer{color:#a6a6a8;background:#2d2d33;border-top:none}.app-talkative-page{font-variant-numeric:tabular-nums}.app-talkative-btn-prev,.app-talkative-btn-next{box-sizing:border-box;width:26px;height:26px;font-size:14px;font-family:monospace;margin:0;padding:3px;border:none;border-radius:1px;outline:none;color:currentColor;background:transparent;transition:background .4s;-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer;user-select:none;-webkit-user-select:none}.app-talkative-btn-prev:hover,.app-talkative-btn-next:hover{background:rgba(237,237,240,.9)}.telebox-color-scheme-dark .app-talkative-btn-prev:hover,.telebox-color-scheme-dark .app-talkative-btn-next:hover{background:#212126}.telebox-color-scheme-dark .app-talkative-container{color:#eee}
`;function j(e){var g;const a=e.getRoom(),o=e.getDisplayer(),n=o.observerId,r=(g=o.state.roomMembers.find(f=>f.memberId===n))==null?void 0:g.payload,m=(a==null?void 0:a.uid)||(r==null?void 0:r.uid)||"",d=(r==null?void 0:r.nickName)||m;return{memberId:n,uid:m,nickName:d}}function A(e){const a=e.indexOf("?",1);return a!==-1?{search:e.slice(a),pathname:e.slice(0,a)}:{search:"",pathname:e}}function P(e,a){const{pathname:o,search:n}=A(e);return o+(n?`${n}&`:"?")+a}const B=Object.prototype.hasOwnProperty;function b(e,a={},o){const n=document.createElement(e);for(const r in a)B.call(a,r)&&n.setAttribute(r,a[r]);return o&&(n.textContent=o),n}const T=window.ResizeObserver||J,H={kind:"Talkative",setup(e){const a=(e.getAppOptions()||{}).debug,o=new z("Talkative",a),{uid:n,memberId:r,nickName:m}=j(e),d=new I;e.storage.ensureState({src:"https://example.org",uid:"",page:1,pageNum:1,lastMsg:""}),e.storage.state.uid||(e.isAddApp||o.log("no teacher's uid, fallback to a random guy"),e.storage.setState({uid:n}));const g=e.storage.state.uid===n?0:2,f=`userid=${r}&role=${g}&name=${m}`,k=e.getBox();k.mountStyles(W);const l=document.createElement("div");l.className="app-talkative-container",k.mountContent(l);const p=document.createElement("iframe");l.appendChild(p);const v=b("span",{class:"app-talkative-page"});if(g===0){const t=b("div",{class:"app-talkative-footer"});l.appendChild(t);const s=b("button",{class:"app-talkative-btn-prev"},"<");t.appendChild(s),s.addEventListener("click",()=>{e.storage.state.page>1&&e.storage.setState({page:e.storage.state.page-1})}),t.appendChild(v);const i=b("button",{class:"app-talkative-btn-next"},">");t.appendChild(i),i.addEventListener("click",()=>{e.storage.state.page<e.storage.state.pageNum&&e.storage.setState({page:e.storage.state.page+1})})}let c=16/9;const y=t=>{var w;const{width:s,height:i}=((w=t[0])==null?void 0:w.contentRect)||l.getBoundingClientRect();if(s/c>i){const h=i*c;p.style.width=`${h}px`,p.style.height=""}else if(s/c<i){const h=s/c;p.style.width="",p.style.height=`${h}px`}};d.add(()=>{const t=new T(y);return t.observe(l),t.disconnect.bind(t)});const u=t=>{var s;(s=p.contentWindow)==null||s.postMessage(t,"*")};d.addDisposer(e.storage.addStateChangedListener(()=>{const{page:t,pageNum:s}=e.storage.state;v.textContent=`${t}/${s}`,u(JSON.stringify({method:"onJumpPage",toPage:t}))}));const C={onPagenum({totalPages:t}){e.getIsWritable()&&t&&e.storage.setState({pageNum:t})},onLoadComplete(t){c=t.coursewareRatio,y([]),e.getIsWritable()&&t.totalPages&&e.storage.setState({pageNum:t.totalPages});const{page:s,lastMsg:i}=e.storage.state;i&&u(i),u(JSON.stringify({method:"onJumpPage",toPage:s}))},onFileMessage(t){if(e.getIsWritable()){e.dispatchMagixEvent("broadcast",JSON.stringify(t));const s=JSON.stringify(O(S({},t),{isRestore:!0}));e.storage.setState({lastMsg:s})}}};d.addDisposer(e.addMagixEventListener("broadcast",({payload:t})=>{u(t)})),d.addEventListener(window,"message",t=>{if(t.source===p.contentWindow)if(typeof t.data=="string")try{const s=JSON.parse(t.data);if(typeof s=="object"&&s!==null){const i=C[s.method];i?i(s):o.warn("unknown message",s)}}catch(s){o.warn("error when parsing message",s)}else typeof t.data=="object"&&t.data!==null&&o.log("unhandled permission command",t.data)}),e.emitter.on("destroy",()=>{o.log("destroy"),d.flushAll(),p.remove()}),p.src=P(e.storage.state.src,f)}};export{H as default};

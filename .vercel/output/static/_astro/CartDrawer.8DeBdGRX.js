import{c as w}from"./createLucideIcon.C5w9TWC-.js";import{j as e}from"./jsx-runtime.u17CrQMm.js";import{r}from"./index.CO9X3OiW.js";import{A as me,m as H}from"./proxy.CyCF32k2.js";const ne=r.createContext();function Ye({children:t}){const[a,h]=r.useState(()=>{if(typeof window<"u"){const i=localStorage.getItem("lab_cart");return i?JSON.parse(i):[]}return[]}),[x,f]=r.useState(!1),[u,z]=r.useState(!1);r.useEffect(()=>{localStorage.setItem("lab_cart",JSON.stringify(a))},[a]),r.useEffect(()=>{const i="https://labone.local/";if(typeof document>"u")return;const o=i.replace(/\/$/,""),g=document.createElement("link");g.rel="preconnect",g.href=o;const l=document.createElement("link");return l.rel="dns-prefetch",l.href=o,document.head.appendChild(g),document.head.appendChild(l),()=>{g.remove(),l.remove()}},[]);const m=i=>{h(o=>o.find(l=>l.id===i.id)?o.map(l=>l.id===i.id?{...l,quantity:l.quantity+1}:l):[...o,{...i,quantity:1}]),f(!0)},S=i=>{h(o=>o.filter(g=>g.id!==i))},k=(i,o)=>{h(g=>g.map(l=>{if(l.id===i){const A=l.quantity+o;return A>0?{...l,quantity:A}:null}return l}).filter(Boolean))},I=()=>{h([]),localStorage.removeItem("lab_cart")},p=()=>{const o="https://labone.local/".replace(/\/$/,""),g=a.map(l=>`${l.id}:${l.quantity}`).join(",");return`${o}/?lab_checkout=${encodeURIComponent(g)}`},b=()=>{if(u)return;if(!a||a.length===0){f(!0);return}const i=p();if(!i){alert("Checkout is not configured yet.");return}z(!0),window.location.assign(i)},y=a.reduce((i,o)=>i+Number(o.price||0)*o.quantity,0),N=a.reduce((i,o)=>i+o.quantity,0);return e.jsx(ne.Provider,{value:{cartItems:a,isCartOpen:x,setIsCartOpen:f,addToCart:m,removeFromCart:S,updateQuantity:k,clearCart:I,checkout:b,checkoutLoading:u,cartTotal:y,cartCount:N},children:t})}const ie=()=>r.useContext(ne);const xe=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Ve=w("arrow-right",xe);const ge=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],be=w("log-out",ge);const fe=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],ye=w("menu",fe);const we=[["path",{d:"M5 12h14",key:"1ays0h"}]],ke=w("minus",we);const ve=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],je=w("plus",ve);const Ne=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],R=w("search",Ne);const Ce=[["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}],["path",{d:"M3.103 6.034h17.794",key:"awc11p"}],["path",{d:"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",key:"o988cm"}]],te=w("shopping-bag",Ce);const ze=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],Y=w("shopping-cart",ze);const Se=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],Ae=w("trash-2",Se);const Ie=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],V=w("user",Ie);const Le=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],T=w("x",Le),se=[{label:"Shop",href:"/shop"},{label:"Build a Pack",href:"/build-a-pack"},{label:"COA",href:"/coa"},{label:"Restock Status",href:"/restock-status"}],Ee=["Research Use Only","99% Purity HPLC Verified","Free Shipping Over $250"],_e="/api/products";function M(t){return String(t||"").toLowerCase().replace(/&amp;/g,"&").replace(/[^a-z0-9.%+\-\s]/g," ").replace(/\s+/g," ").trim()}function $e(t){return Array.isArray(t)?t:Array.isArray(t?.products)?t.products:Array.isArray(t?.items)?t.items:Array.isArray(t?.results)?t.results:Array.isArray(t?.data)?t.data:[]}function re(t){return t?.image||t?.images?.[0]?.src||t?.images?.[0]?.url||t?.featuredImage||"/placeholder-product.png"}function ae(t){return t?.permalink||t?.url||t?.link||`/products/${t?.slug||t?.id}`}function Me(t){const a=t?.price||t?.regular_price||t?.sale_price||t?.price_html||"";if(!a)return"";if(typeof a=="number")return`$${a.toLocaleString(void 0,{maximumFractionDigits:2})}`;if(String(a).includes("$"))return String(a);const h=String(a).replace(/[^0-9.]/g,"");return h?`$${Number(h).toLocaleString(void 0,{maximumFractionDigits:2})}`:""}function Pe(t){if(t?.category)return t.category;if(Array.isArray(t?.categories)&&t.categories.length>0){const a=t.categories[0];return typeof a=="string"?a:a?.name||"Research product"}return"Research product"}function Oe(t){const a=Array.isArray(t?.categories)?t.categories.map(x=>typeof x=="string"?x:x?.name).filter(Boolean):[],h=Array.isArray(t?.tags)?t.tags.map(x=>typeof x=="string"?x:x?.name).filter(Boolean):[];return M([t?.name,t?.title,t?.slug,t?.sku,t?.category,t?.short_description,t?.description,...a,...h].join(" "))}function Re(){return e.jsx("span",{className:"sh-vial","aria-hidden":"true",children:e.jsxs("svg",{viewBox:"0 0 18 24",fill:"none",children:[e.jsx("path",{d:"M6.4 2.5h5.2",stroke:"currentColor",strokeWidth:"1.35",strokeLinecap:"round"}),e.jsx("path",{d:"M7 3.7h4v2.8c0 .48.18.94.52 1.28l1.5 1.52c.5.5.78 1.18.78 1.9v7.45c0 1.2-.97 2.17-2.17 2.17H6.37c-1.2 0-2.17-.97-2.17-2.17V11.2c0-.72.28-1.4.78-1.9l1.5-1.52C6.82 7.44 7 6.98 7 6.5V3.7Z",stroke:"currentColor",strokeWidth:"1.35",strokeLinejoin:"round"}),e.jsx("path",{d:"M5.45 15.25h7.1v3.28c0 .62-.5 1.12-1.12 1.12H6.57c-.62 0-1.12-.5-1.12-1.12v-3.28Z",fill:"currentColor",opacity:"0.22"})]})})}function U(){return e.jsx("div",{className:"sh-announcement-group",children:Ee.map((t,a)=>e.jsxs("div",{className:"sh-announcement-item",children:[e.jsx("span",{children:t}),e.jsx(Re,{})]},`${t}-${a}`))})}function Ue(){return e.jsxs("div",{className:"sh-announcement-track",children:[e.jsx(U,{}),e.jsx(U,{}),e.jsx(U,{}),e.jsx(U,{})]})}function De({logoSrc:t="/TRANSPARENCIA-03.png",logoAlt:a="Research Lab Logo"}){const[h,x]=r.useState("top"),[f,u]=r.useState(!1),[z,m]=r.useState(null),[S,k]=r.useState(!1),[I,p]=r.useState(!1),[b,y]=r.useState(!1),[N,i]=r.useState(""),[o,g]=r.useState([]),[l,A]=r.useState(!1),[P,$]=r.useState(""),[D,W]=r.useState([]),[L,oe]=r.useState(!1),q=r.useRef(null),F=r.useRef(null),X=r.useRef(0),{cartItems:le,setIsCartOpen:B}=ie(),ce=le.reduce((s,n)=>s+Number(n.quantity||0),0),O=I?ce:0,v=N.trim(),Q=r.useMemo(()=>v?`/shop?search=${encodeURIComponent(v)}`:"/shop",[v]);r.useEffect(()=>{p(!0)},[]),r.useEffect(()=>{if(!b)return;const s=window.setTimeout(()=>{F.current?.focus()},80);return()=>window.clearTimeout(s)},[b]),r.useEffect(()=>{const s=n=>{q.current&&(q.current.contains(n.target)||y(!1))};return document.addEventListener("mousedown",s),()=>document.removeEventListener("mousedown",s)},[]),r.useEffect(()=>{const s=n=>{n.key==="Escape"&&(y(!1),i(""),g([]),$(""),A(!1))};return window.addEventListener("keydown",s),()=>window.removeEventListener("keydown",s)},[]),r.useEffect(()=>{if(!b&&!f||L)return;const s=new AbortController;return(async()=>{try{A(!0),$("");const c=await fetch(_e,{method:"GET",cache:"no-store",signal:s.signal,headers:{Accept:"application/json"}});if(!c.ok)throw new Error(`Products request failed: ${c.status}`);const d=await c.json(),C=$e(d);W(C),oe(!0)}catch(c){if(c.name==="AbortError")return;W([]),$("Search is unavailable right now.")}finally{A(!1)}})(),()=>s.abort()},[b,f,L]),r.useEffect(()=>{if(v.length<2){g([]),$("");return}if(!L)return;const s=M(v),n=s.split(" ").filter(Boolean),c=D.map(d=>{const C=Oe(d),_=M(d?.name||d?.title),he=M(d?.sku),ue=M(d?.slug);let j=0;return _===s&&(j+=100),_.startsWith(s)&&(j+=75),_.includes(s)&&(j+=55),he===s&&(j+=85),ue.includes(s)&&(j+=35),C.includes(s)&&(j+=25),n.forEach(ee=>{_.includes(ee)&&(j+=15),C.includes(ee)&&(j+=8)}),{product:d,score:j}}).filter(d=>d.score>0).sort((d,C)=>C.score-d.score).map(d=>d.product).slice(0,6);g(c)},[v,D,L]),r.useEffect(()=>{const s=async()=>{try{const c=await fetch(`/api/account?ts=${Date.now()}`,{method:"GET",cache:"no-store",headers:{Accept:"application/json","Cache-Control":"no-cache"}});if(!c.ok){m(null),k(!0);return}const d=await c.json();m(d),k(!0)}catch{m(null),k(!0)}};s();const n=()=>s();return window.addEventListener("focus",n),window.addEventListener("lab-auth-updated",n),()=>{window.removeEventListener("focus",n),window.removeEventListener("lab-auth-updated",n)}},[]),r.useEffect(()=>{const s=()=>{const n=window.scrollY,c=n>X.current;n<24?x("top"):c&&n>90?x("hidden"):c||x("compact"),X.current=Math.max(n,0)};return s(),window.addEventListener("scroll",s,{passive:!0}),()=>window.removeEventListener("scroll",s)},[]),r.useEffect(()=>(f?(document.documentElement.classList.add("sh-menu-lock"),document.body.classList.add("sh-menu-lock")):(document.documentElement.classList.remove("sh-menu-lock"),document.body.classList.remove("sh-menu-lock")),()=>{document.documentElement.classList.remove("sh-menu-lock"),document.body.classList.remove("sh-menu-lock")}),[f]);const G=h==="top",de=h==="hidden"&&!f,pe=h==="compact"||f||b,E=!!z,J=()=>{B(!0)},Z=()=>{i(""),g([]),$(""),A(!1),F.current?.focus()},K=async()=>{await fetch("/api/auth/logout",{method:"POST"}),m(null),u(!1),window.dispatchEvent(new Event("lab-auth-updated")),window.location.pathname==="/account"&&window.location.reload()};return e.jsxs(e.Fragment,{children:[e.jsx("header",{className:`sh-header ${de?"sh-header-hidden":""}`,children:e.jsxs("div",{className:"sh-shell",children:[e.jsxs("div",{className:`sh-announcement ${G?"is-visible":"is-hidden"}`,children:[e.jsx("div",{className:"sh-announcement-fade sh-announcement-fade-left"}),e.jsx("div",{className:"sh-announcement-fade sh-announcement-fade-right"}),e.jsx("div",{className:"sh-announcement-inner",children:e.jsx(Ue,{})})]}),e.jsx("div",{className:`sh-nav-card ${pe?"sh-nav-glass":"sh-nav-clear"} ${G?"sh-nav-top":"sh-nav-compact"}`,children:e.jsxs("nav",{className:"sh-nav",children:[e.jsx("button",{type:"button",className:"sh-mobile-toggle",onClick:()=>u(!0),"aria-label":"Open menu",children:e.jsx(ye,{size:27})}),e.jsx("a",{href:"/",className:"sh-logo","aria-label":"Home",children:e.jsx("img",{src:t,alt:a})}),e.jsx("div",{className:"sh-links",children:se.map(s=>e.jsx("a",{href:s.href,className:"sh-link",children:s.label},s.label))}),e.jsxs("div",{className:"sh-actions",children:[e.jsxs("div",{ref:q,className:`sh-inline-search ${b?"is-open":""}`,children:[e.jsx("button",{type:"button","aria-label":"Search products",className:"sh-inline-search-trigger",onClick:()=>y(!0),children:e.jsx(R,{size:22})}),e.jsxs("form",{className:"sh-inline-search-form",onSubmit:s=>{s.preventDefault(),v&&(window.location.href=Q)},children:[e.jsx(R,{size:16}),e.jsx("input",{ref:F,value:N,onChange:s=>{i(s.target.value),y(!0)},type:"text",placeholder:"Search products..."}),N&&e.jsx("button",{type:"button","aria-label":"Clear search",onClick:Z,children:e.jsx(T,{size:13})})]}),b&&e.jsx("div",{className:"sh-inline-results",children:v.length<2?e.jsx("div",{className:"sh-inline-empty",children:"Start typing to search products."}):l&&!L?e.jsx("div",{className:"sh-inline-empty",children:"Loading product catalog..."}):P?e.jsx("div",{className:"sh-inline-empty",children:P}):o.length===0?e.jsxs("div",{className:"sh-inline-empty",children:["No products found for “",v,"”."]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"sh-inline-results-list",children:o.map(s=>{const n=s?.name||s?.title||"Product",c=ae(s),d=re(s),C=Me(s),_=Pe(s);return e.jsxs("a",{href:c,className:"sh-inline-result",onClick:()=>y(!1),children:[e.jsx("span",{className:"sh-inline-result-image",children:e.jsx("img",{src:d,alt:n})}),e.jsxs("span",{className:"sh-inline-result-copy",children:[e.jsx("strong",{children:n}),e.jsx("small",{children:_})]}),e.jsx("span",{className:"sh-inline-result-price",children:C||"View"})]},s?.id||c)})}),e.jsx("a",{href:Q,className:"sh-inline-view-all",onClick:()=>y(!1),children:"View all results →"})]})})]}),e.jsxs("div",{className:"sh-user-menu",children:[e.jsx("a",{href:"/account","aria-label":"Account",className:"sh-icon sh-user-icon",children:e.jsx(V,{size:24})}),e.jsxs("div",{className:"sh-user-dropdown",children:[e.jsxs("div",{className:"sh-user-dropdown-head",children:[e.jsx("p",{children:E?"Account Active":"Client Portal"}),e.jsx("span",{children:E?`Signed in as ${z?.name||"customer"}.`:"Access your rewards, points, and recent orders."})]}),S?E?e.jsxs(e.Fragment,{children:[e.jsxs("a",{href:"/account",className:"sh-user-dropdown-link",children:[e.jsx(V,{size:16}),"Ver perfil"]}),e.jsxs("button",{type:"button",className:"sh-user-dropdown-link sh-user-dropdown-button",onClick:K,children:[e.jsx(be,{size:16}),"Cerrar sesión"]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("a",{href:"/account",className:"sh-user-dropdown-link",children:[e.jsx(V,{size:16}),"Iniciar sesión"]}),e.jsxs("a",{href:"/register",className:"sh-user-dropdown-link",children:[e.jsx("span",{className:"sh-user-dot"}),"Registrarse"]})]}):e.jsx("div",{className:"sh-user-dropdown-loading",children:"Checking session..."})]})]}),e.jsxs("button",{type:"button","aria-label":"Open cart",className:"sh-icon sh-cart",onClick:J,children:[e.jsx(Y,{size:25}),e.jsx("span",{suppressHydrationWarning:!0,children:O})]})]}),e.jsxs("button",{type:"button","aria-label":"Open cart",className:"sh-mobile-cart",onClick:J,children:[e.jsx(Y,{size:24}),e.jsx("span",{suppressHydrationWarning:!0,children:O})]})]})})]})}),f&&e.jsxs("div",{className:"sh-mobile-overlay",children:[e.jsx("button",{type:"button",className:"sh-mobile-backdrop",onClick:()=>u(!1),"aria-label":"Close menu"}),e.jsxs("aside",{className:"sh-mobile-panel",children:[e.jsx("div",{className:"sh-mobile-glow"}),e.jsxs("div",{className:"sh-mobile-top",children:[e.jsx("a",{href:"/",onClick:()=>u(!1),children:e.jsx("img",{src:t,alt:a})}),e.jsx("button",{type:"button",onClick:()=>u(!1),"aria-label":"Close menu",className:"sh-mobile-close",children:e.jsx(T,{size:24})})]}),e.jsxs("div",{className:"sh-mobile-label",children:[e.jsx("span",{}),"Menu"]}),e.jsxs("div",{className:"sh-mobile-links",children:[se.map((s,n)=>e.jsxs("a",{href:s.href,onClick:()=>u(!1),style:{"--delay":`${n*45}ms`},children:[e.jsx("span",{children:String(n+1).padStart(2,"0")}),s.label]},s.label)),E?e.jsxs(e.Fragment,{children:[e.jsxs("a",{href:"/account",onClick:()=>u(!1),style:{"--delay":"210ms"},children:[e.jsx("span",{children:"05"}),"Ver perfil"]}),e.jsxs("button",{type:"button",onClick:K,style:{"--delay":"255ms"},children:[e.jsx("span",{children:"06"}),"Cerrar sesión"]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("a",{href:"/account",onClick:()=>u(!1),style:{"--delay":"210ms"},children:[e.jsx("span",{children:"05"}),"Iniciar sesión"]}),e.jsxs("a",{href:"/register",onClick:()=>u(!1),style:{"--delay":"255ms"},children:[e.jsx("span",{children:"06"}),"Registrarse"]})]})]}),e.jsxs("div",{className:"sh-mobile-search",children:[e.jsxs("div",{className:"sh-mobile-search-box",children:[e.jsx(R,{size:16}),e.jsx("input",{value:N,onChange:s=>{i(s.target.value),y(!0)},type:"text",placeholder:"Search products..."}),N&&e.jsx("button",{type:"button",onClick:Z,"aria-label":"Clear",children:e.jsx(T,{size:13})})]}),N.trim().length>=2&&e.jsx("div",{className:"sh-mobile-search-results",children:l&&!L?e.jsx("p",{children:"Loading products..."}):P?e.jsx("p",{children:P}):o.length===0?e.jsx("p",{children:"No products found."}):o.slice(0,4).map(s=>{const n=s?.name||s?.title||"Product",c=ae(s),d=re(s);return e.jsxs("a",{href:c,onClick:()=>{u(!1),y(!1)},children:[e.jsx("img",{src:d,alt:n}),e.jsx("span",{children:n})]},s?.id||c)})})]}),e.jsxs("div",{className:"sh-mobile-note",children:[e.jsx("p",{children:E?"Account Active":"Research Use Only"}),e.jsx("span",{children:E?`${z?.points||0} reward points available.`:"Laboratory research catalog only."})]}),e.jsxs("div",{className:"sh-mobile-bottom",children:[e.jsxs("a",{href:"/shop",onClick:()=>u(!1),children:[e.jsx(R,{size:21}),"Search"]}),e.jsxs("button",{type:"button",onClick:()=>{u(!1),B(!0)},children:[e.jsx(Y,{size:22}),"Cart",O>0&&e.jsx("span",{suppressHydrationWarning:!0,children:O})]})]})]})]}),e.jsx("style",{children:`
        .sh-menu-lock {
          overflow: hidden !important;
        }

        .sh-header {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 100;
          pointer-events: none;
          transform: translateY(0);
          opacity: 1;
          transition:
            transform 360ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 220ms ease;
          will-change: transform, opacity;
        }

        .sh-header-hidden {
          transform: translateY(-120%);
          opacity: 0;
        }

        .sh-shell {
          pointer-events: auto;
          padding: 0 12px;
        }

        .sh-announcement {
          position: relative;
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            90deg,
            rgba(7, 25, 38, 0.76),
            rgba(2, 6, 23, 0.72),
            rgba(7, 25, 38, 0.76)
          );
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition:
            max-height 260ms ease,
            opacity 180ms ease;
        }

        .sh-announcement.is-visible {
          max-height: 38px;
          opacity: 1;
        }

        .sh-announcement.is-hidden {
          max-height: 0;
          opacity: 0;
          pointer-events: none;
        }

        .sh-announcement-inner {
          position: relative;
          z-index: 1;
          display: flex;
          overflow: hidden;
          white-space: nowrap;
        }

        .sh-announcement-track {
          display: flex;
          width: max-content;
          animation: shAnnouncementMove 28s linear infinite;
          will-change: transform;
        }

        .sh-announcement-group {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .sh-announcement-item {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 9px 42px;
          flex-shrink: 0;
          font-family: "Orbitron", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(236, 254, 255, 0.86);
        }

        .sh-vial {
          display: inline-grid;
          width: 16px;
          height: 21px;
          place-items: center;
          color: rgba(103, 232, 249, 0.72);
          filter: drop-shadow(0 0 9px rgba(34, 211, 238, 0.25));
          flex-shrink: 0;
        }

        .sh-vial svg {
          width: 14px;
          height: 19px;
        }

        .sh-announcement-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          z-index: 3;
          width: 110px;
          pointer-events: none;
        }

        .sh-announcement-fade-left {
          left: 0;
          background: linear-gradient(
            90deg,
            rgba(2, 6, 23, 0.96),
            rgba(2, 6, 23, 0)
          );
        }

        .sh-announcement-fade-right {
          right: 0;
          background: linear-gradient(
            270deg,
            rgba(2, 6, 23, 0.96),
            rgba(2, 6, 23, 0)
          );
        }

        @keyframes shAnnouncementMove {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-25%);
          }
        }

        .sh-nav-card {
          max-width: 1280px;
          margin-inline: auto;
          border-radius: 24px;
          overflow: visible;
          transition:
            margin-top 260ms ease,
            background 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease,
            backdrop-filter 220ms ease;
        }

        .sh-nav-top,
        .sh-nav-compact {
          margin-top: 12px;
        }

        .sh-nav-clear {
          border: 1px solid transparent;
          background: transparent;
          box-shadow: none;
          backdrop-filter: blur(0);
          -webkit-backdrop-filter: blur(0);
        }

        .sh-nav-glass {
          border: 1px solid rgba(165, 243, 252, 0.1);
          background: linear-gradient(
            135deg,
            rgba(8, 25, 38, 0.72),
            rgba(3, 10, 18, 0.66),
            rgba(8, 28, 42, 0.7)
          );
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .sh-nav {
          display: flex;
          height: 78px;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
        }

        .sh-logo {
          display: flex;
          min-width: 130px;
          align-items: center;
        }

        .sh-logo img {
          width: auto;
          max-width: 176px;
          max-height: 54px;
          object-fit: contain;
          transition: transform 280ms ease;
        }

        .sh-logo:hover img {
          transform: scale(1.03);
        }

        .sh-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sh-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.84);
          transition: color 260ms ease;
        }

        .sh-link:hover {
          color: white;
        }

        .sh-link::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          border: 1px solid transparent;
          background: transparent;
          opacity: 0;
          transform: scale(0.92);
          transition:
            opacity 260ms ease,
            transform 260ms ease,
            background 260ms ease,
            border-color 260ms ease;
        }

        .sh-link:hover::before {
          opacity: 1;
          transform: scale(1);
          border-color: rgba(165, 243, 252, 0.1);
          background: rgba(34, 211, 238, 0.055);
        }

        .sh-link::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 4px;
          height: 2px;
          width: 0;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgb(103, 232, 249);
          transition: width 260ms ease;
        }

        .sh-link:hover::after {
          width: 32px;
        }

        .sh-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .sh-icon,
        .sh-mobile-toggle,
        .sh-mobile-cart {
          position: relative;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          padding: 0;
          color: rgba(255, 255, 255, 0.78);
          cursor: pointer;
          transition: color 240ms ease, transform 240ms ease;
        }

        .sh-icon {
          display: inline-flex;
        }

        .sh-mobile-toggle,
        .sh-mobile-cart {
          display: none;
        }

        .sh-icon:hover,
        .sh-mobile-toggle:hover,
        .sh-mobile-cart:hover {
          color: rgb(165, 243, 252);
          transform: translateY(-1px);
        }

        .sh-user-menu {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .sh-user-icon {
          padding: 0;
        }

        .sh-user-dropdown {
          position: absolute;
          top: calc(100% + 18px);
          right: -18px;
          width: 278px;
          padding: 8px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 24px;
          background: linear-gradient(
            145deg,
            rgba(7, 22, 34, 0.98),
            rgba(3, 10, 18, 0.96),
            rgba(8, 28, 42, 0.96)
          );
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px) scale(0.98);
          transition:
            opacity 220ms ease,
            visibility 220ms ease,
            transform 220ms ease;
        }

        .sh-user-menu:hover .sh-user-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .sh-user-dropdown::before {
          content: "";
          position: absolute;
          top: -10px;
          right: 22px;
          width: 18px;
          height: 18px;
          border-left: 1px solid rgba(165, 243, 252, 0.1);
          border-top: 1px solid rgba(165, 243, 252, 0.1);
          background: rgba(7, 22, 34, 0.98);
          transform: rotate(45deg);
        }

        .sh-user-dropdown-head {
          position: relative;
          z-index: 1;
          padding: 13px 15px 12px;
          border-bottom: 1px solid rgba(165, 243, 252, 0.1);
        }

        .sh-user-dropdown-head p {
          margin: 0;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-user-dropdown-head span {
          display: block;
          margin-top: 7px;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.52);
        }

        .sh-user-dropdown-loading {
          position: relative;
          z-index: 1;
          margin-top: 6px;
          border-radius: 17px;
          padding: 13px 15px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.58);
        }

        .sh-user-dropdown-link {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          border: 0;
          border-radius: 17px;
          background: transparent;
          padding: 13px 15px;
          text-align: left;
          font-size: 14px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.86);
          cursor: pointer;
          transition:
            background 220ms ease,
            color 220ms ease,
            transform 220ms ease;
        }

        .sh-user-dropdown-link:hover {
          background: rgba(34, 211, 238, 0.07);
          color: white;
          transform: translateX(2px);
        }

        .sh-user-dropdown-link svg {
          color: rgb(165, 243, 252);
        }

        .sh-user-dropdown-button {
          font-family: inherit;
        }

        .sh-user-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          box-shadow: 0 0 16px rgba(103, 232, 249, 0.45);
        }

        .sh-cart span,
        .sh-mobile-cart span {
          position: absolute;
          top: -12px;
          right: -12px;
          display: grid;
          min-width: 17px;
          height: 17px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding-inline: 5px;
          font-size: 9px;
          font-weight: 900;
          color: rgb(2, 6, 23);
          box-shadow: 0 0 18px rgba(103, 232, 249, 0.45);
        }

        .sh-inline-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sh-inline-search-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          padding: 0;
          color: rgba(255, 255, 255, 0.78);
          cursor: pointer;
          transition:
            color 240ms ease,
            transform 240ms ease,
            opacity 200ms ease;
        }

        .sh-inline-search-trigger:hover {
          color: rgb(165, 243, 252);
          transform: translateY(-1px);
        }

        .sh-inline-search.is-open .sh-inline-search-trigger {
          opacity: 0;
          pointer-events: none;
          width: 0;
        }

        .sh-inline-search-form {
          display: grid;
          grid-template-columns: 16px 0fr auto;
          align-items: center;
          gap: 8px;
          width: 0;
          min-height: 42px;
          overflow: hidden;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          padding: 0;
          opacity: 0;
          transition:
            width 260ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms ease,
            border-color 220ms ease,
            background 220ms ease,
            padding 220ms ease;
        }

        .sh-inline-search.is-open .sh-inline-search-form {
          grid-template-columns: 16px 1fr auto;
          width: 300px;
          border-color: rgba(165, 243, 252, 0.13);
          background: rgba(2, 6, 23, 0.5);
          padding: 0 11px;
          opacity: 1;
        }

        .sh-inline-search-form svg {
          color: rgba(165, 243, 252, 0.68);
        }

        .sh-inline-search-form input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 13px;
          font-weight: 700;
        }

        .sh-inline-search-form input::placeholder {
          color: rgba(148, 163, 184, 0.48);
        }

        .sh-inline-search-form button {
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
        }

        .sh-inline-results {
          position: absolute;
          top: calc(100% + 16px);
          right: 0;
          width: min(430px, 92vw);
          overflow: hidden;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 24px;
          background:
            linear-gradient(145deg, rgba(8, 28, 42, 0.98), rgba(2, 6, 23, 0.98)),
            #061522;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
          padding: 8px;
          animation: shInlineSearchIn 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sh-inline-empty {
          padding: 18px;
          text-align: center;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(148, 163, 184, 0.72);
        }

        .sh-inline-results-list {
          display: grid;
          gap: 6px;
        }

        .sh-inline-result {
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: center;
          gap: 11px;
          border: 1px solid rgba(165, 243, 252, 0.08);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.022);
          padding: 8px;
          transition:
            border-color 220ms ease,
            background 220ms ease,
            transform 220ms ease;
        }

        .sh-inline-result:hover {
          transform: translateY(-1px);
          border-color: rgba(165, 243, 252, 0.2);
          background: rgba(103, 232, 249, 0.055);
        }

        .sh-inline-result-image {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          overflow: hidden;
          border-radius: 14px;
          background:
            radial-gradient(circle at 50% 35%, rgba(103, 232, 249, 0.16), transparent 55%),
            rgba(2, 6, 23, 0.7);
        }

        .sh-inline-result-image img {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .sh-inline-result-copy {
          min-width: 0;
        }

        .sh-inline-result-copy strong {
          display: block;
          overflow: hidden;
          color: white;
          font-size: 13px;
          font-weight: 850;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-inline-result-copy small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: rgba(148, 163, 184, 0.72);
          font-size: 10.5px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-inline-result-price {
          font-size: 12px;
          font-weight: 900;
          color: rgb(165, 243, 252);
        }

        .sh-inline-view-all {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          margin-top: 7px;
          border-radius: 16px;
          background: rgb(103, 232, 249);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgb(2, 6, 23);
        }

        .sh-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          pointer-events: auto;
          overflow: hidden;
        }

        .sh-mobile-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background:
            radial-gradient(circle at 15% 10%, rgba(103, 232, 249, 0.09), transparent 28%),
            rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: shFadeIn 260ms ease forwards;
          cursor: pointer;
        }

        .sh-mobile-panel {
          position: relative;
          display: flex;
          height: 100%;
          width: min(88%, 410px);
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid rgba(165, 243, 252, 0.13);
          background:
            linear-gradient(145deg, rgba(8, 28, 42, 0.98), rgba(2, 6, 23, 0.98)),
            #061522;
          padding: 20px;
          box-shadow: 24px 0 100px rgba(0, 0, 0, 0.56);
          animation: shPanelIn 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sh-mobile-glow {
          position: absolute;
          top: -120px;
          left: -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: rgba(103, 232, 249, 0.1);
          filter: blur(90px);
          pointer-events: none;
        }

        .sh-mobile-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sh-mobile-top img {
          max-width: 150px;
          max-height: 50px;
          object-fit: contain;
        }

        .sh-mobile-close {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.13);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
          color: white;
          cursor: pointer;
          transition: background 240ms ease, color 240ms ease, transform 240ms ease;
        }

        .sh-mobile-close:hover {
          background: rgba(103, 232, 249, 0.1);
          color: rgb(165, 243, 252);
          transform: rotate(4deg);
        }

        .sh-mobile-label {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(165, 243, 252, 0.56);
        }

        .sh-mobile-label span {
          display: block;
          width: 28px;
          height: 1px;
          background: rgba(103, 232, 249, 0.72);
        }

        .sh-mobile-links {
          position: relative;
          z-index: 1;
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sh-mobile-links a,
        .sh-mobile-links button {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.032);
          padding: 16px 18px;
          text-align: left;
          font-family: inherit;
          font-size: 16px;
          font-weight: 800;
          color: white;
          cursor: pointer;
          opacity: 0;
          transform: translateX(-14px);
          animation: shMobileItemIn 460ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: var(--delay, 0ms);
          transition:
            border-color 240ms ease,
            background 240ms ease,
            transform 240ms ease;
        }

        .sh-mobile-links a:hover,
        .sh-mobile-links button:hover {
          border-color: rgba(103, 232, 249, 0.24);
          background: rgba(103, 232, 249, 0.075);
          transform: translateX(4px);
        }

        .sh-mobile-links span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: rgba(165, 243, 252, 0.58);
        }

        .sh-mobile-search {
          position: relative;
          z-index: 1;
          margin-top: 18px;
        }

        .sh-mobile-search-box {
          display: grid;
          grid-template-columns: 18px 1fr auto;
          align-items: center;
          gap: 10px;
          min-height: 50px;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          padding: 0 14px;
        }

        .sh-mobile-search-box svg {
          color: rgba(165, 243, 252, 0.7);
        }

        .sh-mobile-search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 13px;
          font-weight: 700;
        }

        .sh-mobile-search-box input::placeholder {
          color: rgba(148, 163, 184, 0.48);
        }

        .sh-mobile-search-box button {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(165, 243, 252, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
        }

        .sh-mobile-search-results {
          display: grid;
          gap: 7px;
          margin-top: 10px;
          max-height: 210px;
          overflow-y: auto;
        }

        .sh-mobile-search-results p {
          margin: 0;
          border: 1px solid rgba(165, 243, 252, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.022);
          padding: 13px;
          text-align: center;
          font-size: 12px;
          color: rgba(148, 163, 184, 0.72);
        }

        .sh-mobile-search-results a {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(165, 243, 252, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.022);
          padding: 7px;
        }

        .sh-mobile-search-results img {
          width: 42px;
          height: 42px;
          object-fit: contain;
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.5);
        }

        .sh-mobile-search-results span {
          overflow: hidden;
          color: white;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .sh-mobile-note {
          position: relative;
          z-index: 1;
          margin-top: 28px;
          border: 1px solid rgba(103, 232, 249, 0.16);
          border-radius: 26px;
          background: rgba(103, 232, 249, 0.055);
          padding: 18px;
        }

        .sh-mobile-note p {
          margin: 0;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgb(165, 243, 252);
        }

        .sh-mobile-note span {
          display: block;
          margin-top: 9px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.62);
        }

        .sh-mobile-bottom {
          position: relative;
          z-index: 1;
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-top: 22px;
        }

        .sh-mobile-bottom a,
        .sh-mobile-bottom button {
          position: relative;
          display: flex;
          min-height: 54px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(165, 243, 252, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
          cursor: pointer;
        }

        .sh-mobile-bottom button span {
          display: grid;
          min-width: 18px;
          height: 18px;
          place-items: center;
          border-radius: 999px;
          background: rgb(103, 232, 249);
          padding-inline: 5px;
          font-size: 9px;
          font-weight: 900;
          color: rgb(2, 6, 23);
        }

        @keyframes shFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes shPanelIn {
          from {
            opacity: 0;
            transform: translateX(-100%) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes shMobileItemIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shInlineSearchIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 1024px) {
          .sh-links,
          .sh-actions {
            display: none;
          }

          .sh-mobile-toggle,
          .sh-mobile-cart {
            display: inline-flex;
          }

          .sh-nav {
            display: grid;
            grid-template-columns: 44px 1fr 44px;
            height: 72px;
            align-items: center;
            padding-inline: 16px;
          }

          .sh-mobile-toggle {
            justify-self: start;
          }

          .sh-logo {
            min-width: 0;
            justify-self: center;
            justify-content: center;
          }

          .sh-logo img {
            max-width: 150px;
            max-height: 48px;
          }

          .sh-mobile-cart {
            justify-self: end;
          }

          .sh-mobile-cart span {
            top: -9px;
            right: -9px;
          }
        }

        @media (max-width: 768px) {
          .sh-shell {
            padding: 0 10px;
          }

          .sh-announcement {
            width: calc(100% + 20px);
            margin-left: -10px;
          }

          .sh-announcement-track {
            animation-duration: 22s;
          }

          .sh-announcement-item {
            gap: 12px;
            padding: 8px 22px;
            font-size: 8.5px;
            letter-spacing: 0.2em;
          }

          .sh-announcement-fade {
            width: 54px;
          }

          .sh-vial svg {
            width: 13px;
            height: 18px;
          }

          .sh-nav-card {
            border-radius: 22px;
          }

          .sh-nav {
            height: 70px;
          }

          .sh-logo img {
            max-width: 142px;
            max-height: 46px;
          }
        }

        @media (max-width: 420px) {
          .sh-mobile-panel {
            width: min(91%, 390px);
            padding: 18px;
          }

          .sh-logo img {
            max-width: 132px;
          }

          .sh-mobile-links a,
          .sh-mobile-links button {
            padding: 14px 16px;
            font-size: 15px;
          }
        }
      `})]})}function We(){const{isCartOpen:t,setIsCartOpen:a,cartItems:h,updateQuantity:x,removeFromCart:f,cartTotal:u,checkout:z,checkoutLoading:m}=ie(),S=h.length>0,k=p=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(p||0)),I=h.reduce((p,b)=>p+Number(b.quantity||0),0);return e.jsx(me,{children:t&&e.jsxs(e.Fragment,{children:[e.jsx(H.button,{type:"button","aria-label":"Close cart overlay",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>{m||a(!1)},className:"fixed inset-0 z-[9998] bg-black/65 backdrop-blur-sm"}),e.jsxs(H.aside,{initial:{x:"100%"},animate:{x:0},exit:{x:"100%"},transition:{type:"tween",duration:.34,ease:[.16,1,.3,1]},className:"fixed bottom-0 right-0 top-0 z-[9999] flex w-full max-w-[430px] flex-col overflow-hidden border-l border-cyan-200/10 bg-[#040814]/95 text-white shadow-[-18px_0_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl",children:[e.jsx("div",{className:"border-b border-cyan-200/10 px-5 py-5",children:e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/60",children:"Cart"}),e.jsx("h2",{className:"mt-1 text-2xl font-semibold tracking-[-0.04em] text-white",children:"Your order"}),e.jsx("p",{className:"mt-1 text-sm text-slate-400",children:S?`${I} item${I>1?"s":""} selected`:"Your cart is empty"})]}),e.jsx("button",{type:"button",onClick:()=>{m||a(!1)},disabled:m,"aria-label":"Close cart",className:"grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-200/25 hover:text-white disabled:cursor-wait disabled:opacity-50",children:e.jsx(T,{size:17})})]})}),e.jsx("div",{className:"flex-1 overflow-y-auto px-5 py-5",children:S?e.jsx("div",{className:"space-y-3",children:h.map(p=>{const b=p.images?.[0]?.src,y=Number(p.price||0)*p.quantity;return e.jsx(H.article,{layout:!0,initial:{opacity:0,y:8},animate:{opacity:1,y:0},exit:{opacity:0,y:-8},className:"rounded-2xl border border-cyan-200/10 bg-white/[0.025] p-3 transition hover:border-cyan-200/20 hover:bg-white/[0.04]",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("div",{className:"flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(145deg,rgba(6,17,31,1),rgba(8,38,56,0.65),rgba(4,12,24,1))]",children:b?e.jsx("img",{src:b,alt:p.name,className:"max-h-[76px] w-auto object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.35)]"}):e.jsx(te,{size:22,className:"text-cyan-200/60"})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("div",{className:"flex items-start justify-between gap-3",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx("h3",{className:"line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white",children:p.name}),e.jsxs("p",{className:"mt-1 text-sm text-slate-400",children:[k(p.price)," each"]})]}),e.jsx("button",{type:"button",onClick:()=>f(p.id),disabled:m,"aria-label":"Remove product",className:"grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50",children:e.jsx(Ae,{size:14})})]}),e.jsxs("div",{className:"mt-4 flex items-center justify-between gap-3",children:[e.jsxs("div",{className:"inline-flex items-center rounded-full border border-cyan-200/10 bg-[#020617]/60 p-1",children:[e.jsx("button",{type:"button",onClick:()=>x(p.id,-1),disabled:m,"aria-label":"Decrease quantity",className:"grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-wait disabled:opacity-50",children:e.jsx(ke,{size:12})}),e.jsx("span",{className:"min-w-[30px] text-center text-sm font-semibold text-white",children:p.quantity}),e.jsx("button",{type:"button",onClick:()=>x(p.id,1),disabled:m,"aria-label":"Increase quantity",className:"grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-wait disabled:opacity-50",children:e.jsx(je,{size:12})})]}),e.jsx("p",{className:"text-sm font-semibold text-white",children:k(y)})]})]})]})},p.id)})}):e.jsxs("div",{className:"flex h-full flex-col items-center justify-center text-center",children:[e.jsx("div",{className:"grid h-20 w-20 place-items-center rounded-full border border-cyan-200/10 bg-cyan-300/[0.04] text-cyan-200",children:e.jsx(te,{size:28})}),e.jsx("h3",{className:"mt-5 text-xl font-semibold tracking-[-0.03em] text-white",children:"Nothing here yet"}),e.jsx("p",{className:"mt-2 max-w-[260px] text-sm leading-6 text-slate-400",children:"Add products from the catalog to continue."}),e.jsx("button",{type:"button",onClick:()=>a(!1),className:"mt-6 rounded-full border border-cyan-200/15 bg-cyan-300/[0.06] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/15",children:"Continue Shopping"})]})}),S&&e.jsxs("div",{className:"border-t border-cyan-200/10 bg-[#040814]/95 px-5 py-5",children:[e.jsxs("div",{className:"mb-4 flex items-end justify-between gap-4",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] font-black uppercase tracking-[0.2em] text-slate-500",children:"Subtotal"}),e.jsx("p",{className:"mt-1 text-3xl font-semibold tracking-[-0.05em] text-white",children:k(u)})]}),e.jsx("p",{className:"pb-1 text-right text-xs leading-5 text-slate-500",children:"Taxes and shipping at checkout."})]}),e.jsxs("button",{type:"button",onClick:z,disabled:m,className:"relative w-full overflow-hidden rounded-2xl bg-cyan-300 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-80",children:[m&&e.jsx("span",{className:"absolute inset-0 animate-pulse bg-white/20"}),e.jsx("span",{className:"relative z-10",children:m?"Opening checkout...":"Checkout"})]}),e.jsx("button",{type:"button",onClick:()=>a(!1),disabled:m,className:"mt-3 w-full py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-cyan-200 disabled:cursor-wait disabled:opacity-50",children:"Continue Shopping"})]})]})]})})}export{Ve as A,We as C,be as L,R as S,V as U,T as X,Ye as a,te as b,De as c,ie as u};

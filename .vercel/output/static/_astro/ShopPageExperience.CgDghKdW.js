import{j as e}from"./jsx-runtime.u17CrQMm.js";import{u as E,S as F,X as $,b as M,A as L,a as B,c as R,C as H}from"./CartDrawer.8DeBdGRX.js";import{r as x}from"./index.CO9X3OiW.js";import{S as q}from"./sparkles.FYc2T57F.js";import{c as N}from"./createLucideIcon.C5w9TWC-.js";import{B as D,F as T}from"./flask-conical.CB-mdM9g.js";import{C as I}from"./chevron-down.BcHI5zz6.js";import{N as O,S as Y}from"./NewsletterSection.bcctnhHd.js";const X=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Q=N("eye",X);const U=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],G=N("funnel",U);const K=[["path",{d:"M10 5H3",key:"1qgfaw"}],["path",{d:"M12 19H3",key:"yhmn1j"}],["path",{d:"M14 3v4",key:"1sua03"}],["path",{d:"M16 17v4",key:"1q0r14"}],["path",{d:"M21 12h-9",key:"1o4lsq"}],["path",{d:"M21 19h-5",key:"1rlt1p"}],["path",{d:"M21 5h-7",key:"1oszz2"}],["path",{d:"M8 10v4",key:"tgpxqk"}],["path",{d:"M8 12H3",key:"a7s4jb"}]],V=N("sliders-horizontal",K);const W=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],Z=N("tag",W),J=["All Products","Accessories","Bacteriostatic Water","Cosmetic & Skin","Growth Hormone","Healing & Recovery","Longevity & Other","Metabolic Research","Research Blends","Research Peptides"],ee=[{label:"Under $50",min:0,max:50},{label:"$50–$100",min:50,max:100},{label:"$100–$200",min:100,max:200},{label:"$200+",min:200,max:1/0}],te=[{label:"Most Requested",value:"favorites",caption:"Popular picks",icon:q},{label:"Limited Deals",value:"sale",caption:"Active offers",icon:Z},{label:"Core Essentials",value:"exclusive",caption:"Selected catalog",icon:D},{label:"Next Drops",value:"coming-soon",caption:"Soon available",icon:T}],ae=[{label:"Most popular",value:"popular"},{label:"Price: Low to High",value:"price-asc"},{label:"Price: High to Low",value:"price-desc"},{label:"Newest",value:"newest"},{label:"A–Z",value:"az"}];function se(t){return t?.image||t?.images?.[0]?.src||t?.images?.[0]?.url||t?.featuredImage||"/placeholder-product.png"}function C(t){return t?.category?t.category:Array.isArray(t?.categories)&&t.categories.length>0?t.categories[0]?.name||t.categories[0]:"Research Peptides"}function k(t){const i=t?.price||t?.regular_price||t?.sale_price||t?.price_html||0;if(typeof i=="number")return i;const r=String(i).replace(/[^0-9.]/g,"");return Number(r||0)}function re(t){const i=Number(t||0);return Number.isNaN(i)?"$0":`$${i.toLocaleString(void 0,{maximumFractionDigits:2})}`}function _(t){const i=t?.tags||t?.labels||[];return Array.isArray(i)?i.map(r=>typeof r=="string"?r.toLowerCase():r?.name?.toLowerCase()).filter(Boolean):[]}function oe({product:t,addToCart:i}){const r=t?.name||t?.title||"Product",u=C(t),d=k(t),b=se(t),n=_(t),l=String(t?.stock_status||t?.stockStatus||"").toLowerCase().trim(),p=t?.manage_stock===!0||t?.manageStock===!0,y=t?.stock_quantity??t?.stockQuantity??t?.quantity??null,c=n.includes("coming soon")||n.includes("coming-soon")||l==="coming-soon",v=l==="outofstock"||l==="out-of-stock"||l==="out of stock"||l==="soldout"||l==="sold-out"||l==="sold out"||t?.in_stock===!1||t?.inStock===!1||t?.is_in_stock===!1||t?.isInStock===!1||t?.purchasable===!1||t?.is_purchasable===!1||n.includes("sold out")||n.includes("sold-out")||n.includes("out of stock")||n.includes("out-of-stock")||p&&Number(y)<=0,w=c||v,m=c?"Coming Soon":"Sold Out",h=t?.permalink||t?.url||t?.link||`/product/${t?.slug||t?.id}`,f=()=>{w||i({...t,id:t.id,name:r,price:d,image:b,category:u})};return e.jsxs("article",{className:"product-float-card group",children:[e.jsxs("div",{className:"product-float-visual",children:[e.jsx("div",{className:"visual-glow visual-glow-1"}),e.jsx("div",{className:"visual-glow visual-glow-2"}),e.jsx("div",{className:"visual-grid"}),e.jsx("span",{className:"product-float-pill",children:u}),e.jsx("a",{href:h,"aria-label":`View details for ${r}`,className:"product-float-eye",children:e.jsx(Q,{size:15})}),e.jsxs("div",{className:"product-float-image-wrap",children:[e.jsx("div",{className:"product-float-shadow"}),e.jsx("img",{src:b,alt:r,className:"product-float-image",loading:"lazy"})]})]}),e.jsxs("div",{className:"product-float-body",children:[e.jsx("h3",{className:"product-float-title",children:r}),e.jsx("p",{className:"product-float-subtitle",children:"Research use only · Batch documentation available"}),e.jsx("p",{className:"product-float-price",children:re(d)}),w?e.jsx("button",{type:"button",disabled:!0,"aria-disabled":"true",className:"product-float-button-disabled",children:m}):e.jsxs("button",{type:"button",onClick:f,className:"product-float-button",children:[e.jsx(M,{size:14}),e.jsx("span",{children:"Add to cart"}),e.jsx(L,{size:14,className:"product-float-arrow"})]})]})]})}function ie({products:t=[]}){const{addToCart:i}=E(),[r,u]=x.useState(""),[d,b]=x.useState("All Products"),[n,l]=x.useState(null),[p,y]=x.useState(null),[c,v]=x.useState("popular"),[w,m]=x.useState(!1),h=x.useMemo(()=>{let a=[...t];const j=r.trim().toLowerCase();return j&&(a=a.filter(s=>[s?.name,s?.title,s?.sku,C(s),...(s?.tags||[]).map(g=>typeof g=="string"?g:g?.name)].join(" ").toLowerCase().includes(j))),d!=="All Products"&&(a=a.filter(s=>C(s).toLowerCase()===d.toLowerCase())),n&&(a=a.filter(s=>{const o=k(s);return o>=n.min&&o<n.max})),p&&(a=a.filter(s=>{const o=_(s);return p==="sale"?o.includes("sale")||o.includes("on sale")||s?.sale_price||s?.onSale:p==="coming-soon"?o.includes("coming soon")||o.includes("coming-soon")||s?.stock_status==="coming-soon":o.includes(p)})),a.sort((s,o)=>{const g=k(s),z=k(o),A=String(s?.name||s?.title||""),P=String(o?.name||o?.title||"");return c==="price-asc"?g-z:c==="price-desc"?z-g:c==="az"?A.localeCompare(P):c==="newest"?new Date(o?.date_created||0)-new Date(s?.date_created||0):0}),a},[t,r,d,n,p,c]),f=()=>{u(""),b("All Products"),l(null),y(null),v("popular")},S=()=>e.jsxs("div",{className:"space-y-5",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[e.jsx("p",{className:"text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55",children:"Category"}),e.jsx("button",{type:"button",onClick:f,className:"text-[8px] font-black uppercase tracking-[0.16em] text-slate-600 transition hover:text-cyan-100",children:"Clear"})]}),e.jsx("div",{className:"space-y-1.5",children:J.map(a=>e.jsxs("button",{type:"button",onClick:()=>b(a),className:`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${d===a?"border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100":"border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"}`,children:[e.jsx("span",{className:"text-[12px] font-semibold leading-5",children:a}),d===a&&e.jsx("span",{className:"h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]"})]},a))})]}),e.jsxs("div",{children:[e.jsx("p",{className:"mb-3 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/55",children:"Price"}),e.jsx("div",{className:"space-y-1.5",children:ee.map(a=>e.jsx("button",{type:"button",onClick:()=>l(n?.label===a.label?null:a),className:`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${n?.label===a.label?"border-cyan-200/25 bg-cyan-300/[0.075] text-cyan-100":"border-white/8 bg-white/[0.018] text-slate-500 hover:border-cyan-200/15 hover:bg-cyan-300/[0.035] hover:text-slate-300"}`,children:e.jsx("span",{className:"text-[12px] font-semibold leading-5",children:a.label})},a.label))})]}),e.jsx("button",{type:"button",onClick:f,className:"w-full rounded-xl border border-cyan-200/10 bg-white/[0.025] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan-200/25 hover:bg-cyan-300/[0.055] hover:text-cyan-100",children:"Clear Filters"})]});return e.jsxs("section",{className:"relative px-5 py-10 text-white sm:px-6 sm:py-14 lg:py-16",children:[e.jsxs("div",{className:"mx-auto max-w-7xl",children:[e.jsxs("div",{className:"mb-8 flex max-w-4xl flex-col items-center text-center md:mx-0 md:items-start md:text-left lg:mb-10",children:[e.jsxs("div",{className:"mb-4 inline-flex items-center justify-center gap-3 md:justify-start",children:[e.jsx("span",{className:"h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.75)]"}),e.jsx("span",{className:"text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/65 sm:text-[10px] sm:tracking-[0.34em]",children:"Shop Catalog"})]}),e.jsxs("h2",{className:"mx-auto max-w-[390px] text-[40px] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:max-w-4xl sm:text-[56px] md:mx-0 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-0.06em]",children:["Browse research",e.jsx("span",{className:"block bg-gradient-to-r from-cyan-100 via-cyan-200 to-white bg-clip-text text-transparent",children:"products."})]}),e.jsx("p",{className:"mx-auto mt-5 max-w-xl text-[13.5px] leading-7 text-slate-300/65 sm:text-sm md:mx-0",children:"Filter products by category, price range, catalog status, and research collection."})]}),e.jsx("div",{className:"mb-7 grid grid-cols-2 gap-3 sm:mb-8 lg:grid-cols-4",children:te.map(a=>{const j=a.icon,s=p===a.value;return e.jsxs("button",{type:"button",onClick:()=>y(s?null:a.value),className:`group relative overflow-hidden rounded-[1.15rem] border px-3.5 py-3.5 text-left transition sm:rounded-[1.4rem] sm:px-5 sm:py-4 ${s?"border-cyan-200/30 bg-cyan-300/[0.075]":"border-cyan-200/10 bg-white/[0.018] hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"}`,children:[e.jsx("div",{className:"absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent"}),e.jsxs("div",{className:"flex items-center justify-between gap-3 sm:gap-4",children:[e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[13px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-base",children:a.label}),e.jsx("p",{className:"mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-cyan-200/55 sm:text-[10px] sm:tracking-[0.2em]",children:a.caption})]}),e.jsx("div",{className:`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition sm:h-10 sm:w-10 ${s?"border-cyan-200/25 bg-cyan-300/[0.1] text-cyan-100":"border-cyan-200/10 bg-[#121E2E] text-cyan-200/70 group-hover:text-cyan-100"}`,children:e.jsx(j,{size:16})})]})]},a.value)})}),e.jsxs("div",{className:"mb-6 grid gap-3 lg:flex lg:items-center lg:justify-between",children:[e.jsxs("div",{className:"relative w-full lg:max-w-xl",children:[e.jsx(F,{size:17,className:"pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/55"}),e.jsx("input",{value:r,onChange:a=>u(a.target.value),type:"search",placeholder:"Search products, category, SKU...",className:"min-h-[50px] w-full rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 pl-11 pr-4 text-[13px] font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-[#121E2E] sm:min-h-[52px] sm:text-sm"})]}),e.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-3 lg:flex",children:[e.jsxs("button",{type:"button",onClick:()=>m(!0),className:"inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/10 bg-white/[0.025] px-4 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:border-cyan-200/25 hover:text-cyan-100 lg:hidden",children:[e.jsx(G,{size:15}),"Filters"]}),e.jsxs("div",{className:"relative",children:[e.jsx("select",{value:c,onChange:a=>v(a.target.value),className:"min-h-[50px] w-full appearance-none rounded-2xl border border-cyan-200/10 bg-[#121E2E]/80 px-4 pr-10 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300 outline-none transition focus:border-cyan-200/35 sm:min-h-[52px] sm:px-5 sm:pr-11 sm:text-[10px] sm:tracking-[0.16em]",children:ae.map(a=>e.jsxs("option",{value:a.value,children:["Sort: ",a.label]},a.value))}),e.jsx(I,{size:15,className:"pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"})]})]})]}),e.jsxs("div",{className:"grid gap-8 lg:grid-cols-[280px_1fr]",children:[e.jsx("aside",{className:"hidden lg:block",children:e.jsxs("div",{className:"sticky top-24 rounded-[1.25rem] border border-cyan-200/10 bg-[#121E2E]/55 p-4",children:[e.jsxs("div",{className:"mb-4 flex items-center gap-3",children:[e.jsx("span",{className:"grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/10 bg-cyan-300/[0.055] text-cyan-200",children:e.jsx(V,{size:17})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-white",children:"Filters"}),e.jsx("p",{className:"text-xs text-slate-600",children:"Refine catalog results"})]})]}),e.jsx(S,{})]})}),e.jsxs("div",{children:[e.jsx("div",{className:"mb-5 flex items-center justify-between gap-4",children:e.jsxs("p",{className:"text-[12px] text-slate-500 sm:text-sm",children:["Showing"," ",e.jsx("span",{className:"font-semibold text-white",children:h.length})," ","of"," ",e.jsx("span",{className:"font-semibold text-white",children:t.length})," ","products"]})}),h.length===0?e.jsxs("div",{className:"rounded-[1.6rem] border border-cyan-200/10 bg-[#121E2E]/45 p-8 text-center sm:p-10",children:[e.jsx("p",{className:"text-xl font-semibold text-white",children:"No products found"}),e.jsx("p",{className:"mt-2 text-sm text-slate-500",children:"Try clearing filters or searching another term."}),e.jsx("button",{type:"button",onClick:f,className:"mt-6 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.08] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.14]",children:"Clear Filters"})]}):e.jsx("div",{className:"grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3",children:h.map(a=>e.jsx(oe,{product:a,addToCart:i},a.id))})]})]})]}),w&&e.jsxs("div",{className:"fixed inset-0 z-[90] lg:hidden",children:[e.jsx("button",{type:"button","aria-label":"Close filters",onClick:()=>m(!1),className:"absolute inset-0 bg-black/60 backdrop-blur-sm"}),e.jsxs("div",{className:"absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border border-cyan-200/10 bg-[#07111D] p-6 shadow-[0_-30px_80px_rgba(0,0,0,0.35)]",children:[e.jsxs("div",{className:"mb-6 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-lg font-semibold text-white",children:"Filters"}),e.jsx("p",{className:"text-sm text-slate-500",children:"Refine shop results"})]}),e.jsx("button",{type:"button",onClick:()=>m(!1),className:"grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/10 bg-white/[0.035] text-slate-400",children:e.jsx($,{size:18})})]}),e.jsx(S,{}),e.jsx("button",{type:"button",onClick:()=>m(!1),className:"mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950",children:"Apply Filters"})]})]}),e.jsx("style",{children:`
        .product-float-card {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(122, 197, 255, 0.12);
          background:
            linear-gradient(
              180deg,
              rgba(11, 23, 48, 0.98) 0%,
              rgba(6, 13, 29, 0.98) 100%
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 18px 50px rgba(0, 0, 0, 0.22);
          transition:
            transform 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease;
        }

        .product-float-card:hover {
          transform: translateY(-6px);
          border-color: rgba(122, 197, 255, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 24px 70px rgba(0, 0, 0, 0.34);
        }

        .product-float-visual {
          position: relative;
          height: 250px;
          overflow: hidden;
          border-bottom: 1px solid rgba(122, 197, 255, 0.08);
          background:
            radial-gradient(circle at 20% 25%, rgba(106, 218, 255, 0.08), transparent 30%),
            radial-gradient(circle at 80% 15%, rgba(79, 120, 255, 0.10), transparent 28%),
            linear-gradient(180deg, rgba(20, 36, 68, 0.96), rgba(10, 18, 37, 0.96));
        }

        .visual-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(122, 197, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 197, 255, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), transparent 100%);
          pointer-events: none;
        }

        .visual-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          pointer-events: none;
        }

        .visual-glow-1 {
          width: 140px;
          height: 140px;
          top: 25px;
          left: 30px;
          background: rgba(105, 226, 255, 0.14);
        }

        .visual-glow-2 {
          width: 180px;
          height: 180px;
          right: -20px;
          bottom: 10px;
          background: rgba(72, 111, 255, 0.14);
        }

        .product-float-pill {
          position: absolute;
          left: 16px;
          top: 16px;
          z-index: 5;
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.58);
          color: rgba(184, 233, 255, 0.92);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .product-float-eye {
          position: absolute;
          right: 16px;
          top: 16px;
          z-index: 6;
          display: grid;
          height: 38px;
          width: 38px;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(122, 197, 255, 0.14);
          background: rgba(2, 6, 23, 0.56);
          color: rgba(184, 233, 255, 0.82);
          backdrop-filter: blur(12px);
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease,
            color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .product-float-eye:hover {
          transform: translateY(-1px) scale(1.04);
          border-color: rgba(122, 197, 255, 0.3);
          background: rgba(103, 232, 249, 0.12);
          color: #e6fbff;
          box-shadow: 0 10px 28px rgba(103, 232, 249, 0.12);
        }

        .product-float-image-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 22px;
        }

        .product-float-shadow {
          position: absolute;
          bottom: 34px;
          width: 120px;
          height: 24px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(0,0,0,0.42) 0%,
            rgba(0,0,0,0.06) 70%,
            transparent 100%
          );
          filter: blur(7px);
          animation: floatShadow 4.4s ease-in-out infinite;
        }

        .product-float-image {
          position: relative;
          z-index: 2;
          width: auto;
          max-width: 82%;
          max-height: 195px;
          object-fit: contain;
          filter: drop-shadow(0 18px 26px rgba(0,0,0,0.22));
          animation: floatBottle 4.4s ease-in-out infinite;
          transition:
            transform 0.35s ease,
            filter 0.35s ease;
        }

        .product-float-card:hover .product-float-image {
          transform: scale(1.04);
          filter: drop-shadow(0 24px 34px rgba(0,0,0,0.30));
        }

        .product-float-body {
          padding: 18px;
        }

        .product-float-title {
          margin: 0;
          color: #f8fbff;
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -0.045em;
          font-weight: 750;
        }

        .product-float-subtitle {
          margin: 8px 0 0;
          color: rgba(148, 163, 184, 0.62);
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .product-float-price {
          margin: 10px 0 0;
          color: #7ee3ff;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .product-float-button,
        .product-float-button-disabled {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 46px;
          margin-top: 16px;
          padding: 0 16px;
          border-radius: 16px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .product-float-button {
          border: 1px solid rgba(122, 197, 255, 0.18);
          background: linear-gradient(
            180deg,
            rgba(105, 220, 255, 0.96),
            rgba(88, 196, 233, 0.96)
          );
          color: #041019;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
          box-shadow: 0 12px 30px rgba(79, 201, 245, 0.18);
        }

        .product-float-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(79, 201, 245, 0.25);
          background: linear-gradient(
            180deg,
            rgba(125, 230, 255, 1),
            rgba(99, 211, 245, 1)
          );
        }

        .product-float-button-disabled {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(148, 163, 184, 0.65);
          cursor: not-allowed;
        }

        .product-float-arrow {
          transition: transform 0.25s ease;
        }

        .product-float-button:hover .product-float-arrow {
          transform: translateX(2px);
        }

        @keyframes floatBottle {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-12px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        @keyframes floatShadow {
          0% {
            transform: scaleX(1);
            opacity: 0.34;
          }

          50% {
            transform: scaleX(0.84);
            opacity: 0.22;
          }

          100% {
            transform: scaleX(1);
            opacity: 0.34;
          }
        }

        @media (max-width: 768px) {
          .product-float-card {
            border-radius: 20px;
          }

          .product-float-visual {
            height: 165px;
          }

          .product-float-pill {
            left: 10px;
            top: 10px;
            min-height: 23px;
            max-width: calc(100% - 58px);
            padding: 0 7px;
            font-size: 7px;
            letter-spacing: 0.1em;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .product-float-eye {
            right: 10px;
            top: 10px;
            width: 32px;
            height: 32px;
            border-radius: 12px;
          }

          .product-float-image-wrap {
            padding: 18px 12px;
          }

          .product-float-image {
            max-height: 122px;
            max-width: 78%;
          }

          .product-float-shadow {
            bottom: 26px;
            width: 88px;
            height: 18px;
          }

          .visual-glow-1 {
            width: 110px;
            height: 110px;
            top: 28px;
            left: 16px;
          }

          .visual-glow-2 {
            width: 130px;
            height: 130px;
            right: -34px;
            bottom: 0;
          }

          .product-float-body {
            padding: 12px;
          }

          .product-float-title {
            display: -webkit-box;
            min-height: 36px;
            overflow: hidden;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-size: 15px;
            line-height: 1.12;
            letter-spacing: -0.035em;
          }

          .product-float-subtitle {
            display: none;
          }

          .product-float-price {
            margin-top: 8px;
            font-size: 18px;
          }

          .product-float-button,
          .product-float-button-disabled {
            min-height: 38px;
            margin-top: 11px;
            gap: 7px;
            border-radius: 13px;
            padding: 0 10px;
            font-size: 8px;
            letter-spacing: 0.12em;
          }

          .product-float-button svg,
          .product-float-button-disabled svg {
            width: 12px;
            height: 12px;
          }
        }

        @media (max-width: 420px) {
          .product-float-visual {
            height: 152px;
          }

          .product-float-image {
            max-height: 112px;
          }

          .product-float-title {
            font-size: 14px;
            min-height: 34px;
          }

          .product-float-price {
            font-size: 17px;
          }

          .product-float-button,
          .product-float-button-disabled {
            font-size: 7.5px;
            letter-spacing: 0.1em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .product-float-image,
          .product-float-shadow {
            animation: none;
          }
        }
      `})]})}function ue({products:t=[]}){return e.jsxs(B,{children:[e.jsx(R,{logoSrc:"/TRANSPARENCIA-03.png",transparentOnTop:!0}),e.jsxs("main",{className:"pt-[118px]",children:[e.jsx(ie,{products:t}),e.jsx(O,{}),e.jsx(Y,{})]}),e.jsx(H,{})]})}export{ue as default};

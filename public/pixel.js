// Phase One Labz browser pixels.
// Meta queda conservado para activarlo más adelante, pero está pausado.
var META_PIXEL_ENABLED = false;
var META_PIXEL_ID = "YOUR_META_PIXEL_ID";
var TIKTOK_PIXEL_ID = "D9UBLSRC77UDKVSV1D90";

(function (window, document) {
  "use strict";

  var sequence = 0;

  function hasPixelId(value) {
    return Boolean(value && !/^YOUR_[A-Z_]+$/.test(String(value)));
  }

  var metaConfigured = META_PIXEL_ENABLED && hasPixelId(META_PIXEL_ID);
  var tiktokConfigured = hasPixelId(TIKTOK_PIXEL_ID);

  // META PIXEL (comentado funcionalmente mediante META_PIXEL_ENABLED = false)
  if (metaConfigured) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js",
    );

    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  // TIKTOK PIXEL
  if (tiktokConfigured) {
    !(function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
        "holdConsent",
        "revokeConsent",
        "grantConsent",
      ];
      ttq.setAndDefer = function (target, method) {
        target[method] = function () {
          target.push(
            [method].concat(Array.prototype.slice.call(arguments, 0)),
          );
        };
      };
      for (var i = 0; i < ttq.methods.length; i += 1) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (pixelId) {
        var instance = ttq._i[pixelId] || [];
        for (var j = 0; j < ttq.methods.length; j += 1) {
          ttq.setAndDefer(instance, ttq.methods[j]);
        }
        return instance;
      };
      ttq.load = function (pixelId, options) {
        var source = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[pixelId] = [];
        ttq._i[pixelId]._u = source;
        ttq._t = ttq._t || {};
        ttq._t[pixelId] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[pixelId] = options || {};
        var script = d.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = source + "?sdkid=" + pixelId + "&lib=" + t;
        var firstScript = d.getElementsByTagName("script")[0];
        firstScript.parentNode.insertBefore(script, firstScript);
      };
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    })(window, document, "ttq");
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function itemId(item) {
    return String(
      (item &&
        (item.sku ||
          item.content_id ||
          item.product_id ||
          item.variation_id ||
          item.id ||
          item.name)) ||
        "",
    );
  }

  function itemName(item) {
    return String(
      (item && (item.name || item.content_name || item.product_name)) || "",
    );
  }

  function itemQuantity(item) {
    return Math.max(1, number(item && item.quantity, 1));
  }

  function itemPrice(item) {
    return Math.max(0, number(item && item.price, 0));
  }

  function eventId(prefix, key) {
    sequence += 1;
    return [prefix, key || "", Date.now(), sequence].join("_");
  }

  function metaTrack(eventName, payload, id) {
    if (!metaConfigured || typeof window.fbq !== "function") return;
    try {
      window.fbq("track", eventName, payload, { eventID: id });
    } catch (_error) {}
  }

  function tiktokTrack(eventName, payload) {
    if (
      !tiktokConfigured ||
      !window.ttq ||
      typeof window.ttq.track !== "function"
    ) {
      return;
    }
    try {
      window.ttq.track(eventName, payload);
    } catch (_error) {}
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .map(function (item) {
        var id = itemId(item);
        if (!id) return null;
        return {
          content_id: id,
          content_name: itemName(item),
          quantity: itemQuantity(item),
          price: itemPrice(item),
        };
      })
      .filter(Boolean);
  }

  function totalQuantity(items) {
    return items.reduce(function (total, item) {
      return total + item.quantity;
    }, 0);
  }

  // One P1 call fires both pixels. The shared event ID can be reused by a
  // future server-side event to deduplicate browser and server conversions.
  window.P1 = {
    configured: {
      meta: metaConfigured,
      tiktok: tiktokConfigured,
    },

    viewContent: function (options) {
      var o = options || {};
      var id = eventId("vc", itemId(o));
      var value = Math.max(0, number(o.price, 0));
      var payload = {
        content_name: itemName(o),
        content_ids: [itemId(o)].filter(Boolean),
        content_type: "product",
        value: value,
        currency: "USD",
      };

      metaTrack("ViewContent", payload, id);
      tiktokTrack("ViewContent", {
        content_id: itemId(o),
        content_name: itemName(o),
        content_type: "product",
        value: value,
        currency: "USD",
        event_id: id,
      });
      return id;
    },

    addToCart: function (options) {
      var o = options || {};
      var id = eventId("atc", itemId(o));
      var value = Math.max(0, number(o.value, number(o.price, 0)));
      var quantity = itemQuantity(o);
      var payload = {
        content_name: itemName(o),
        content_ids: [itemId(o)].filter(Boolean),
        contents: [
          {
            id: itemId(o),
            quantity: quantity,
            item_price: quantity ? value / quantity : value,
          },
        ],
        content_type: "product",
        value: value,
        currency: "USD",
      };

      metaTrack("AddToCart", payload, id);
      tiktokTrack("AddToCart", {
        content_id: itemId(o),
        content_name: itemName(o),
        content_type: "product",
        quantity: quantity,
        value: value,
        currency: "USD",
        event_id: id,
      });
      return id;
    },

    initiateCheckout: function (options) {
      var o = options || {};
      var items = normalizeItems(o.items);
      var id = eventId("ic", "");
      var value = Math.max(0, number(o.value, 0));
      var contentIds = items.map(function (item) {
        return item.content_id;
      });

      metaTrack(
        "InitiateCheckout",
        {
          value: value,
          currency: "USD",
          content_ids: contentIds.slice(0, 10),
          contents: items.slice(0, 10).map(function (item) {
            return {
              id: item.content_id,
              quantity: item.quantity,
              item_price: item.price,
            };
          }),
          content_type: "product",
          num_items: totalQuantity(items),
        },
        id,
      );
      tiktokTrack("InitiateCheckout", {
        contents: items.slice(0, 10),
        content_type: "product",
        value: value,
        currency: "USD",
        event_id: id,
      });
      return id;
    },

    purchase: function (options) {
      var o = options || {};
      var items = normalizeItems(o.items);
      var id = String(o.orderId || eventId("pur", ""));
      var value = Math.max(0, number(o.value, 0));
      var contentIds = items.map(function (item) {
        return item.content_id;
      });

      metaTrack(
        "Purchase",
        {
          value: value,
          currency: "USD",
          content_ids: contentIds,
          contents: items.map(function (item) {
            return {
              id: item.content_id,
              quantity: item.quantity,
              item_price: item.price,
            };
          }),
          content_type: "product",
          order_id: o.orderId,
          num_items: totalQuantity(items),
        },
        id,
      );
      tiktokTrack("CompletePayment", {
        contents: items,
        content_type: "product",
        value: value,
        currency: "USD",
        order_id: String(o.orderId || ""),
        event_id: id,
      });
      return id;
    },
  };

  if ((META_PIXEL_ENABLED && !metaConfigured) || !tiktokConfigured) {
    window.console.warn(
      "[Phase One] An enabled pixel is missing its ID in /pixel.js.",
    );
  }
})(window, document);

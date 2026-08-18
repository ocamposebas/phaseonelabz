// Phase One Labz TikTok browser tracking.
var TIKTOK_PIXEL_ID = "D9UBLSRC77UDKVSV1D90";

(function (window, document) {
  "use strict";

  var ATTRIBUTION_DAYS = 30;
  var ATTRIBUTION_KEYS = [
    "ttclid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ];
  var sequence = 0;

  function hasPixelId(value) {
    return Boolean(value && !/^YOUR_[A-Z_]+$/.test(String(value)));
  }

  function readCookie(key) {
    try {
      var match = document.cookie.match(
        new RegExp("(?:^|; )" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"),
      );
      return match ? decodeURIComponent(match[1]) : "";
    } catch (_error) {
      return "";
    }
  }

  function readStoredValue(key) {
    var cookieValue = readCookie(key);
    if (cookieValue) return cookieValue;

    try {
      return window.localStorage.getItem("po_" + key) || "";
    } catch (_error) {
      return "";
    }
  }

  function storeValue(key, value) {
    if (!value) return;

    try {
      document.cookie =
        key +
        "=" +
        encodeURIComponent(value) +
        ";path=/;max-age=" +
        60 * 60 * 24 * ATTRIBUTION_DAYS +
        ";SameSite=Lax;Secure";
    } catch (_error) {}

    try {
      window.localStorage.setItem("po_" + key, value);
    } catch (_error) {}
  }

  function captureAttribution() {
    try {
      var params = new URLSearchParams(window.location.search);
      var capturedClick = false;

      ATTRIBUTION_KEYS.forEach(function (key) {
        var value = params.get(key);
        if (!value) return;
        storeValue(key, value.slice(0, 500));
        if (key === "ttclid") capturedClick = true;
      });

      if (capturedClick) {
        var now = String(Date.now());
        storeValue("click_ts", now);
        storeValue("landing_url", window.location.href.slice(0, 1000));
      }
    } catch (_error) {
      // Attribution must never interfere with storefront access.
    }
  }

  captureAttribution();

  // Kept globally available so checkout can forward first-touch attribution.
  window.poGetClickId = readStoredValue;

  var tiktokConfigured = hasPixelId(TIKTOK_PIXEL_ID);

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
      for (var index = 0; index < ttq.methods.length; index += 1) {
        ttq.setAndDefer(ttq, ttq.methods[index]);
      }
      ttq.instance = function (pixelId) {
        var instance = ttq._i[pixelId] || [];
        for (var methodIndex = 0; methodIndex < ttq.methods.length; methodIndex += 1) {
          ttq.setAndDefer(instance, ttq.methods[methodIndex]);
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

  function tiktokTrack(eventName, payload, id) {
    if (
      !tiktokConfigured ||
      !window.ttq ||
      typeof window.ttq.track !== "function"
    ) {
      return;
    }

    try {
      window.ttq.track(eventName, payload, { event_id: id });
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

  window.P1 = {
    configured: {
      tiktok: tiktokConfigured,
    },

    getAttribution: function () {
      var attribution = {};
      ATTRIBUTION_KEYS.concat(["click_ts", "landing_url"]).forEach(
        function (key) {
          var value = readStoredValue(key);
          if (value) attribution[key] = value;
        },
      );

      var ttp = readCookie("_ttp");
      if (ttp) attribution.ttp = ttp;
      return attribution;
    },

    viewContent: function (options) {
      var o = options || {};
      var id = eventId("vc", itemId(o));
      var value = Math.max(0, number(o.price, 0));

      tiktokTrack(
        "ViewContent",
        {
          content_id: itemId(o),
          content_name: itemName(o),
          content_type: "product",
          value: value,
          currency: "USD",
        },
        id,
      );
      return id;
    },

    addToCart: function (options) {
      var o = options || {};
      var id = eventId("atc", itemId(o));
      var value = Math.max(0, number(o.value, number(o.price, 0)));

      tiktokTrack(
        "AddToCart",
        {
          content_id: itemId(o),
          content_name: itemName(o),
          content_type: "product",
          quantity: itemQuantity(o),
          value: value,
          currency: "USD",
        },
        id,
      );
      return id;
    },

    initiateCheckout: function (options) {
      var o = options || {};
      var items = normalizeItems(o.items);
      var id = eventId("ic", "");

      tiktokTrack(
        "InitiateCheckout",
        {
          contents: items.slice(0, 10),
          content_type: "product",
          value: Math.max(0, number(o.value, 0)),
          currency: "USD",
        },
        id,
      );
      return id;
    },

    purchase: function (options) {
      var o = options || {};
      var orderId = String(o.orderId || "").trim();
      if (!orderId) return "";

      var id = "po_" + orderId;
      tiktokTrack(
        "CompletePayment",
        {
          contents: normalizeItems(o.items),
          content_type: "product",
          value: Math.max(0, number(o.value, 0)),
          currency: String(o.currency || "USD").toUpperCase(),
          order_id: orderId,
        },
        id,
      );
      return id;
    },
  };

  if (!tiktokConfigured) {
    window.console.warn("[Phase One] TikTok Pixel is missing its ID in /pixel.js.");
  }
})(window, document);

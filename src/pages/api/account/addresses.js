export const prerender = false;

const REQUEST_TIMEOUT_MS = 10000;
const ADDRESS_CONFIG_CACHE_TTL_MS = 60 * 60 * 1000;
const AUTH_COOKIE_NAMES = ["lab_auth_token", "lab_token", "auth_token"];

const addressState = globalThis.__phaseoneAccountAddressState || {
  config: null,
  configExpiresAt: 0,
  configRequest: null,
  updateLocks: new Set(),
};

globalThis.__phaseoneAccountAddressState = addressState;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getWooConfig() {
  return {
    baseUrl: String(
      import.meta.env.WOOCOMMERCE_URL2 ||
        import.meta.env.WOOCOMMERCE_URL ||
        ""
    ).replace(/\/$/, ""),
    consumerKey: import.meta.env.WOOCOMMERCE_CONSUMER_KEY || "",
    consumerSecret: import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || "",
  };
}

function getToken(request, cookies) {
  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return (
    bearerToken ||
    AUTH_COOKIE_NAMES.map((name) => cookies.get(name)?.value).find(Boolean) ||
    ""
  );
}

function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");

  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function findCustomerId(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return 0;

  for (const key of ["user", "customer", "account", "profile", "data"]) {
    const id = findCustomerId(value[key], depth + 1);
    if (id) return id;
  }

  for (const key of ["customer_id", "user_id", "id"]) {
    const id = Number(value[key] || 0);
    if (Number.isInteger(id) && id > 0) return id;
  }

  return 0;
}

async function authenticateCustomer(baseUrl, token) {
  const response = await fetchWithTimeout(
    `${baseUrl}/wp-json/lab/v1/account-token`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Phase One Account Addresses",
      },
    }
  );
  const data = await readJsonResponse(response);
  const customerId = response.ok ? findCustomerId(data) : 0;

  if (!customerId) {
    const error = new Error("Your session has expired. Please sign in again.");
    error.status = 401;
    throw error;
  }

  return customerId;
}

function createWooApiUrl(config, path) {
  const url = new URL(`${config.baseUrl}/wp-json/wc/v3/${path}`);
  url.searchParams.set("consumer_key", config.consumerKey);
  url.searchParams.set("consumer_secret", config.consumerSecret);
  return url;
}

async function fetchWooJson(config, path, options = {}) {
  const response = await fetchWithTimeout(createWooApiUrl(config, path), {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "User-Agent": "Phase One Account Addresses",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      data?.message || "WooCommerce could not process the address."
    );
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  return data;
}

function normalizeStates(states) {
  if (Array.isArray(states)) {
    return states
      .map((state) => ({
        code: String(state?.code || "").toUpperCase(),
        name: String(state?.name || state?.code || ""),
      }))
      .filter((state) => state.code);
  }

  return Object.entries(states || {}).map(([code, name]) => ({
    code: String(code).toUpperCase(),
    name: String(name || code),
  }));
}

function getSetting(settings, id, fallback = "") {
  return settings.find((setting) => setting?.id === id)?.value ?? fallback;
}

function getAllowedCountryCodes(settings, countries, type) {
  const sellingMode = getSetting(
    settings,
    "woocommerce_allowed_countries",
    "all"
  );
  const sellingCountries = getSetting(
    settings,
    "woocommerce_specific_allowed_countries",
    []
  );
  let allowedCodes = countries.map((country) => country.code);

  if (sellingMode === "specific" && Array.isArray(sellingCountries)) {
    allowedCodes = sellingCountries;
  }

  if (sellingMode === "all_except" && Array.isArray(sellingCountries)) {
    const excluded = new Set(sellingCountries);
    allowedCodes = allowedCodes.filter((code) => !excluded.has(code));
  }

  if (type === "shipping") {
    const shippingMode = getSetting(
      settings,
      "woocommerce_ship_to_countries",
      ""
    );
    const shippingCountries = getSetting(
      settings,
      "woocommerce_specific_ship_to_countries",
      []
    );

    if (shippingMode === "specific" && Array.isArray(shippingCountries)) {
      allowedCodes = shippingCountries;
    } else if (shippingMode === "all") {
      allowedCodes = countries.map((country) => country.code);
    } else if (shippingMode === "all_except") {
      const excluded = new Set(
        Array.isArray(shippingCountries) ? shippingCountries : []
      );
      allowedCodes = countries
        .map((country) => country.code)
        .filter((code) => !excluded.has(code));
    }
  }

  return new Set(allowedCodes.map((code) => String(code).toUpperCase()));
}

async function loadAddressConfig(config) {
  if (addressState.config && Date.now() < addressState.configExpiresAt) {
    return addressState.config;
  }

  if (addressState.configRequest) return addressState.configRequest;

  addressState.configRequest = Promise.all([
    fetchWooJson(config, "data/countries"),
    fetchWooJson(config, "settings/general"),
  ])
    .then(([countryData, settings]) => {
      const allCountries = (Array.isArray(countryData) ? countryData : [])
        .map((country) => ({
          code: String(country?.code || "").toUpperCase(),
          name: String(country?.name || country?.code || ""),
          states: normalizeStates(country?.states),
        }))
        .filter((country) => country.code);
      const safeSettings = Array.isArray(settings) ? settings : [];
      const billingCodes = getAllowedCountryCodes(
        safeSettings,
        allCountries,
        "billing"
      );
      const shippingCodes = getAllowedCountryCodes(
        safeSettings,
        allCountries,
        "shipping"
      );
      const value = {
        billingCountries: allCountries.filter((country) =>
          billingCodes.has(country.code)
        ),
        shippingCountries: allCountries.filter((country) =>
          shippingCodes.has(country.code)
        ),
      };

      addressState.config = value;
      addressState.configExpiresAt = Date.now() + ADDRESS_CONFIG_CACHE_TTL_MS;
      return value;
    })
    .finally(() => {
      addressState.configRequest = null;
    });

  return addressState.configRequest;
}

function cleanField(value, maximum = 200) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function normalizeAddress(address = {}, type = "billing") {
  return {
    first_name: cleanField(address.first_name ?? address.firstName, 100),
    last_name: cleanField(address.last_name ?? address.lastName, 100),
    company: cleanField(address.company, 150),
    address_1: cleanField(address.address_1 ?? address.address1, 200),
    address_2: cleanField(address.address_2 ?? address.address2, 200),
    city: cleanField(address.city, 100),
    state: cleanField(address.state, 100).toUpperCase(),
    postcode: cleanField(address.postcode ?? address.zip, 20).toUpperCase(),
    country: cleanField(address.country, 2).toUpperCase(),
    ...(type === "billing"
      ? { phone: cleanField(address.phone, 40) }
      : {}),
  };
}

function isValidPostcode(postcode, country) {
  if (!postcode) return false;

  if (country === "US") return /^\d{5}(?:-\d{4})?$/.test(postcode);
  if (country === "CA") {
    return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ][ -]?\d[ABCEGHJ-NPRSTVWXYZ]\d$/i.test(
      postcode
    );
  }
  if (country === "GB") {
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode);
  }

  return postcode.length >= 2 && postcode.length <= 20;
}

function validateAddress(address, type, config) {
  const errors = {};
  const countries =
    type === "shipping"
      ? config.shippingCountries
      : config.billingCountries;
  const country = countries.find((item) => item.code === address.country);
  const required = {
    first_name: "First name is required.",
    last_name: "Last name is required.",
    address_1: "Address line 1 is required.",
    city: "City is required.",
    postcode: "ZIP / postal code is required.",
    country: "Country is required.",
  };

  Object.entries(required).forEach(([field, message]) => {
    if (!address[field]) errors[field] = message;
  });

  if (address.country && !country) {
    errors.country = "Select a country available in this store.";
  }

  if (country?.states?.length) {
    if (!address.state) {
      errors.state = "State is required.";
    } else if (!country.states.some((state) => state.code === address.state)) {
      errors.state = "Select a valid state for this country.";
    }
  }

  if (
    address.postcode &&
    address.country &&
    !isValidPostcode(address.postcode, address.country)
  ) {
    errors.postcode = "Enter a valid ZIP / postal code for this country.";
  }

  if (type === "billing") {
    const phoneDigits = address.phone.replace(/\D/g, "");
    if (!address.phone) {
      errors.phone = "Phone is required for the billing address.";
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors.phone = "Enter a valid phone number.";
    }
  }

  return errors;
}

function addressesMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function getRequestContext(request, cookies) {
  const config = getWooConfig();
  const token = getToken(request, cookies);

  if (!config.baseUrl || !config.consumerKey || !config.consumerSecret) {
    const error = new Error("The address service is not configured.");
    error.status = 500;
    throw error;
  }

  if (!token) {
    const error = new Error("Please sign in to manage your addresses.");
    error.status = 401;
    throw error;
  }

  const customerId = await authenticateCustomer(config.baseUrl, token);
  return { config, customerId };
}

function publicAddressPayload(customer, config) {
  return {
    success: true,
    billing: normalizeAddress(customer?.billing, "billing"),
    shipping: normalizeAddress(customer?.shipping, "shipping"),
    countries: {
      billing: config.billingCountries,
      shipping: config.shippingCountries,
    },
  };
}

export async function GET({ request, cookies }) {
  try {
    const { config, customerId } = await getRequestContext(request, cookies);
    const [customer, addressConfig] = await Promise.all([
      fetchWooJson(config, `customers/${customerId}`),
      loadAddressConfig(config),
    ]);

    return jsonResponse(publicAddressPayload(customer, addressConfig));
  } catch (error) {
    return jsonResponse(
      { success: false, error: error.message || "Could not load addresses." },
      error.status || 500
    );
  }
}

export async function PUT({ request, cookies }) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ success: false, error: "Invalid request origin." }, 403);
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return jsonResponse({ success: false, error: "Invalid request format." }, 415);
  }

  try {
    const body = await request.json().catch(() => null);
    const type = ["billing", "shipping", "both"].includes(body?.type)
      ? body.type
      : "";
    const hasSingleAddress =
      (type === "billing" || type === "shipping") &&
      body?.address &&
      typeof body.address === "object";
    const hasBothAddresses =
      type === "both" &&
      body?.billing &&
      typeof body.billing === "object" &&
      body?.shipping &&
      typeof body.shipping === "object";

    if (!type || (!hasSingleAddress && !hasBothAddresses)) {
      return jsonResponse({ success: false, error: "Invalid address request." }, 400);
    }

    const { config, customerId } = await getRequestContext(request, cookies);
    const lockKey = `${customerId}:addresses`;

    if (addressState.updateLocks.has(lockKey)) {
      return jsonResponse(
        { success: false, error: "This address is already being saved." },
        409
      );
    }

    addressState.updateLocks.add(lockKey);

    try {
      const [customer, addressConfig] = await Promise.all([
        fetchWooJson(config, `customers/${customerId}`),
        loadAddressConfig(config),
      ]);
      const addressesToSave =
        type === "both"
          ? {
              billing: normalizeAddress(body.billing, "billing"),
              shipping: normalizeAddress(body.shipping, "shipping"),
            }
          : { [type]: normalizeAddress(body.address, type) };
      const errors = {};

      Object.entries(addressesToSave).forEach(([addressType, address]) => {
        const addressErrors = validateAddress(
          address,
          addressType,
          addressConfig
        );

        if (Object.keys(addressErrors).length) {
          errors[addressType] = addressErrors;
        }
      });

      if (Object.keys(errors).length) {
        return jsonResponse(
          {
            success: false,
            error: "Review the highlighted address fields.",
            errors,
          },
          400
        );
      }

      const unchanged = Object.entries(addressesToSave).every(
        ([addressType, address]) =>
          addressesMatch(
            normalizeAddress(customer?.[addressType], addressType),
            address
          )
      );

      if (unchanged) {
        return jsonResponse({
          ...publicAddressPayload(customer, addressConfig),
          unchanged: true,
          message:
            type === "both"
              ? "Billing and shipping addresses are already up to date."
              : `${type === "billing" ? "Billing" : "Shipping"} address is already up to date.`,
        });
      }

      const updatedCustomer = await fetchWooJson(
        config,
        `customers/${customerId}`,
        { method: "PUT", body: addressesToSave }
      );

      return jsonResponse({
        ...publicAddressPayload(updatedCustomer, addressConfig),
        message:
          type === "both"
            ? "Billing and shipping addresses saved successfully."
            : `${type === "billing" ? "Billing" : "Shipping"} address saved successfully.`,
      });
    } finally {
      addressState.updateLocks.delete(lockKey);
    }
  } catch (error) {
    return jsonResponse(
      { success: false, error: error.message || "Could not save address." },
      error.status || 500
    );
  }
}

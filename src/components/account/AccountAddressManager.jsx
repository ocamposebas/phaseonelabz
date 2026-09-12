import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";

const ADDRESS_ENDPOINT = "/api/account/addresses";
const SHIPPING_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "state",
  "postcode",
  "country",
];
const ADDRESS_CONTENT_FIELDS = SHIPPING_FIELDS.filter(
  (field) => field !== "country",
);

const EMPTY_ADDRESS = {
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postcode: "",
  country: "US",
  phone: "",
};

function getSavedAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("lab_auth_token") || "";
}

function normalizeAddress(address = {}) {
  return { ...EMPTY_ADDRESS, ...address };
}

function normalizeAddressWithCountry(address, countries) {
  const normalized = normalizeAddress(address);

  if (!normalized.country && countries[0]?.code) {
    normalized.country = countries[0].code;
  }

  return normalized;
}

function getCountries(config = {}, type = "billing") {
  const countries = config?.[type];
  return Array.isArray(countries) ? countries : [];
}

function shippingIsEmpty(address) {
  return ADDRESS_CONTENT_FIELDS.every(
    (field) => !String(address?.[field] || "").trim(),
  );
}

function addressIsComplete(address, type = "shipping") {
  const requiredFields = [
    "first_name",
    "last_name",
    "address_1",
    "city",
    "state",
    "postcode",
    "country",
  ];

  if (type === "billing") requiredFields.push("phone");
  return requiredFields.every((field) => String(address?.[field] || "").trim());
}

function addressesAreTheSame(billing, shipping) {
  return SHIPPING_FIELDS.every(
    (field) => String(billing?.[field] || "") === String(shipping?.[field] || ""),
  );
}

function copyBillingToShipping(billing) {
  const shipping = { ...EMPTY_ADDRESS };

  SHIPPING_FIELDS.forEach((field) => {
    shipping[field] = billing?.[field] || "";
  });

  return shipping;
}

function AddressSummary({ address, emptyMessage, countryName }) {
  if (!addressIsComplete(address)) {
    return <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>;
  }

  const cityAndState = [address.city, address.state].filter(Boolean).join(", ");
  const locality = [cityAndState, address.postcode].filter(Boolean).join(" ");

  return (
    <address className="space-y-0.5 text-sm not-italic leading-5 text-slate-300">
      <p className="font-medium text-white">
        {[address.first_name, address.last_name].filter(Boolean).join(" ")}
      </p>
      <p>{address.address_1}</p>
      {address.address_2 && <p>{address.address_2}</p>}
      <p>{locality}</p>
      {address.country && <p>{countryName || address.country}</p>}
    </address>
  );
}

function AddressField({ label, error, optional = false, children }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-left">
      <span className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-300">
        {label}
        {optional && <span className="font-normal text-slate-600">Optional</span>}
      </span>
      {children}
      {error && <span className="text-[11px] leading-5 text-red-300">{error}</span>}
    </label>
  );
}

function AddressFields({ type, address, countries, errors, disabled, onChange }) {
  const isBilling = type === "billing";
  const selectedCountry = countries.find(
    (country) => country.code === address.country,
  );
  const states = Array.isArray(selectedCountry?.states)
    ? selectedCountry.states
    : [];
  const inputClass = (field) =>
    `min-h-11 w-full rounded-lg border bg-slate-950/65 px-3.5 text-sm text-white outline-none transition-colors placeholder:text-slate-700 disabled:cursor-wait disabled:opacity-65 ${
      errors?.[field]
        ? "border-red-300/55 focus:border-red-200"
        : "border-white/10 focus:border-cyan-200/45"
    }`;

  const updateField = (field, value) => {
    if (field === "country") {
      const nextCountry = countries.find((country) => country.code === value);
      const stateIsAvailable = nextCountry?.states?.some(
        (state) => state.code === address.state,
      );

      onChange({
        ...address,
        country: value,
        state: stateIsAvailable ? address.state : "",
      });
      return;
    }

    onChange({ ...address, [field]: value });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AddressField label="First name" error={errors?.first_name}>
        <input
          className={inputClass("first_name")}
          value={address.first_name}
          onChange={(event) => updateField("first_name", event.target.value)}
          autoComplete={`${type} given-name`}
          disabled={disabled}
          required
        />
      </AddressField>

      <AddressField label="Last name" error={errors?.last_name}>
        <input
          className={inputClass("last_name")}
          value={address.last_name}
          onChange={(event) => updateField("last_name", event.target.value)}
          autoComplete={`${type} family-name`}
          disabled={disabled}
          required
        />
      </AddressField>

      <div className="sm:col-span-2">
        <AddressField label="Address line 1" error={errors?.address_1}>
          <input
            className={inputClass("address_1")}
            value={address.address_1}
            onChange={(event) => updateField("address_1", event.target.value)}
            autoComplete={`${type} address-line1`}
            disabled={disabled}
            required
          />
        </AddressField>
      </div>

      <div className="sm:col-span-2">
        <AddressField label="Address line 2" error={errors?.address_2} optional>
          <input
            className={inputClass("address_2")}
            value={address.address_2}
            onChange={(event) => updateField("address_2", event.target.value)}
            autoComplete={`${type} address-line2`}
            disabled={disabled}
          />
        </AddressField>
      </div>

      <AddressField label="City" error={errors?.city}>
        <input
          className={inputClass("city")}
          value={address.city}
          onChange={(event) => updateField("city", event.target.value)}
          autoComplete={`${type} address-level2`}
          disabled={disabled}
          required
        />
      </AddressField>

      <AddressField label="Country" error={errors?.country}>
        <select
          className={inputClass("country")}
          value={address.country}
          onChange={(event) => updateField("country", event.target.value)}
          autoComplete={`${type} country`}
          disabled={disabled}
          required
        >
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </AddressField>

      <AddressField label="State" error={errors?.state}>
        {states.length ? (
          <select
            className={inputClass("state")}
            value={address.state}
            onChange={(event) => updateField("state", event.target.value)}
            autoComplete={`${type} address-level1`}
            disabled={disabled}
            required
          >
            <option value="">Select state</option>
            {states.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass("state")}
            value={address.state}
            onChange={(event) => updateField("state", event.target.value)}
            autoComplete={`${type} address-level1`}
            disabled={disabled}
          />
        )}
      </AddressField>

      <AddressField label="ZIP / Postal Code" error={errors?.postcode}>
        <input
          className={inputClass("postcode")}
          value={address.postcode}
          onChange={(event) => updateField("postcode", event.target.value)}
          autoComplete={`${type} postal-code`}
          inputMode="text"
          disabled={disabled}
          required
        />
      </AddressField>

      {isBilling && (
        <div className="sm:col-span-2">
          <AddressField label="Phone" error={errors?.phone}>
            <input
              className={inputClass("phone")}
              value={address.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              autoComplete="billing tel"
              inputMode="tel"
              disabled={disabled}
              required
            />
          </AddressField>
        </div>
      )}
    </div>
  );
}

export default function AccountAddressManager() {
  const savingRef = useRef(false);
  const editorRef = useRef(null);
  const [addresses, setAddresses] = useState({
    billing: EMPTY_ADDRESS,
    shipping: EMPTY_ADDRESS,
  });
  const [savedAddresses, setSavedAddresses] = useState({
    billing: EMPTY_ADDRESS,
    shipping: EMPTY_ADDRESS,
  });
  const [countries, setCountries] = useState({ billing: [], shipping: [] });
  const [activeType, setActiveType] = useState(null);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState({
    status: "idle",
    type: "",
    message: "",
    errors: {},
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAddresses() {
      try {
        const token = getSavedAuthToken();
        const response = await fetch(ADDRESS_ENDPOINT, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Could not load your addresses.");
        }

        const billingCountries = getCountries(data.countries, "billing");
        const shippingCountries = getCountries(data.countries, "shipping");
        const billing = normalizeAddressWithCountry(data.billing, billingCountries);
        const shipping = normalizeAddressWithCountry(data.shipping, shippingCountries);
        const useBillingForShipping =
          !shippingIsEmpty(data.shipping) &&
          addressIsComplete(billing, "billing") &&
          addressesAreTheSame(billing, shipping);

        setAddresses({ billing, shipping });
        setSavedAddresses({ billing, shipping });
        setSameAsBilling(useBillingForShipping);
        setCountries({ billing: billingCountries, shipping: shippingCountries });
        setLoadStatus("ready");
      } catch (error) {
        if (error?.name === "AbortError") return;
        setLoadStatus("error");
        setLoadError(error?.message || "Could not load your addresses.");
      }
    }

    loadAddresses();
    return () => controller.abort();
  }, []);

  const saving = saveState.status === "saving";
  const activeAddress = activeType ? addresses[activeType] : null;
  const activeCountries = activeType ? getCountries(countries, activeType) : [];
  const activeErrors = activeType ? saveState.errors?.[activeType] || {} : {};
  const saveLabel = useMemo(() => {
    if (saving) return "Saving address";
    if (sameAsBilling) return "Save both addresses";
    return `Save ${activeType || ""} address`;
  }, [activeType, sameAsBilling, saving]);

  const resetSaveState = () => {
    setSaveState({ status: "idle", type: "", message: "", errors: {} });
  };

  const updateAddress = (type, address) => {
    setAddresses((current) => ({
      ...current,
      [type]: address,
      ...(type === "billing" && sameAsBilling
        ? { shipping: copyBillingToShipping(address) }
        : {}),
    }));
    resetSaveState();
  };

  const saveAddress = async ({ forceBoth = false } = {}) => {
    if (savingRef.current || saving) return;

    const saveType = forceBoth || sameAsBilling ? "both" : activeType;
    if (!saveType) return false;
    const body =
      saveType === "both"
        ? {
            type: "both",
            billing: addresses.billing,
            shipping: copyBillingToShipping(addresses.billing),
          }
        : { type: saveType, address: addresses[saveType] };

    savingRef.current = true;
    setSaveState({
      status: "saving",
      type: saveType,
      message: "",
      errors: {},
    });

    try {
      const token = getSavedAuthToken();
      const response = await fetch(ADDRESS_ENDPOINT, {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        const nestedErrors = data?.errors || {};
        const hiddenShippingError =
          saveType === "both" ? Object.values(nestedErrors.shipping || {})[0] : "";

        setSaveState({
          status: "error",
          type: saveType,
          message:
            hiddenShippingError || data?.error || "Could not save this address.",
          errors: nestedErrors,
        });
        if (saveType === "both") setActiveType("billing");
        return false;
      }

      const billing = normalizeAddress(data.billing);
      const shipping = normalizeAddress(data.shipping);

      setAddresses({ billing, shipping });
      setSavedAddresses({ billing, shipping });
      if (saveType === "both") setSameAsBilling(true);
      setActiveType(null);
      setSaveState({
        status: "success",
        type: saveType,
        message: data.message || "Address saved successfully.",
        errors: {},
      });
      return true;
    } catch {
      setSaveState({
        status: "error",
        type: saveType,
        message: "Could not save this address. Please try again.",
        errors: {},
      });
      if (saveType === "both") setActiveType("billing");
      return false;
    } finally {
      savingRef.current = false;
    }
  };

  const toggleSameAsBilling = async (checked) => {
    resetSaveState();

    if (!checked) {
      setSameAsBilling(false);
      setActiveType("shipping");
      return;
    }

    if (!addressIsComplete(addresses.billing, "billing")) {
      setSameAsBilling(false);
      setActiveType("billing");
      setSaveState({
        status: "error",
        type: "billing",
        message: "Complete and save your billing address first.",
        errors: {},
      });
      return;
    }

    const previousShipping = addresses.shipping;
    setSameAsBilling(true);
    setAddresses((current) => ({
      ...current,
      shipping: copyBillingToShipping(current.billing),
    }));

    const saved = await saveAddress({ forceBoth: true });
    if (!saved) {
      setSameAsBilling(false);
      setAddresses((current) => ({ ...current, shipping: previousShipping }));
    }
  };

  const cancelEditing = () => {
    const savedAsSame =
      !shippingIsEmpty(savedAddresses.shipping) &&
      addressIsComplete(savedAddresses.billing, "billing") &&
      addressesAreTheSame(savedAddresses.billing, savedAddresses.shipping);

    setAddresses(savedAddresses);
    setSameAsBilling(savedAsSame);
    setActiveType(null);
    resetSaveState();
  };

  useEffect(() => {
    if (!activeType || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      editorRef.current?.querySelector("input:not([type='checkbox'])")?.focus();
    }, 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) cancelEditing();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeType, saving]);

  if (loadStatus === "loading") {
    return (
      <div className="mt-5 flex min-h-24 items-center justify-center rounded-xl border border-white/[0.075] bg-black/10 text-sm text-slate-400">
        <Loader2 size={17} className="mr-2 animate-spin text-cyan-200" />
        Loading saved addresses
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div
        role="alert"
        className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.055] p-4 text-sm text-red-200"
      >
        {loadError}
      </div>
    );
  }

  const billingCountryName = getCountries(countries, "billing").find(
    (country) => country.code === addresses.billing.country,
  )?.name;
  const visibleShippingAddress = sameAsBilling
    ? addresses.billing
    : addresses.shipping;
  const shippingCountryName = getCountries(countries, "shipping").find(
    (country) => country.code === visibleShippingAddress.country,
  )?.name;
  const billingSaved = addressIsComplete(addresses.billing, "billing");
  const shippingSaved = addressIsComplete(visibleShippingAddress);
  const addressEditor =
    activeType && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[1000]">
            <button
              type="button"
              aria-label="Close address editor"
              onClick={cancelEditing}
              disabled={saving}
              className="absolute inset-0 h-full w-full cursor-default bg-black/75 disabled:cursor-wait"
            />

            <aside
              ref={editorRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="address-editor-title"
              className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#050c18] shadow-[-24px_0_80px_rgba(0,0,0,0.45)]"
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAddress();
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <header className="flex items-start justify-between gap-5 border-b border-white/[0.08] px-5 py-5 sm:px-7 sm:py-6">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">
                      Address book
                    </p>
                    <h2 id="address-editor-title" className="text-xl font-semibold text-white">
                      {activeType === "billing" ? "Billing address" : "Shipping address"}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {sameAsBilling
                        ? "Changes will also update your shipping address."
                        : "Saved securely to your WooCommerce profile."}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 hover:border-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                  {saveState.status === "error" && saveState.message && (
                    <div
                      role="alert"
                      className="mb-5 flex items-start gap-2 rounded-lg border border-red-300/20 bg-red-300/[0.055] px-3.5 py-3 text-xs leading-5 text-red-200"
                    >
                      <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                      <span>{saveState.message}</span>
                    </div>
                  )}

                  <AddressFields
                    type={activeType}
                    address={activeAddress}
                    countries={activeCountries}
                    errors={activeErrors}
                    disabled={saving}
                    onChange={(address) => updateAddress(activeType, address)}
                  />
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-white/[0.08] bg-[#050c18] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelEditing}
                    className="min-h-11 rounded-lg border border-white/10 px-5 text-sm font-semibold text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {saveLabel}
                  </button>
                </footer>
              </form>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="mt-6 border-t border-white/[0.07] pt-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/65">
            Checkout defaults
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Your addresses</h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500 sm:text-right">
          Add them once and they will be ready for your next order.
        </p>
      </div>

      {saveState.message && !activeType && (
        <div
          role={saveState.status === "error" ? "alert" : "status"}
          className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-5 ${
            saveState.status === "error"
              ? "border-red-300/20 bg-red-300/[0.055] text-red-200"
              : "border-emerald-300/20 bg-emerald-300/[0.055] text-emerald-200"
          }`}
        >
          {saveState.status === "error" ? (
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          )}
          <span>{saveState.message}</span>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.09] bg-slate-950/25">
        <article className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
              <CreditCard size={19} />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Billing address</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  billingSaved
                    ? "bg-emerald-300/10 text-emerald-200"
                    : "bg-white/[0.06] text-slate-500"
                }`}>
                  {billingSaved ? "Saved" : "Not added"}
                </span>
              </div>
              <AddressSummary
                address={addresses.billing}
                countryName={billingCountryName}
                emptyMessage="Used for payment and order details."
              />
              {addresses.billing.phone && (
                <p className="mt-1 text-xs text-slate-500">{addresses.billing.phone}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setActiveType("billing");
              resetSaveState();
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-200 hover:border-cyan-200/30 hover:text-cyan-100 disabled:opacity-50 sm:w-auto"
          >
            {billingSaved ? <Pencil size={14} /> : <Plus size={15} />}
            {billingSaved ? "Edit" : "Add address"}
          </button>
        </article>

        <div className="mx-4 border-t border-white/[0.07] sm:mx-5" />

        <article className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200">
              <Truck size={19} />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Shipping address</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  shippingSaved
                    ? "bg-emerald-300/10 text-emerald-200"
                    : "bg-white/[0.06] text-slate-500"
                }`}>
                  {sameAsBilling
                    ? "Linked to billing"
                    : shippingSaved
                      ? "Saved"
                      : "Not added"}
                </span>
              </div>
              <AddressSummary
                address={visibleShippingAddress}
                countryName={shippingCountryName}
                emptyMessage="Choose where future orders should be delivered."
              />

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(event) => toggleSameAsBilling(event.target.checked)}
                  disabled={saving}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-white/10 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-slate-300 after:content-[''] peer-checked:bg-cyan-300 peer-checked:after:translate-x-5 peer-checked:after:bg-slate-950 peer-disabled:opacity-50" />
                <span className="text-xs text-slate-400">
                  Same as billing
                  {saving && saveState.type === "both" && " — Saving…"}
                </span>
              </label>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || sameAsBilling}
            onClick={() => {
              setActiveType("shipping");
              resetSaveState();
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-200 hover:border-violet-200/30 hover:text-violet-100 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
          >
            {shippingSaved ? <Pencil size={14} /> : <Plus size={15} />}
            {shippingSaved ? "Edit" : "Add address"}
          </button>
        </article>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-slate-600">
        <MapPin size={13} className="shrink-0" />
        Stored in your WooCommerce customer profile.
      </div>

      {addressEditor}
    </section>
  );
}

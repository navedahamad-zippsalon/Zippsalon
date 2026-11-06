const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const {
  addMenuTranslations,
  languageFromDatabase,
  languageToDatabase,
  getMissingTranslations,
  getTranslationReport,
  getTranslationCoverage,
  menuTranslationKey,
  translate,
  translationService,
  createTranslator,
} = require("../dist/modules/i18n/i18n.translations");
const { errorHandler } = require("../dist/common/middleware/error.middleware");
const {
  applyRequestLanguage,
  languageMiddleware,
} = require("../dist/modules/i18n/i18n.middleware");

test("supported language values round-trip through the database enum", () => {
  assert.equal(languageToDatabase("hi-en"), "hi_en");
  assert.equal(languageFromDatabase("hi_en"), "hi-en");
  assert.equal(languageFromDatabase("unknown"), "en");
});

test("translation fallback uses English, then the supplied label, then the key", () => {
  assert.equal(translate("hi", "navigation.dashboard"), "डैशबोर्ड");
  assert.equal(translate("hi-en", "common.no_data"), "Abhi koi data available nahi hai.");
  assert.equal(translate("hi", "navigation.custom_menu", "Custom menu"), "Custom menu");
  assert.equal(translate("hi", "navigation.custom_menu"), "navigation.custom_menu");
});

test("menu metadata keeps its original label and adds translated labels recursively", () => {
  const menu = addMenuTranslations({
    label: "Payment & Wallet",
    children: [{ label: "Payment Overview" }],
  }, "hi");
  assert.equal(menu.label, "Payment & Wallet");
  assert.equal(menu.key, "payment_wallet");
  assert.equal(menu.localizedLabel, "भुगतान और वॉलेट");
  assert.equal(menu.children[0].translationKey, "navigation.payment_overview");
  assert.equal(menuTranslationKey("Payment & Wallet"), "navigation.payment_wallet");
});

test("request language precedence is explicit, saved preference, cookie, Accept-Language", () => {
  const req = {
    headers: { "x-language": "hi-en", cookie: "language=hi", "accept-language": "en" },
    query: {},
  };
  applyRequestLanguage(req, "hi");
  assert.equal(req.language, "hi-en");

  req.headers["x-language"] = undefined;
  applyRequestLanguage(req, "hi");
  assert.equal(req.language, "hi");

  const cookieRequest = { headers: { cookie: "language=hi", "accept-language": "en" }, query: {} };
  applyRequestLanguage(cookieRequest, "en");
  assert.equal(cookieRequest.language, "en");

  const guestRequest = { headers: { cookie: "language=hi", "accept-language": "en" }, query: {} };
  applyRequestLanguage(guestRequest);
  assert.equal(guestRequest.language, "hi");
});

test("Accept-Language regions resolve to supported base languages", () => {
  const req = { headers: { "accept-language": "hi-IN, en;q=0.8" }, query: {} };
  applyRequestLanguage(req);
  assert.equal(req.language, "hi");
});

test("unsupported explicit request languages fall back to English", () => {
  const req = { headers: { "x-language": "fr" }, query: {} };
  let responseStatus;
  let responseBody;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };
  let calledNext = false;
  languageMiddleware(req, res, () => { calledNext = true; });
  assert.equal(responseStatus, undefined);
  assert.equal(responseBody, undefined);
  assert.equal(calledNext, true);
  assert.equal(req.language, "en");

  const requestWithSavedPreference = { headers: { "x-language": "fr" }, query: {} };
  applyRequestLanguage(requestWithSavedPreference, "hi-en");
  assert.equal(requestWithSavedPreference.language, "en");
});

test("translation catalogs include all keys in all languages and report full coverage", () => {
  assert.deepEqual(getMissingTranslations(), { en: [], hi: [], "hi-en": [] });
  assert.deepEqual(getTranslationCoverage(), { en: 100, hi: 100, "hi-en": 100 });
  const report = getTranslationReport();
  assert.ok(report.totalKeys > 100);
  for (const language of ["en", "hi", "hi-en"]) {
    assert.equal(report.languages[language].translated, report.totalKeys);
    assert.equal(report.languages[language].coverage, 100);
  }
});

test("translation interpolation preserves provided values and localizes Hinglish", () => {
  assert.equal(
    translationService.translate("customer.deleted_successfully", "hi-en", { name: "Aarav" }),
    "Customer Aarav successfully delete ho gaya hai.",
  );
  assert.equal(
    translationService.translate("validation.min_length", "hi-en", { field: "Name", min: 4 }),
    "Name mein kam se kam 4 characters hone chahiye.",
  );
  assert.equal(
    translationService.translatePlural("customer.found", 1, "hi-en"),
    "1 customer mila.",
  );
  assert.equal(
    translationService.translatePlural("customer.found", 5, "hi-en"),
    "5 customers mile.",
  );
});

test("missing Hinglish entries never fall back to English or default display labels", () => {
  assert.equal(translate("hi-en", "example.missing_paragraph", "English fallback text"), "example.missing_paragraph");
  const menu = addMenuTranslations({ label: "Untranslated label" }, "hi-en");
  assert.equal(menu.localizedLabel, "navigation.untranslated_label");
  assert.deepEqual(getMissingTranslations(), { en: [], hi: [], "hi-en": [] });
  assert.deepEqual(getTranslationReport().runtimeMissing["hi-en"], [
    "example.missing_paragraph",
    "navigation.untranslated_label",
  ]);
});

test("language resolution normalizes casing and keeps hi-en distinct from English", () => {
  const hinglish = { headers: { "x-language": "HI-EN", "accept-language": "en" }, query: {} };
  applyRequestLanguage(hinglish);
  assert.equal(hinglish.language, "hi-en");
  assert.equal(hinglish.t("errors.invalid_credentials"), "Login details sahi nahi hain.");
});

test("API error and validation payloads use localized messages and stable message keys", () => {
  const request = {
    language: "hi-en",
    t: createTranslator("hi-en"),
    path: "/api/v1/example",
    method: "POST",
  };
  const response = {
    statusCode: undefined,
    body: undefined,
    getHeader() { return "test-request"; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  errorHandler({ status: 401 }, request, response, () => {});
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.messageKey, "errors.unauthorized");
  assert.equal(response.body.message, "Aapko authorize nahi kiya gaya.");

  const invalidInput = z.object({ email: z.string().email() }).safeParse({ email: "not-an-email" });
  errorHandler(invalidInput.error, request, response, () => {});
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.errors[0].messageKey, "validation.invalid_email");
  assert.equal(response.body.errors[0].message, "Email address sahi nahi hai.");
});

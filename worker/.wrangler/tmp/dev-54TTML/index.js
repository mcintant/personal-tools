var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-yTepSt/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var CUSTOM_SONG_FREQUENCIES = ["must-know", "important-bass", "everyone-plays", "called-often", "obscure"];
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Upload-Name",
  "Access-Control-Max-Age": "86400"
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
__name(json, "json");
function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS }
  });
}
__name(text, "text");
function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}
__name(corsPreflight, "corsPreflight");
var src_default = {
  async fetch(request, env, _ctx) {
    if (request.method === "OPTIONS")
      return corsPreflight();
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/uploads" && request.method === "GET") {
        const stmt = env.DB.prepare(
          "SELECT id, name, created_at FROM csv_uploads ORDER BY created_at DESC LIMIT 500"
        );
        const { results } = await stmt.all();
        return json({ uploads: results });
      }
      const getOneMatch = path.match(/^\/api\/uploads\/(\d+)$/);
      if (getOneMatch && request.method === "GET") {
        const id = getOneMatch[1];
        const row = await env.DB.prepare("SELECT name, content FROM csv_uploads WHERE id = ?").bind(id).first();
        if (!row)
          return json({ error: "Not found" }, 404);
        return text(row.content, 200);
      }
      if (path === "/api/uploads" && request.method === "POST") {
        const name = request.headers.get("X-Upload-Name") || url.searchParams.get("name") || `upload-${Date.now()}.csv`;
        const content = await request.text();
        if (!content || content.length > 5 * 1024 * 1024) {
          return json({ error: "Empty body or too large (max 5MB)" }, 400);
        }
        const result = await env.DB.prepare(
          "INSERT INTO csv_uploads (name, content) VALUES (?, ?)"
        ).bind(name, content).run();
        const id = result.meta.last_row_id;
        return json({ id, name }, 201);
      }
      if (path === "/api/custom-songs" && request.method === "GET") {
        if (!env.CUSTOM_SONGS)
          return json({ songs: [] });
        try {
          const { results } = await env.CUSTOM_SONGS.prepare(
            "SELECT id, name, frequency, created_at FROM custom_songs ORDER BY name ASC"
          ).all();
          return json({ songs: results || [] });
        } catch (e) {
          return json({ error: "D1 list failed: " + (e && e.message) }, 500);
        }
      }
      if (path === "/api/custom-songs" && request.method === "POST") {
        if (!env.CUSTOM_SONGS)
          return json({ error: "Custom songs DB not configured" }, 503);
        let body;
        try {
          body = await request.json();
        } catch (e) {
          console.error("POST /api/custom-songs json parse:", e);
          return json({ error: "Invalid JSON" }, 400);
        }
        if (body == null || typeof body !== "object") {
          return json({ error: "Body must be a JSON object" }, 400);
        }
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const frequency = body.frequency && CUSTOM_SONG_FREQUENCIES.includes(body.frequency) ? body.frequency : "called-often";
        if (!name)
          return json({ error: "name is required" }, 400);
        try {
          const result = await env.CUSTOM_SONGS.prepare(
            "INSERT INTO custom_songs (name, frequency) VALUES (?, ?)"
          ).bind(name, frequency).run();
          const id = result.meta.last_row_id;
          return json({ id, name, frequency }, 201);
        } catch (e) {
          const msg = e && (e.message || String(e));
          console.error("POST /api/custom-songs D1 insert:", e);
          return json({ error: "D1 insert failed: " + msg }, 500);
        }
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      const msg = err && (err.message || String(err));
      console.error("Worker error:", err);
      return json({ error: msg || "Internal error" }, 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-yTepSt/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-yTepSt/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

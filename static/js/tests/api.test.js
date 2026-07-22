import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPlayNames, fetchPlay, savePlay } from "../api.js";

function fakeFetch(responses) {
  return async (url, options) => {
    const key = `${options?.method || "GET"} ${url}`;
    const response = responses[key];
    if (!response) throw new Error(`unexpected request: ${key}`);
    return { ok: true, json: async () => response };
  };
}

test("fetchPlayNames GETs /api/plays and returns the list", async () => {
  const names = await fetchPlayNames(fakeFetch({ "GET /api/plays": ["a", "b"] }));
  assert.deepEqual(names, ["a", "b"]);
});

test("fetchPlay GETs /api/plays/{name}", async () => {
  const play = await fetchPlay("foo", fakeFetch({ "GET /api/plays/foo": { name: "foo" } }));
  assert.deepEqual(play, { name: "foo" });
});

test("savePlay POSTs the play JSON to /api/plays/{name}", async () => {
  let capturedBody = null;
  const fetchImpl = async (url, options) => {
    assert.equal(url, "/api/plays/foo");
    assert.equal(options.method, "POST");
    capturedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ status: "saved" }) };
  };
  await savePlay("foo", { name: "foo" }, fetchImpl);
  assert.deepEqual(capturedBody, { name: "foo" });
});

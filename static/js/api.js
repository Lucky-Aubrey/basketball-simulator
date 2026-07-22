export async function fetchPlayNames(fetchImpl = fetch) {
  const resp = await fetchImpl("/api/plays");
  return resp.json();
}

export async function fetchPlay(name, fetchImpl = fetch) {
  const resp = await fetchImpl(`/api/plays/${name}`);
  return resp.json();
}

export async function savePlay(name, play, fetchImpl = fetch) {
  await fetchImpl(`/api/plays/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(play),
  });
}

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API = "https://api.vultr.com/v2";
const KEY = process.env.VULTR_API_KEY;
const MAX_INSTANCES = Math.max(1, Number(process.env.MAX_INSTANCES || 1));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function vultr(endpoint, options = {}) {
  if (!KEY) throw new Error("Token da Vultr não configurado no arquivo .env.");
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error || body.message || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

app.get("/api/status", (_req, res) => {
  res.json({ configured: Boolean(KEY), maxInstances: MAX_INSTANCES });
});

app.get("/api/regions", async (_req, res) => {
  try {
    const data = await vultr("/regions");
    res.json((data.regions || []).filter(r => r.status === "active").map(r => ({
      id: r.id, city: r.city, country: r.country, options: r.options || []
    })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/plans", async (req, res) => {
  try {
    const region = encodeURIComponent(req.query.region || "");
    if (!region) return res.status(400).json({ error: "Escolha uma região." });
    const data = await vultr(`/plans?type=all&per_page=100`);
    res.json((data.plans || []).filter(p => !p.locations || p.locations.includes(region)).map(p => ({
      id: p.id, vcpu: p.vcpu_count, ram: p.ram, disk: p.disk, bandwidth: p.bandwidth,
      monthly: p.monthly_cost, type: p.type
    })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/instances", async (_req, res) => {
  try {
    const data = await vultr("/instances?per_page=100");
    res.json((data.instances || []).map(i => ({
      id: i.id, label: i.label, os: i.os, status: i.status, main_ip: i.main_ip,
      region: i.region, plan: i.plan, vcpu: i.vcpu_count, ram: i.ram,
      date_created: i.date_created
    })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/instances", async (req, res) => {
  try {
    const { label, region, plan, osId } = req.body || {};
    if (![label, region, plan, osId].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Preencha nome, região, plano e sistema operacional." });
    }
    if (!/^[a-zA-Z0-9-]{3,32}$/.test(label)) {
      return res.status(400).json({ error: "Use um nome de 3 a 32 caracteres: letras, números ou hífen." });
    }
    const current = await vultr("/instances?per_page=100");
    if ((current.instances || []).length >= MAX_INSTANCES) {
      return res.status(403).json({ error: `Limite de segurança: máximo de ${MAX_INSTANCES} máquina(s).` });
    }
    const created = await vultr("/instances", {
      method: "POST",
      body: JSON.stringify({
        region, plan, os_id: Number(osId), label,
        enable_ipv6: true,
        backups: "disabled"
      })
    });
    res.status(201).json({ instance: created.instance });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/instances/:id/:action", async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!/^[a-f0-9-]+$/i.test(id)) return res.status(400).json({ error: "ID inválido." });
    const allowed = {
      reboot: { method: "POST", endpoint: `/instances/${id}/reboot` },
      start: { method: "POST", endpoint: `/instances/${id}/start` },
      halt: { method: "POST", endpoint: `/instances/${id}/halt` }
    };
    if (!allowed[action]) return res.status(400).json({ error: "Ação não permitida." });
    await vultr(allowed[action].endpoint, { method: allowed[action].method });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete("/api/instances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-f0-9-]+$/i.test(id)) return res.status(400).json({ error: "ID inválido." });
    await vultr(`/instances/${id}`, { method: "DELETE" });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/os", async (_req, res) => {
  try {
    const data = await vultr("/os?per_page=500");
    const allowed = (data.os || []).filter(o => /ubuntu|debian|windows server/i.test(o.name || ""));
    res.json(allowed.map(o => ({ id: o.id, name: o.name, arch: o.arch })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`CLOUD PC X em http://localhost:${PORT}`));

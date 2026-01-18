#!/usr/bin/env node
/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function parseItem(text) {
  const lines = text.split(/\r?\n/);
  const item = {};
  let currentKey = null;
  let sawStructured = false;

  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      item[currentKey] = match[2];
      sawStructured = true;
      continue;
    }
    if (currentKey && sawStructured) {
      item[currentKey] = `${item[currentKey]}\n${line}`;
    }
  }

  if (sawStructured && item.body) {
    if (typeof item.body === "string" && !item.body.includes("\n")) {
      item.body = item.body.replace(/\\n/g, "\n");
    }
    return item;
  }

  let metaStart = lines.length;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line.trim()) {
      if (metaStart !== lines.length) {
        metaStart = i;
      }
      continue;
    }
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (match) {
      item[match[1]] = match[2];
      metaStart = i;
      continue;
    }
    if (metaStart !== lines.length) {
      break;
    }
  }

  const bodyLines = lines.slice(0, metaStart);
  const body = bodyLines.join("\n").trim();
  if (body) {
    item.body = body;
  }
  return item;
}

function toIso(ms) {
  if (!ms) {
    return "";
  }
  const num = Number(ms);
  if (Number.isFinite(num) && num > 0) {
    return new Date(num).toISOString();
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeYaml(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function deriveTitle(body) {
  if (!body) {
    return "";
  }
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed.replace(/^#+\s+/, "").slice(0, 120);
    }
  }
  return "";
}

function extractSlugAndBody(body) {
  let slug = "";
  let cleaned = body || "";

  if (cleaned.startsWith("---")) {
    const end = cleaned.indexOf("\n---", 3);
    if (end !== -1) {
      const header = cleaned.slice(3, end).trim();
      const headerLines = header.split(/\r?\n/);
      for (const line of headerLines) {
        const match = line.match(/^slug:\s*(.+)$/i);
        if (match) {
          slug = match[1].trim();
        }
      }
      cleaned = cleaned.slice(end + 4).replace(/^\s+/, "");
    }
  }

  if (!slug) {
    const lines = cleaned.split(/\r?\n/).slice(0, 10);
    const matchLine = lines.find((line) => /^slug:\s*.+$/i.test(line));
    if (matchLine) {
      slug = matchLine.replace(/^slug:\s*/i, "").trim();
      cleaned = cleaned.replace(matchLine, "").replace(/^\s+/, "");
    }
  }

  return { slug, body: cleaned };
}

function convertMediaLinks(content) {
  if (!content) {
    return content;
  }
  let updated = content.replace(
    /(!?\[[^\]]*?\]\(([^)]+?\.(mp3|m4a|wav|ogg))\))/gi,
    (match, _full, url) => {
      if (match.startsWith("![")) {
        return match;
      }
      return `<audio controls src="${url}"></audio>`;
    },
  );
  updated = updated.replace(
    /(!?\[[^\]]*?\]\(([^)]+?\.(mp4|webm|ogg))\))/gi,
    (match, _full, url) => {
      if (match.startsWith("![")) {
        return match;
      }
      return `<video controls src="${url}"></video>`;
    },
  );
  return updated;
}

function buildSource(remote, bucketPath) {
  if (bucketPath && bucketPath.includes(":")) {
    return bucketPath;
  }
  if (!remote || !bucketPath) {
    return "";
  }
  return `${remote}:${bucketPath}`;
}

function applyRcloneEnv(env) {
  if (!env.RCLONE_REMOTE) {
    return;
  }
  const remoteKey = env.RCLONE_REMOTE.toUpperCase();
  if (env.RCLONE_TYPE) {
    process.env[`RCLONE_CONFIG_${remoteKey}_TYPE`] = env.RCLONE_TYPE;
  }
  if (env.RCLONE_ACCOUNT_ID) {
    process.env[`RCLONE_CONFIG_${remoteKey}_ACCOUNT`] = env.RCLONE_ACCOUNT_ID;
  }
  if (env.RCLONE_APP_KEY) {
    process.env[`RCLONE_CONFIG_${remoteKey}_KEY`] = env.RCLONE_APP_KEY;
  }
}

function mimeToExt(mime) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
  };
  return map[mime] || "";
}

async function main() {
  const env = loadEnv(path.join(repoRoot, ".env"));
  applyRcloneEnv(env);

  const source = buildSource(env.RCLONE_REMOTE, env.RCLONE_BUCKET_PATH);
  if (!source) {
    console.error("Missing RCLONE_REMOTE or RCLONE_BUCKET_PATH in .env");
    process.exit(1);
  }

  const syncDir = path.resolve(repoRoot, env.JOPLIN_SYNC_DIR || ".joplin-sync");
  const outputDir = path.resolve(repoRoot, env.JOPLIN_OUTPUT_DIR || "posts/joplin");
  const assetDir = path.resolve(repoRoot, env.JOPLIN_ASSET_DIR || "assets/joplin");

  ensureDir(syncDir);
  ensureDir(outputDir);
  ensureDir(assetDir);

  const rclone = spawnSync("rclone", ["sync", source, syncDir], {
    stdio: "inherit",
  });
  if (rclone.status !== 0) {
    console.error("rclone sync failed");
    process.exit(rclone.status || 1);
  }

  const entries = await fsp.readdir(syncDir, { withFileTypes: true });
  const itemFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".md"),
  );

  const items = [];
  for (const entry of itemFiles) {
    const filePath = path.join(syncDir, entry.name);
    const text = await fsp.readFile(filePath, "utf8");
    const item = parseItem(text);
    item.__file = entry.name;
    items.push(item);
  }

  const resourceMap = new Map();
  for (const item of items) {
    if (Number(item.type_) !== 4) {
      continue;
    }
    const id = item.id;
    if (!id) {
      continue;
    }
    const ext =
      (item.file_extension && `.${item.file_extension.replace(/^\./, "")}`) ||
      (item.filename && path.extname(item.filename)) ||
      mimeToExt(item.mime);
    resourceMap.set(id, { ext: ext || "" });
  }

  const resourceDir = path.join(syncDir, ".resource");
  const assetWebRoot = `/${path
    .relative(repoRoot, assetDir)
    .split(path.sep)
    .join("/")}`;

  const usedSlugs = new Set();
  const usedResourceIds = new Set();
  let noteCount = 0;
  let resourceCount = 0;

  for (const item of items) {
    if (Number(item.type_) !== 1) {
      continue;
    }
    if (Number(item.deleted_time) > 0) {
      continue;
    }
    if (Number(item.is_conflict) > 0) {
      continue;
    }
    if (Number(item.is_todo) > 0) {
      continue;
    }

    const bodyRaw = item.body || "";
    const inferredTitle = deriveTitle(bodyRaw);
    const title = item.title || inferredTitle || "Untitled";
    const { slug: bodySlug, body } = extractSlugAndBody(bodyRaw);
    let slug = bodySlug || slugify(title) || item.id || "note";
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${item.id ? item.id.slice(0, 6) : noteCount + 1}`;
    }
    usedSlugs.add(slug);

    const updated = toIso(item.updated_time) || toIso(item.created_time);
    const created = toIso(item.created_time);

    const withLinks = body.replace(/:\/*([a-f0-9]{32})/g, (match, id) => {
      const resource = resourceMap.get(id);
      const ext = resource ? resource.ext : "";
      usedResourceIds.add(id);
      return `${assetWebRoot}/${id}${ext || ""}`;
    });
    const withAudio = convertMediaLinks(withLinks);

    const frontMatterLines = [
      "---",
      `title: "${escapeYaml(title)}"`,
      `slug: "${escapeYaml(slug)}"`,
    ];
    if (updated) {
      frontMatterLines.push(`updated: "${updated}"`);
    }
    if (created) {
      frontMatterLines.push(`created: "${created}"`);
    }
    if (item.id) {
      frontMatterLines.push(`joplin_id: "${escapeYaml(item.id)}"`);
    }
    frontMatterLines.push("---", "");
    const frontMatter = frontMatterLines.join("\n");

    const outputPath = path.join(outputDir, `${slug}.md`);
    await fsp.writeFile(outputPath, `${frontMatter}${withAudio.trim()}\n`);
    noteCount += 1;
  }

  for (const [id, resource] of resourceMap.entries()) {
    if (!usedResourceIds.has(id)) {
      continue;
    }
    const src = path.join(resourceDir, id);
    const dest = path.join(assetDir, `${id}${resource.ext || ""}`);
    if (!fs.existsSync(src)) {
      continue;
    }
    await fsp.copyFile(src, dest);
    resourceCount += 1;
  }

  console.log(`Notes exported: ${noteCount}`);
  console.log(`Resources exported: ${resourceCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

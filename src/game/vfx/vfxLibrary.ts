const vfxModules = import.meta.glob("../../../vfx/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export type VfxAsset = {
  key: string;
  url: string;
  fileName: string;
  category: VfxCategory;
};

export type VfxCategory = "glow" | "ring" | "sigil" | "beam" | "burst" | "smoke" | "sparkle" | "shard" | "particle" | "unknown";

function fileNameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

function toKey(fileName: string): string {
  return `vfx-${fileName
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function categorize(fileName: string): VfxCategory {
  const value = fileName.toLowerCase();

  if (/(glow|light|aura|bloom|core|orb)/.test(value)) return "glow";
  if (/(ring|rune|circle|magic.?circle|mandala|seal.?ring)/.test(value)) return "ring";
  if (/(sigil|seal|symbol|mark|crest)/.test(value)) return "sigil";
  if (/(beam|ray|line|streak|laser)/.test(value)) return "beam";
  if (/(burst|flash|explosion|nova|flare)/.test(value)) return "burst";
  if (/(smoke|mist|fog|wisp|cloud)/.test(value)) return "smoke";
  if (/(spark|sparkle|star|twinkle)/.test(value)) return "sparkle";
  if (/(shard|fragment|crystal|piece|slash)/.test(value)) return "shard";
  if (/(dot|dust|particle|mote)/.test(value)) return "particle";

  return "unknown";
}

export const allVfxAssets: VfxAsset[] = Object.entries(vfxModules).map(([path, url]) => {
  const fileName = fileNameFromPath(path);
  return {
    key: toKey(fileName),
    url,
    fileName,
    category: categorize(fileName),
  };
});

export function getVfxAssetsByCategory(category: VfxCategory): VfxAsset[] {
  return allVfxAssets.filter((asset) => asset.category === category);
}

export function pickVfx(category: VfxCategory, fallbackIndex = 0): VfxAsset | undefined {
  const categorized = getVfxAssetsByCategory(category);
  if (categorized.length > 0) return categorized[fallbackIndex % categorized.length];
  return allVfxAssets[fallbackIndex % allVfxAssets.length];
}

export const vfx = {
  glow: () => pickVfx("glow", 0),
  core: () => pickVfx("glow", 1),
  ring: () => pickVfx("ring", 0),
  ringAlt: () => pickVfx("ring", 1),
  sigil: () => pickVfx("sigil", 0),
  beam: () => pickVfx("beam", 0),
  burst: () => pickVfx("burst", 0),
  smoke: () => pickVfx("smoke", 0),
  smokeAlt: () => pickVfx("smoke", 1),
  sparkle: () => pickVfx("sparkle", 0),
  shard: () => pickVfx("shard", 0),
  particle: () => pickVfx("particle", 0),
};

export function hasLoadedVfx(): boolean {
  return allVfxAssets.length > 0;
}

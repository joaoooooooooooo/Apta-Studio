"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRightIcon, SearchIcon } from "./EditorIcons";
const MEDIA_READ_ONLY = true;

type Collection = {
  _id: string;
  title: string;
  kind: string;
  assetIds?: string[];
  caseStudyMarketingIds?: string[];
  marketingPostIds?: string[];
  marketingVideoIds?: string[];
};
type Asset = {
  _id: string;
  _type: string;
  originalFilename?: string;
  asset?: {
    originalFilename?: string;
    url?: string;
    mimeType?: string;
    size?: number;
  };
  externalUrl?: string;
  externalMimeType?: string;
  title?: string;
  description?: string;
  altText?: string;
  tags?: string[];
  usageNotes?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  collections?: Collection[];
  caseStudy?: Pick<Collection, "_id" | "title">;
};
const mediaTypes = [
  { value: "all", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;
const kindLabel: Record<string, string> = {
  caseStudy: "Case Studies",
  branding: "Agency Branding",
  marketing: "Marketing",
};
const mainFolders = ["caseStudy", "branding", "marketing"] as const;
const marketingSectionLabel = { posts: "Marketing Posts", videos: "Marketing Videos" };
function isMarketingAsset(asset: Asset, collections: Collection[]) {
  return collections.some((collection) => collection.kind === "marketing" &&
    (collection.marketingPostIds?.includes(asset._id) || collection.marketingVideoIds?.includes(asset._id)));
}
function isCaseMarketingAsset(asset: Asset, caseId: string, collections: Collection[]) {
  return Boolean(collections.find((collection) => collection._id === caseId)
    ?.caseStudyMarketingIds?.includes(asset._id));
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [query, setQuery] = useState(""),
    [mediaType, setMediaType] = useState<"all" | "image" | "video">("all"),
    [activeFolder, setActiveFolder] = useState<string | null>(null),
    [showAllAssets, setShowAllAssets] = useState(false),
    [selectedCollection, setSelectedCollection] = useState<string | null>(null),
    [caseSection, setCaseSection] = useState<"media" | "marketing" | null>(null),
    [marketingSection, setMarketingSection] = useState<"posts" | "videos" | null>(null),
    [openSidebarFolder, setOpenSidebarFolder] = useState<string | null>(null),
    [sidebarQuery, setSidebarQuery] = useState(""),
    [selected, setSelected] = useState<Asset | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [copiedId, setCopiedId] = useState<string | null>(null),
    [copyStatus, setCopyStatus] = useState(""),
    [uploading, setUploading] = useState(false),
    [newCollection, setNewCollection] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function copyImage(asset: Asset) {
    const url = asset.asset?.url;
    if (!url) return;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Image copying is unavailable in this browser");
      }
      const response = await fetch(
        `/api/media/copy-image?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) throw new Error("Unable to fetch this image");
      const image = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": image }),
      ]);
      setCopiedId(asset._id);
      setCopyStatus(`Copied ${asset.title || "image"} to clipboard`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to copy image";
      setCopyStatus(message);
      setError(message);
    }
  }
  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/media", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to load media");
    else {
      setAssets((data.assets || []).map((asset: Asset) => asset.asset || !asset.externalUrl
        ? asset
        : {
          ...asset,
          asset: {
            url: asset.externalUrl,
            mimeType: asset.externalMimeType || "video/mp4",
            originalFilename: asset.title,
          },
        }));
      setCollections(data.collections || []);
      setError("");
    }
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      assets.filter((asset) => {
        const haystack = [
          asset.title,
          asset.originalFilename,
          asset.description,
          asset.altText,
          ...(asset.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!query || haystack.includes(query.toLowerCase())) &&
          (mediaType === "all" || asset.asset?.mimeType?.startsWith(`${mediaType}/`)) &&
          (!marketingSection || collections.some((collection) => collection.kind === "marketing" &&
            (marketingSection === "videos" ? collection.marketingVideoIds : collection.marketingPostIds)?.includes(asset._id))) &&
          (!selectedCollection || (caseSection === "marketing"
            ? isCaseMarketingAsset(asset, selectedCollection, collections)
            : asset.collections?.some((c) => c._id === selectedCollection))) &&
          (showAllAssets || activeFolder !== "branding" || Boolean(asset.collections?.some((c) => c.kind === "branding")))
        );
      }),
    [assets, activeFolder, caseSection, collections, marketingSection, mediaType, query, selectedCollection, showAllAssets],
  );
  const collectionFolders = useMemo(() => {
    const grouped = new Map<string, Collection[]>();
    for (const collection of collections) {
      const folder = collection.kind || "other";
      if (mainFolders.includes(folder as typeof mainFolders[number]))
        grouped.set(folder, [...(grouped.get(folder) || []), collection]);
    }
    return mainFolders.map((folder) => [folder, grouped.get(folder) || []] as const);
  }, [collections]);
  const sidebarSearch = sidebarQuery.trim().toLowerCase();
  const visibleFolders = collectionFolders
    .map(([folder, items]) => {
      const matchingFolder = (kindLabel[folder] || folder).toLowerCase().includes(sidebarSearch);
      return [folder, sidebarSearch && !matchingFolder
        ? items.filter((item) => item.title.toLowerCase().includes(sidebarSearch))
        : items] as const;
    })
    .filter(([folder, items]) => !sidebarSearch || (kindLabel[folder] || folder).toLowerCase().includes(sidebarSearch) || items.length > 0);
  const activeCollection = collections.find((c) => c._id === selectedCollection);
  const isCaseStudy = activeCollection?.kind === "caseStudy";
  const caseMediaCount = assets.filter((asset) => asset.collections?.some((c) => c._id === selectedCollection)).length;
  const caseMarketingCount = collections.find((collection) => collection._id === selectedCollection)?.caseStudyMarketingIds?.length || 0;
  const marketingCollections = collections.filter((collection) => collection.kind === "marketing");
  const marketingPostCount = marketingCollections.reduce((count, collection) => count + (collection.marketingPostIds?.length || 0), 0);
  const marketingVideoCount = marketingCollections.reduce((count, collection) => count + (collection.marketingVideoIds?.length || 0), 0);
  const brandingCount = assets.filter((asset) => asset.collections?.some((collection) => collection.kind === "branding")).length;
  const folderCollections = collectionFolders.find(([folder]) => folder === activeFolder)?.[1] || [];
  function openRoot() {
    setActiveFolder(null);
    setSelectedCollection(null);
    setCaseSection(null);
    setMarketingSection(null);
    setShowAllAssets(false);
  }
  function openFolder(folder: string) {
    setActiveFolder(folder);
    setSelectedCollection(null);
    setCaseSection(null);
    setMarketingSection(null);
    setShowAllAssets(false);
  }
  function openCollection(collection: Collection) {
    setActiveFolder(collection.kind || "other");
    setOpenSidebarFolder(collection.kind || "other");
    setSelectedCollection(collection._id);
    setCaseSection(null);
    setMarketingSection(null);
    setMediaType("all");
    setQuery("");
    setShowAllAssets(false);
  }
  function openMarketingSection(section: "posts" | "videos") {
    setActiveFolder("marketing");
    setOpenSidebarFolder("marketing");
    setSelectedCollection(null);
    setMarketingSection(section);
    setMediaType("all");
    setQuery("");
    setShowAllAssets(false);
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      let uploadCollectionId = selectedCollection && caseSection !== "marketing" ? selectedCollection : null;
      if (activeFolder === "branding") {
        let brandingCollection = collections.find((collection) => collection.kind === "branding");
        if (!brandingCollection) {
          const response = await fetch("/api/media/collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Agency Branding", kind: "branding" }),
          });
          if (!response.ok) throw new Error("Unable to create Agency Branding");
          const created = await response.json() as { results?: { id?: string }[] };
          const id = created.results?.[0]?.id;
          if (!id) throw new Error("Unable to find Agency Branding");
          brandingCollection = { _id: id, title: "Agency Branding", kind: "branding" };
        }
        uploadCollectionId = brandingCollection._id;
      }
      const isMarketingUpload = Boolean(marketingSection || caseSection === "marketing");
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
          throw new Error("Upload an image or video.");
        if (marketingSection === "videos" && !file.type.startsWith("video/"))
          throw new Error("Marketing Videos accepts videos only.");
        if (marketingSection === "posts" && !file.type.startsWith("image/"))
          throw new Error("Marketing Posts accepts images only.");
        const form = new FormData();
        form.append("file", file);
        form.append(
          "collectionIds",
          JSON.stringify(uploadCollectionId ? [uploadCollectionId] : []),
        );
        if (isMarketingUpload) form.append("isMarketing", "true");
        if (selectedCollection && activeFolder === "caseStudy") form.append("caseStudyId", selectedCollection);
        const response = await fetch("/api/media", {
          method: "POST",
          body: form,
        });
        if (!response.ok)
          throw new Error((await response.json()).error || "Upload failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  }
  async function createCollection() {
    if (!newCollection.trim()) return;
    const response = await fetch("/api/media/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newCollection,
        kind: activeFolder || "marketing",
      }),
    });
    if (!response.ok)
      setError((await response.json()).error || "Unable to create collection");
    else {
      setNewCollection("");
      await load();
    }
  }
  return (
    <main className="media-page">
      <header className="media-header">
        <nav className="media-breadcrumb" aria-label="Media location">
          <button type="button" onClick={openRoot}>Media library</button>
          {(activeFolder || showAllAssets) && <span aria-hidden="true">›</span>}
          {showAllAssets ? (
            <span aria-current="page">All media</span>
          ) : activeFolder ? (
            <>
              {activeCollection || marketingSection ? (
                <button type="button" onClick={() => openFolder(activeFolder)}>
                  {kindLabel[activeFolder] || activeFolder}
                </button>
              ) : (
                <span aria-current="page">{kindLabel[activeFolder] || activeFolder}</span>
              )}
              {marketingSection && <><span aria-hidden="true">›</span><span aria-current="page">{marketingSectionLabel[marketingSection]}</span></>}
              {activeCollection && (
                <>
                  <span aria-hidden="true">›</span>
                  {caseSection ? (
                    <>
                      <button type="button" onClick={() => setCaseSection(null)}>{activeCollection.title}</button>
                      <span aria-hidden="true">›</span>
                      <span aria-current="page">{caseSection === "marketing" ? "Case Study Marketing" : "Case Study Media"}</span>
                    </>
                  ) : <span aria-current="page">{activeCollection.title}</span>}
                </>
              )}
            </>
          ) : null}
        </nav>
        <div className="media-actions">
          {!MEDIA_READ_ONLY && (showAllAssets || (activeFolder === "caseStudy" && selectedCollection && caseSection) ||
            (activeFolder === "marketing" && marketingSection) || activeFolder === "branding") && <button
            className="btn"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload media"}
          </button>}
          {!MEDIA_READ_ONLY && <input
            ref={inputRef}
            hidden
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />}
        </div>
      </header>
      <div className="media-layout">
        <aside className="media-sidebar">
          <label className="searchbox media-sidebar-search">
            <span className="ico"><SearchIcon size={13} /></span>
            <input
              type="search"
              placeholder="Search collections"
              aria-label="Search collections"
              value={sidebarQuery}
              onChange={(event) => setSidebarQuery(event.target.value)}
            />
          </label>
          <div className="media-collection-list">
            <button
              className={`tpl-item media-collection ${showAllAssets ? "active" : ""}`}
              onClick={() => {
                setActiveFolder(null);
                setSelectedCollection(null);
                setCaseSection(null);
                setMarketingSection(null);
                setShowAllAssets(true);
              }}
            >
              <span>All media</span>
              <span className="tpl-group-count">{assets.length}</span>
            </button>
            {visibleFolders.map(([folder, items]) => {
              const isOpen = folder !== "branding" && (Boolean(sidebarSearch) || openSidebarFolder === folder);
              const panelId = `media-sidebar-folder-${folder.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              return (
                <div className={`media-folder tpl-accordion ${isOpen ? "open" : ""}`} key={folder}>
                    <button
                      className={`tpl-item media-folder-open ${isOpen || activeFolder === folder ? "active" : ""}`}
                      type="button"
                      aria-expanded={folder === "branding" ? undefined : isOpen}
                      aria-controls={folder === "branding" ? undefined : panelId}
                      onClick={() => {
                        if (sidebarSearch) setSidebarQuery("");
                        setOpenSidebarFolder(isOpen && !sidebarSearch ? null : folder);
                        openFolder(folder);
                      }}
                    >
                      <span className="media-folder-name">{kindLabel[folder] || folder}</span>
                      <span className="tpl-group-count">{folder === "marketing" ? 2 : folder === "branding" ? brandingCount : items.length}</span>
                      {folder !== "branding" && <span className="tpl-accordion-chevron" aria-hidden="true"><ChevronRightIcon size={12} /></span>}
                    </button>
                  {isOpen && <div id={panelId} className="media-folder-collections">
                      {folder === "marketing" ? (["posts", "videos"] as const).map((section) => (
                        <button
                          key={section}
                          className={`tpl-item media-collection ${marketingSection === section ? "active" : ""}`}
                          onClick={() => openMarketingSection(section)}
                        >
                          <span>{marketingSectionLabel[section]}</span>
                          <span className="tpl-group-count">{section === "videos" ? marketingVideoCount : marketingPostCount}</span>
                        </button>
                      )) : items.map((c) => (
                        <button
                          key={c._id}
                          className={`tpl-item media-collection ${selectedCollection === c._id ? "active" : ""}`}
                          onClick={() => openCollection(c)}
                        >
                          <span>{c.title}</span>
                          <span className="tpl-group-count">{c.assetIds?.length || 0}</span>
                        </button>
                      ))}
                  </div>}
                </div>
              );
            })}
            {sidebarSearch && visibleFolders.length === 0 && (
              <p className="media-sidebar-empty">No collections found</p>
            )}
          </div>
          {!MEDIA_READ_ONLY && activeFolder === "caseStudy" && <div className="media-new-collection">
            <input
              className="field"
              placeholder="New collection"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createCollection();
              }}
            />
            <button
              className="btn full"
              onClick={() => void createCollection()}
            >
              Create collection
            </button>
          </div>}
        </aside>
        <section className="media-content">
          {(activeFolder || !showAllAssets) && !selectedCollection && !marketingSection && (
            <div className="media-explorer-heading">
              <h1>{activeFolder ? kindLabel[activeFolder] || activeFolder : "Folders"}</h1>
              <span>{activeFolder ? activeFolder === "marketing" ? "2 folders" : activeFolder === "branding" ? `${brandingCount} assets` : `${folderCollections.length} case studies` : "3 collections"}</span>
            </div>
          )}
          {(marketingSection || activeFolder === "branding" || (selectedCollection && (!isCaseStudy || caseSection)) || showAllAssets) && (
          <div className="media-toolbar">
            <label className="media-search">
              <input aria-label="Search assets" placeholder="Search assets, clients, tags…"
                value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="segmented media-type-tabs" role="group" aria-label="Media type">
              {mediaTypes.map((item) => (
                <button key={item.value} type="button" className={`seg ${mediaType === item.value ? "active" : ""}`}
                  aria-pressed={mediaType === item.value} onClick={() => setMediaType(item.value)}>{item.label}</button>
              ))}
            </div>
            {assets.length > 0 && <a className="btn media-download-all" href="/api/media/download">Download All</a>}
            <span className="media-copy-status" role="status">{copyStatus}</span>
          </div>
          )}
          {error && (
            <div className="media-error" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <div className="media-empty">Loading your library…</div>
          ) : !activeFolder && !showAllAssets ? (
            <div className="media-explorer-grid">
              {collectionFolders.map(([folder, items]) => (
                <button className="media-explorer-card" key={folder} onClick={() => openFolder(folder)}>
                  <div className="media-explorer-preview media-explorer-folder-icon" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none"><path d="M7 16h19l6 7h25v27H7V16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </div>
                  <strong>{kindLabel[folder] || folder}</strong>
                  <small>{folder === "marketing" ? "2 folders" : folder === "branding" ? `${brandingCount} assets` : `${items.length} case studies`}</small>
                </button>
              ))}
            </div>
          ) : activeFolder === "marketing" && !marketingSection ? (
            <div className="media-explorer-grid">
              {(["posts", "videos"] as const).map((section) => (
                <button className="media-explorer-card" key={section} onClick={() => openMarketingSection(section)}>
                  <div className="media-explorer-preview media-explorer-folder-icon" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none"><path d="M7 16h19l6 7h25v27H7V16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </div>
                  <strong>{marketingSectionLabel[section]}</strong>
                  <small>{section === "videos" ? marketingVideoCount : marketingPostCount} assets</small>
                </button>
              ))}
            </div>
          ) : activeFolder === "caseStudy" && !selectedCollection ? (
            <div className="media-explorer-grid">
              {folderCollections.map((collection) => {
                const preview = assets.find((asset) =>
                  asset.collections?.some((item) => item._id === collection._id) &&
                  asset.asset?.mimeType?.startsWith("image/"),
                );
                return (
                  <button className="media-explorer-card" key={collection._id} onClick={() => openCollection(collection)}>
                    <div className="media-explorer-preview">
                      {preview?.asset?.url ? (
                        <img src={`${preview.asset.url}?w=600&fit=max`} alt="" />
                      ) : (
                        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M7 16h19l6 7h25v27H7V16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    <strong>{collection.title}</strong>
                    <small>{collection.assetIds?.length || 0} assets</small>
                  </button>
                );
              })}
            </div>
          ) : isCaseStudy && !caseSection ? (
            <div className="media-explorer-grid">
              {(["media", "marketing"] as const).map((section) => (
                <button className="media-explorer-card" key={section} onClick={() => setCaseSection(section)}>
                  <div className="media-explorer-preview media-explorer-folder-icon" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none"><path d="M7 16h19l6 7h25v27H7V16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </div>
                  <strong>{section === "media" ? "Case Study Media" : "Case Study Marketing"}</strong>
                  <small>{section === "media" ? caseMediaCount : caseMarketingCount} assets</small>
                </button>
              ))}
            </div>
          ) : visible.length ? (
            <div className="media-grid">
              {visible.map((asset) => {
                const binary = asset.asset;
                return (
                  <article className="media-card" key={asset._id}>
                    <button
                      className="media-card-main"
                      onClick={() =>
                        setSelected({
                          ...asset,
                          url: binary?.url,
                          mimeType: binary?.mimeType,
                          size: binary?.size,
                          _type: binary?.mimeType?.startsWith("image/")
                            ? "sanity.imageAsset"
                            : "sanity.fileAsset",
                        })
                      }
                      aria-label={`Open ${asset.title || binary?.originalFilename || "asset"} details`}
                    >
                    <div className="media-thumb">
                      {binary?.mimeType?.startsWith("image/") && binary.url ? (
                        <img
                          src={`${binary.url}?w=600&fit=max`}
                          alt={asset.altText || asset.title || ""}
                        />
                      ) : binary?.mimeType?.startsWith("video/") &&
                        binary.url ? (
                        <video src={binary.url} muted preload="metadata" />
                      ) : (
                        <span className="media-file-icon">↧</span>
                      )}
                      {binary?.mimeType?.startsWith("video/") && (
                        <span className="media-type">
                          {binary.mimeType.split("/")[1]?.toUpperCase() || "VIDEO"}
                        </span>
                      )}
                    </div>
                    <div className="media-card-copy">
                      <strong>
                        {asset.title ||
                          binary?.originalFilename ||
                          "Untitled asset"}
                      </strong>
                      <small>
                        {asset.collections?.[0]?.title || (isMarketingAsset(asset, collections)
                          ? asset.asset?.mimeType?.startsWith("video/") ? "Marketing Videos" : "Marketing Posts"
                          : "Unsorted")}
                        {asset.collections && asset.collections.length > 1
                          ? ` +${asset.collections.length - 1}`
                          : ""}
                      </small>
                    </div>
                    </button>
                    {binary?.mimeType?.startsWith("image/") && binary.url && (
                      <button
                        className="media-copy-image"
                        data-copied={copiedId === asset._id}
                        type="button"
                        aria-label={copiedId === asset._id ? "Image copied" : `Copy ${asset.title || "image"}`}
                        title={copiedId === asset._id ? "Copied" : "Copy image"}
                        onClick={() => void copyImage(asset)}
                      >
                        {copiedId === asset._id ? (
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <rect x="7" y="6" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M13 6V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        )}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="media-empty">
              <strong>No assets yet</strong>
              <span>This folder has no media yet.</span>
              {!MEDIA_READ_ONLY && (showAllAssets || activeFolder === "branding" || marketingSection || caseSection) && <button className="btn" onClick={() => inputRef.current?.click()}>
                Upload first asset
              </button>}
            </div>
          )}
        </section>
      </div>
      {selected && (
        <AssetDetail
          asset={selected}
          collections={collections}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </main>
  );
}

function AssetDetail({
  asset,
  collections,
  onClose,
  onSaved,
}: {
  asset: Asset;
  collections: Collection[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const binary = asset.asset;
  const [form, setForm] = useState({
    title: asset.title || "",
    description: asset.description || "",
    altText: asset.altText || "",
    usageNotes: asset.usageNotes || "",
    tags: (asset.tags || []).join(", "),
    isMarketing: isMarketingAsset(asset, collections),
    marketingCaseStudyIds: collections.filter((collection) => collection.kind === "caseStudy" &&
      collection.caseStudyMarketingIds?.includes(asset._id)).map((collection) => collection._id),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  async function copyLink() {
    if (!asset.url) return;
    try {
      await navigator.clipboard.writeText(asset.url);
      setLinkStatus("Link copied");
    } catch {
      setLinkStatus("Unable to copy link");
    }
  }
  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/media/assets/${asset._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          marketingMediaType: collections.some((collection) => collection.marketingVideoIds?.includes(asset._id))
            || asset.asset?.mimeType?.startsWith("video/") ? "video" : "post",
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to save asset");
      await onSaved();
      onClose();
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Unable to save asset");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="media-dialog-backdrop" onClick={onClose}>
      <aside className="media-detail" onClick={(e) => e.stopPropagation()}>
        <button className="media-close" onClick={onClose}>
          ×
        </button>
        <div className="media-detail-preview">
          {asset._type === "sanity.imageAsset" && asset.url ? (
            <img src={asset.url} alt={asset.altText || ""} />
          ) : asset.mimeType?.startsWith("video/") && asset.url ? (
            <video src={asset.url} controls />
          ) : (
            <span className="media-file-icon">↧</span>
          )}
        </div>
        <div className="media-detail-body">
          <div className="eyebrow">Asset details</div>
          <h2>{asset.title || binary?.originalFilename || "Untitled asset"}</h2>
          {MEDIA_READ_ONLY ? (
            <dl className="media-detail-readonly">
              {(["description", "altText", "tags", "usageNotes"] as const).map((key) => {
                const value = key === "tags" ? asset.tags?.join(", ") : asset[key];
                return value ? <div key={key}><dt>{key === "altText" ? "Alt text" : key === "usageNotes" ? "Usage notes" : key[0].toUpperCase() + key.slice(1)}</dt><dd>{value}</dd></div> : null;
              })}
            </dl>
          ) : (<>{(
            ["title", "description", "altText", "tags", "usageNotes"] as const
          ).map((key) => (
            <label key={key}>
              {key === "altText"
                ? "Alt text"
                : key === "usageNotes"
                  ? "Usage notes"
                  : key[0].toUpperCase() + key.slice(1)}
              {key === "description" || key === "usageNotes" ? (
                <textarea
                  className="field"
                  rows={3}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              ) : (
                <input
                  className="field"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              )}
            </label>
          ))}</>)}
          {!MEDIA_READ_ONLY && <div className="media-detail-links">
            <label className="media-link-option">
              <input type="checkbox" checked={form.isMarketing}
                onChange={(event) => setForm({ ...form, isMarketing: event.target.checked })} />
              Show in Marketing
            </label>
            {collections.some((collection) => collection.kind === "caseStudy") && (
              <fieldset>
                <legend>Show in Case Study Marketing</legend>
                {collections.filter((collection) => collection.kind === "caseStudy").map((collection) => (
                  <label className="media-link-option" key={collection._id}>
                    <input type="checkbox" checked={form.marketingCaseStudyIds.includes(collection._id)}
                      onChange={(event) => setForm({ ...form, marketingCaseStudyIds: event.target.checked
                        ? [...form.marketingCaseStudyIds, collection._id]
                        : form.marketingCaseStudyIds.filter((id) => id !== collection._id) })} />
                    {collection.title}
                  </label>
                ))}
              </fieldset>
            )}
          </div>}
          <div className="media-detail-meta">
            <span>{asset.mimeType || binary?.mimeType || "Unknown type"}</span>
            <span>
              {asset.size ? `${Math.round(asset.size / 1024)} KB` : ""}
            </span>
          </div>
          <div className="media-detail-actions">
            {!MEDIA_READ_ONLY && <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save details"}
            </button>}
            {asset.url && (
              <button className="btn" type="button" onClick={() => void copyLink()}>
                Copy link
              </button>
            )}
            {asset.url && (
              <a
                className="btn solid"
                href={`${asset.url}?dl=`}
                target="_blank"
                rel="noreferrer"
              >
                Download original
              </a>
            )}
            <span className="media-link-status" role="status">{linkStatus}</span>
          </div>
          {!MEDIA_READ_ONLY && saveError && <p className="media-error" role="alert">{saveError}</p>}
          <div className="media-detail-collections">
            <div className="eyebrow">In collections</div>
            {isMarketingAsset(asset, collections) && <span className="badge">{collections.some((collection) => collection.marketingVideoIds?.includes(asset._id)) ? "Marketing Videos" : "Marketing Posts"}</span>}
            {collections.filter((collection) => collection.kind === "caseStudy" && collection.caseStudyMarketingIds?.includes(asset._id)).map((item) => (
              <span className="badge" key={`marketing-${item._id}`}>{item.title} · Case Study Marketing</span>
            ))}
            {(asset.collections || []).map((c) => (
              <span className="badge" key={c._id}>
                {c.title}
              </span>
            ))}
            {!asset.collections?.length && !isMarketingAsset(asset, collections) && (
              <span className="ctl-hint">Unsorted</span>
            )}
            {!MEDIA_READ_ONLY && collections.length > 0 && (
              <span className="ctl-hint">
                Upload into a collection from the left panel.
              </span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

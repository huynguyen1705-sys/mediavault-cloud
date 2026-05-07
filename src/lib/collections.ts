import prisma from "@/lib/db";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";

interface ClusterResult {
  name: string;
  type: "time" | "location" | "content" | "filetype";
  rules: Record<string, any>;
  fileIds: string[];
  thumbnails: string[];
}

/**
 * Generate Smart Collections for a user.
 * Clusters files by: time period, GPS location, content similarity, file type.
 */
export async function generateCollections(userId: string): Promise<{ created: number; updated: number }> {
  // Fetch all user files with metadata
  const files = await prisma.file.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      mimeType: true,
      fileSize: true,
      metadata: true,
      createdAt: true,
      folderId: true,
      thumbnailPath: true,
      folder: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (files.length < 2) return { created: 0, updated: 0 };

  const clusters: ClusterResult[] = [];

  // ── Strategy 1: Time-based clustering ──
  // Group files uploaded on the same day (if 3+ files)
  const dateGroups = new Map<string, typeof files>();
  files.forEach(f => {
    const key = f.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
    const group = dateGroups.get(key) || [];
    group.push(f);
    dateGroups.set(key, group);
  });

  for (const [date, group] of dateGroups) {
    if (group.length >= 3) {
      const d = new Date(date);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const name = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      
      // Check file types for better naming
      const imageCount = group.filter(f => f.mimeType?.startsWith("image/")).length;
      const videoCount = group.filter(f => f.mimeType?.startsWith("video/")).length;
      
      let displayName = name;
      if (imageCount > 0 && imageCount === group.length) displayName = `📸 Photos — ${name}`;
      else if (videoCount > 0 && videoCount === group.length) displayName = `🎬 Videos — ${name}`;
      else if (imageCount + videoCount > 0) displayName = `📷 Media — ${name}`;
      else displayName = `📁 ${name}`;

      clusters.push({
        name: displayName,
        type: "time",
        rules: { date, strategy: "daily" },
        fileIds: group.map(f => f.id),
        thumbnails: group
          .filter(f => f.thumbnailPath)
          .slice(0, 4)
          .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`),
      });
    }
  }

  // ── Strategy 2: Weekly batches (if day groups are too small) ──
  const weekGroups = new Map<string, typeof files>();
  files.forEach(f => {
    const d = f.createdAt;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    const group = weekGroups.get(key) || [];
    group.push(f);
    weekGroups.set(key, group);
  });

  for (const [weekStart, group] of weekGroups) {
    // Only if week has 5+ files AND no daily cluster already covers these files
    if (group.length >= 5) {
      const alreadyClustered = group.filter(f =>
        clusters.some(c => c.type === "time" && c.fileIds.includes(f.id))
      );
      const unclustered = group.filter(f => !alreadyClustered.includes(f));
      
      if (unclustered.length >= 3) {
        const d = new Date(weekStart);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        clusters.push({
          name: `📅 Week of ${monthNames[d.getMonth()]} ${d.getDate()}`,
          type: "time",
          rules: { weekStart, strategy: "weekly" },
          fileIds: unclustered.map(f => f.id),
          thumbnails: unclustered
            .filter(f => f.thumbnailPath)
            .slice(0, 4)
            .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`),
        });
      }
    }
  }

  // ── Strategy 3: Location-based clustering (GPS) ──
  const gpsFiles = files.filter(f => {
    const meta = f.metadata as any;
    return meta?.gps?.lat && meta?.gps?.lng;
  });

  if (gpsFiles.length >= 2) {
    // Simple distance-based clustering (< 0.5 degree ≈ ~50km)
    const locationClusters: typeof files[] = [];
    const used = new Set<string>();

    for (const file of gpsFiles) {
      if (used.has(file.id)) continue;
      const meta = file.metadata as any;
      const lat = meta.gps.lat;
      const lng = meta.gps.lng;

      const nearby = gpsFiles.filter(f => {
        if (used.has(f.id)) return false;
        const m = f.metadata as any;
        return Math.abs(m.gps.lat - lat) < 0.5 && Math.abs(m.gps.lng - lng) < 0.5;
      });

      if (nearby.length >= 2) {
        nearby.forEach(f => used.add(f.id));
        locationClusters.push(nearby);
      }
    }

    for (const group of locationClusters) {
      const meta = (group[0].metadata as any);
      const lat = meta.gps.lat.toFixed(2);
      const lng = meta.gps.lng.toFixed(2);

      clusters.push({
        name: `📍 Location ${lat}°, ${lng}°`,
        type: "location",
        rules: { lat: meta.gps.lat, lng: meta.gps.lng, radius: 0.5 },
        fileIds: group.map(f => f.id),
        thumbnails: group
          .filter(f => f.thumbnailPath)
          .slice(0, 4)
          .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`),
      });
    }
  }

  // ── Strategy 4: File type grouping ──
  const typeGroups = new Map<string, typeof files>();
  files.forEach(f => {
    const baseType = f.mimeType?.split("/")[0] || "other";
    const group = typeGroups.get(baseType) || [];
    group.push(f);
    typeGroups.set(baseType, group);
  });

  const typeIcons: Record<string, string> = {
    image: "🖼️", video: "🎬", audio: "🎵", application: "📄", text: "📝",
  };

  for (const [type, group] of typeGroups) {
    if (group.length >= 3) {
      // Sub-group by extension for more specific collections
      const extGroups = new Map<string, typeof files>();
      group.forEach(f => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "unknown";
        const eg = extGroups.get(ext) || [];
        eg.push(f);
        extGroups.set(ext, eg);
      });

      for (const [ext, extGroup] of extGroups) {
        if (extGroup.length >= 3) {
          clusters.push({
            name: `${typeIcons[type] || "📎"} ${ext.toUpperCase()} Files`,
            type: "filetype",
            rules: { mimeType: type, extension: ext },
            fileIds: extGroup.map(f => f.id),
            thumbnails: extGroup
              .filter(f => f.thumbnailPath)
              .slice(0, 4)
              .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`),
          });
        }
      }
    }
  }

  // ── Strategy 5: Camera-based grouping ──
  const cameraFiles = files.filter(f => {
    const meta = f.metadata as any;
    return meta?.camera;
  });

  const cameraGroups = new Map<string, typeof files>();
  cameraFiles.forEach(f => {
    const camera = (f.metadata as any).camera;
    const group = cameraGroups.get(camera) || [];
    group.push(f);
    cameraGroups.set(camera, group);
  });

  for (const [camera, group] of cameraGroups) {
    if (group.length >= 3) {
      clusters.push({
        name: `📷 ${camera}`,
        type: "content",
        rules: { camera, strategy: "device" },
        fileIds: group.map(f => f.id),
        thumbnails: group
          .filter(f => f.thumbnailPath)
          .slice(0, 4)
          .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`),
      });
    }
  }

  // ── Persist clusters to DB ──
  let created = 0, updated = 0;

  for (const cluster of clusters) {
    // Check if similar collection already exists
    const existing = await prisma.collection.findFirst({
      where: {
        userId,
        type: "auto",
        rules: { equals: cluster.rules },
      },
    });

    if (existing) {
      // Update existing
      await prisma.collection.update({
        where: { id: existing.id },
        data: {
          name: cluster.name,
          fileCount: cluster.fileIds.length,
          thumbnailMosaic: cluster.thumbnails,
        },
      });

      // Sync files
      await prisma.collectionFile.deleteMany({ where: { collectionId: existing.id } });
      if (cluster.fileIds.length > 0) {
        await prisma.collectionFile.createMany({
          data: cluster.fileIds.map(fileId => ({
            collectionId: existing.id,
            fileId,
          })),
          skipDuplicates: true,
        });
      }
      updated++;
    } else {
      // Create new
      const collection = await prisma.collection.create({
        data: {
          userId,
          name: cluster.name,
          type: "auto",
          rules: cluster.rules,
          fileCount: cluster.fileIds.length,
          thumbnailMosaic: cluster.thumbnails,
          isPinned: false,
        },
      });

      if (cluster.fileIds.length > 0) {
        await prisma.collectionFile.createMany({
          data: cluster.fileIds.map(fileId => ({
            collectionId: collection.id,
            fileId,
          })),
          skipDuplicates: true,
        });
      }
      created++;
    }
  }

  // Clean up empty auto collections
  await prisma.collection.deleteMany({
    where: { userId, type: "auto", fileCount: 0 },
  });

  return { created, updated };
}

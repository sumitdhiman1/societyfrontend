export async function downloadFile(e: React.MouseEvent, url: string, fileName: string) {
  e.preventDefault();
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;
  
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`Download proxy returned ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:image/")) return true;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  const nonImageExts = ["pdf", "zip", "rar", "tar", "gz", "7z", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "mp4", "mov", "avi", "mp3", "wav"];
  const ext = clean.split(".").pop() || "";
  if (nonImageExts.includes(ext)) return false;
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif", "ico"];
  if (imageExts.includes(ext)) return true;
  if (clean.includes("/image/upload/")) return true;
  return false;
}


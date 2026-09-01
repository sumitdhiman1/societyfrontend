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

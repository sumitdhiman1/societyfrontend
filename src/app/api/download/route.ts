import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dgg6e3flf",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Extracts publicId and resourceType from a Cloudinary URL
 */
function extractCloudinaryInfo(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const pathParts = url.pathname.split("/");
    const uploadIndex = pathParts.findIndex(part => part === "upload");
    
    if (uploadIndex === -1) return null;

    const resourceType = pathParts[uploadIndex - 1] === "raw" ? "raw" : "image";
    let remainingParts = pathParts.slice(uploadIndex + 1);
    
    // Remove version string (v123456) if present
    if (/^v\d+$/.test(remainingParts[0])) {
      remainingParts.shift();
    }

    let publicId = decodeURIComponent(remainingParts.join("/"));
    
    // Remove file extension for images
    if (resourceType === "image") {
      const lastDotIndex = publicId.lastIndexOf(".");
      if (lastDotIndex > 0) {
        publicId = publicId.substring(0, lastDotIndex);
      }
    }

    return { publicId, resourceType };
  } catch (err) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  let filename = searchParams.get("filename") || "download";

  if (!rawUrl) {
    return NextResponse.json({ error: "url param is missing" }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch (err) {
    return NextResponse.json({ error: "Invalid URL encoding" }, { status: 400 });
  }

  // Force HTTPS
  let targetUrl = decodedUrl.replace(/^http:\/\//i, "https://");

  // Handle Cloudinary private downloads if secret is configured
  if (process.env.CLOUDINARY_API_SECRET) {
    const info = extractCloudinaryInfo(targetUrl);
    if (info && info.publicId) {
      targetUrl = cloudinary.v2.utils.private_download_url(info.publicId, "", {
        resource_type: info.resourceType,
        type: "upload",
        attachment: true
      });
    }
  }

  console.log(`[DOWNLOAD] Fetching: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
      headers: { Accept: "*/*" }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[DOWNLOAD] Cloudinary returned ${response.status}. Response: ${errorText.slice(0, 150)}`);
      return NextResponse.json(
        { error: `Cloudinary returned ${response.status}`, url: targetUrl },
        { status: 502 }
      );
    }

    // Handle PDF naming and Content-Type
    const isPdf = decodedUrl.toLowerCase().includes(".pdf");
    if (isPdf && !filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    // Sanitize filename
    const safeFilename = decodeURIComponent(filename)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .trim();

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": isPdf ? "application/pdf" : (response.headers.get("content-type") || "application/octet-stream"),
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff"
      }
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Proxy failure: ${message}` }, { status: 502 });
  }
}

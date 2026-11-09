import { isTauri } from "@/api/config";

/** Windows does not allow these characters in file names. */
export function safeFileName(title: string, extension: string): string {
  const base = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `Voxta - ${base || "Meeting"}.${extension}`;
}

/** Saves a PDF. The desktop app shows a native Save dialog, a browser downloads it. */
export async function savePdf(blob: Blob, fileName: string): Promise<"saved" | "cancelled"> {
  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: fileName, filters: [{ name: "PDF document", extensions: ["pdf"] }] });
    if (!path) return "cancelled";
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return "saved";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "saved";
}
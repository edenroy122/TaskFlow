const path = require("path");
const fs = require("fs");
const { supabase, supabaseBucket, isSupabaseConfigured } = require("../../config/supabase");

/**
 * Upload an attachment file to Supabase Storage or fallback to local disk.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer from multer
 * @param {string} params.originalName - Original file name
 * @param {string} params.mimeType - File MIME type
 * @param {string} params.folder - Folder path in bucket (e.g. "projects/123", "tasks/456")
 * @returns {Promise<{ fileName: string, originalName: string, filePath: string, fileUrl: string, fileType: string, fileSize: number, storageProvider: "supabase" | "local" }>}
 */
const uploadAttachment = async ({ buffer, originalName, mimeType, folder = "general" }) => {
    const ext = path.extname(originalName).toLowerCase();
    const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase}${ext}`;
    const storagePath = `${folder}/${fileName}`;

    if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.storage
            .from(supabaseBucket)
            .upload(storagePath, buffer, {
                contentType: mimeType || "application/octet-stream",
                upsert: true
            });

        if (error) {
            console.error("Supabase Storage upload error:", error);
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from(supabaseBucket)
            .getPublicUrl(storagePath);

        return {
            fileName,
            originalName,
            filePath: storagePath,
            fileUrl: publicUrlData?.publicUrl || "",
            fileType: mimeType,
            fileSize: buffer.length,
            storageProvider: "supabase"
        };
    }

    // Fallback to local storage if Supabase is not configured
    const localDir = path.join(process.cwd(), "uploads", folder);
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }
    const localFilePath = path.join(localDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const normalizedFolder = folder.replace(/\\/g, "/");
    return {
        fileName,
        originalName,
        filePath: localFilePath,
        fileUrl: `/uploads/${normalizedFolder}/${fileName}`,
        fileType: mimeType,
        fileSize: buffer.length,
        storageProvider: "local"
    };
};

/**
 * Delete an attachment from Supabase Storage or local disk.
 *
 * @param {Object} params
 * @param {string} params.filePath - Storage path in bucket or local file path
 * @param {string} [params.storageProvider] - "supabase" or "local"
 */
const deleteAttachment = async ({ filePath, storageProvider }) => {
    const isSupabase = storageProvider === "supabase" || (!filePath.includes(":") && !fs.existsSync(filePath));

    if (isSupabase && isSupabaseConfigured && supabase) {
        try {
            const { error } = await supabase.storage
                .from(supabaseBucket)
                .remove([filePath]);
            if (error) {
                console.warn(`Supabase delete warning: ${error.message}`);
            }
        } catch (err) {
            console.warn("Error deleting file from Supabase:", err.message);
        }
    }

    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.warn("Failed to delete local file:", err.message);
        }
    }
};

/**
 * Get download target URL or local file path.
 *
 * @param {Object} params
 * @param {string} params.filePath - Storage path or local file path
 * @param {string} params.originalName - File's original download name
 * @param {string} [params.storageProvider] - "supabase" or "local"
 * @returns {Promise<{ type: "redirect", url: string } | { type: "file", path: string } | null>}
 */
const getAttachmentDownloadTarget = async ({ filePath, originalName, storageProvider }) => {
    const isSupabase = storageProvider === "supabase" || (!filePath.includes(":") && !fs.existsSync(filePath));

    if (isSupabase && isSupabaseConfigured && supabase) {
        // Try signed URL first (in case bucket is private or has RLS), with download query param
        try {
            const { data: signedData } = await supabase.storage
                .from(supabaseBucket)
                .createSignedUrl(filePath, 3600, { download: originalName || true });

            if (signedData?.signedUrl) {
                return { type: "redirect", url: signedData.signedUrl };
            }
        } catch (err) {
            console.warn("Supabase createSignedUrl error:", err.message);
        }

        // Fallback to public URL with download query param
        const { data: publicData } = supabase.storage
            .from(supabaseBucket)
            .getPublicUrl(filePath, { download: originalName || true });

        if (publicData?.publicUrl) {
            return { type: "redirect", url: publicData.publicUrl };
        }
    }

    // Check if local file exists on disk
    if (filePath) {
        const resolvedPath = path.resolve(filePath);
        if (fs.existsSync(resolvedPath)) {
            return { type: "file", path: resolvedPath };
        }
    }

    return null;
};

module.exports = {
    uploadAttachment,
    deleteAttachment,
    getAttachmentDownloadTarget
};

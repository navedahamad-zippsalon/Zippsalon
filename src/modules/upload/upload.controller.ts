import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure base public folder exists
const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const sanitizeFolder = (folderName?: string): string => {
    if (!folderName || typeof folderName !== "string") return "misc";
    const cleaned = folderName.replace(/[^a-zA-Z0-9_-]/g, "");
    return cleaned.length > 0 ? cleaned : "misc";
};

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/quicktime",
]);

const ALLOWED_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".pdf",
    ".mp4",
    ".webm",
    ".mov",
]);

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const folder = sanitizeFolder(req.query.folder as string);
        const uploadPath = path.join(publicDir, folder);
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
            cb(null, true);
        } else {
            const err = new Error("Invalid file type. Only JPEG, PNG, WEBP, GIF, PDF, MP4, WEBM, and MOV are allowed.");
            (err as any).status = 400;
            cb(err);
        }
    }
});

export const uploadFile = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const folder = (req.query.folder as string) || "misc";
        
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/public/${folder}/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                url: fileUrl
            }
        });
    } catch (err) {
        next(err);
    }
};

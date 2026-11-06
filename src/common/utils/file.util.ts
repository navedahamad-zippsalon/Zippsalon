import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const saveBase64Image = async (base64String: string, folder: string = "services"): Promise<string> => {
    // Remove data:image/png;base64, if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "services";
    const fileName = `${uuidv4()}.png`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `/public/uploads/${safeFolder}/${fileName}`;
};

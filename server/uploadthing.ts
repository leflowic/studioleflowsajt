import { createUploadthing, type FileRouter } from "uploadthing/express";
import type { Request, Response } from "express";

const f = createUploadthing();

// Auth middleware for UploadThing - check if user is authenticated
const auth = (req: Request, res: Response) => {
  // Passport attaches user to req.user
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    throw new Error("Neautorizovan pristup");
  }
  
  // Check if email is verified
  const user = req.user as any;
  if (!user.emailVerified) {
    throw new Error("Morate verifikovati email adresu");
  }
  
  return { userId: user.id, username: user.username };
};

// Our file upload router
export const uploadRouter = {
  // Audio file uploader for giveaway submissions - Only MP3 files allowed
  audioUploader: f({ 
    "audio/mpeg": { 
      maxFileSize: "16MB",
      maxFileCount: 1,
    } 
  })
    .middleware(async ({ req, res }) => {
      // Authenticate user
      const userMetadata = auth(req, res);
      
      // Additional validation will happen in onUploadComplete
      return userMetadata;
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("MP3 upload complete!");
      console.log("User ID:", metadata.userId);
      console.log("File URL:", file.url);
      console.log("File name:", file.name);
      console.log("File type:", file.type);
      
      // Extra validation: ensure it's actually an MP3 file
      if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith('.mp3')) {
        throw new Error("Dozvoljeni su samo MP3 fajlovi");
      }
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

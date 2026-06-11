import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../../../server/uploadthing";

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>({
    headers: () => {
      const token = localStorage.getItem("auth_token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  });

import { storage, storageRef, uploadBytes, getDownloadURL } from "./firebase";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadCommunityImage(
  file: File,
  uid: string,
  scope: "posts" | "comments"
): Promise<string> {
  if (!storage) throw new Error("Image upload is offline right now.");
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large. Max 5 MB.");
  }
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_").slice(-40);
  const path = `community/${scope}/${uid}/${Date.now()}-${safeName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file, { contentType: file.type });
  return await getDownloadURL(ref);
}

export const MAX_IMAGE_BYTES = MAX_BYTES;

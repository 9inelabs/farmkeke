// Photo capture and upload to Convex storage (F-06 documents, F-70 farm photo).
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type PhotoSource = "camera" | "library";

/** Opens the camera or gallery. Returns local URIs, or [] if cancelled or not allowed. */
export async function pickPhotos(source: PhotoSource, multiple = false): Promise<string[]> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return [];
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    return result.canceled ? [] : result.assets.map((a) => a.uri);
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
  });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

/** Whether the camera primer (F-06a) should be shown before the system prompt. */
export async function shouldExplainCamera(): Promise<boolean> {
  const permission = await ImagePicker.getCameraPermissionsAsync();
  return !permission.granted && permission.canAskAgain;
}

/** Shrinks a photo to at most 1600px wide as JPEG, so uploads stay quick on mobile data. */
export async function preparePhoto(uri: string): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: 1600, height: null });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.7 });
  return result.uri;
}

/**
 * Uploads a local file to a Convex upload URL, reporting progress (0–1).
 * Resolves with the storage id.
 */
export async function uploadFile(uploadUrl: string, uri: string, onProgress?: (fraction: number) => void): Promise<string> {
  // In the browser preview a picked photo is a blob: or data: URL; send its bytes.
  const body = Platform.OS === "web" ? await (await fetch(uri)).blob() : ({ uri, type: "image/jpeg", name: "photo.jpg" } as unknown as Blob);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(`Upload failed (${xhr.status})`);
        resolve((JSON.parse(xhr.responseText) as { storageId: string }).storageId);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network"));
    // React Native's XHR sends a local file when given { uri, type, name }.
    xhr.send(body);
  });
}

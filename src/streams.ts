/**
 * Get a camera stream with the given constraints.
 *
 * @param constraints - MediaStreamConstraints for getUserMedia
 * @returns Promise that resolves to MediaStream
 *
 * @example
 * ```typescript
 * const stream = await useCamera({
 *   video: {
 *     facingMode: { ideal: "user" },
 *     width: { ideal: 1280 },
 *     height: { ideal: 720 },
 *     frameRate: { ideal: 30 }
 *   },
 *   audio: false
 * });
 * ```
 */
export async function useCamera(constraints: MediaStreamConstraints = { video: true }): Promise<MediaStream> {
  try {
    console.log("[RFStreams] requesting with", constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("[RFStreams] got stream", stream.getVideoTracks().map(t => ({ id: t.id, label: t.label })));
    return stream;
  } catch (err) {
    console.warn("[RFStreams] failed, falling back", err);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    console.log("[RFStreams] fallback stream", stream.getVideoTracks().map(t => ({ id: t.id, label: t.label })));
    return stream;
  }
}
  
export function stopStream(stream: MediaStream | null | undefined): void {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    console.log("[RFStreams] Stream stopped");
  }
}

/**
 * Roboflow Inference Client
 *
 * Lightweight client library for Roboflow's hosted inference API.
 * Provides WebRTC streaming, HTTP client, and camera utilities.
 */

// Re-export everything from inference-api (main entry point)
export * from './inference-api';

// Export webrtc and streams as namespace objects
import * as webrtc from './webrtc';
import * as streams from './streams';

export { webrtc, streams };

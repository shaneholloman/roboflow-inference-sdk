import { connectors, webrtc } from '@roboflow/inference-sdk';
import type { WebRTCOutputData } from '@roboflow/inference-sdk';

// Get DOM elements
const apiKeyInput = document.getElementById("apiKeyInput") as HTMLInputElement;
const serverUrlInput = document.getElementById("serverUrlInput") as HTMLInputElement;
const rtspUrlInput = document.getElementById("rtspUrlInput") as HTMLInputElement;
const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;
const videoContainer = document.getElementById("videoContainer") as HTMLElement;
const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
const resultsContainer = document.getElementById("resultsContainer") as HTMLElement;
const resultsList = document.getElementById("resultsList")!;

// Track active connection
let activeConnection: Awaited<ReturnType<typeof webrtc.useRtspStream>> | null = null;

// Workflow specification for object detection
const WORKFLOW_SPEC = {
    "version": "1.0",
    "inputs": [
        {
            "type": "InferenceImage",
            "name": "image"
        }
    ],
    "steps": [
        {
            "type": "roboflow_core/roboflow_object_detection_model@v2",
            "name": "model",
            "images": "$inputs.image",
            "model_id": "rfdetr-medium"
        },
        {
            "type": "roboflow_core/property_definition@v1",
            "name": "count",
            "data": "$steps.model.predictions",
            "operations": [
                {
                    "type": "SequenceLength"
                }
            ]
        },
        {
            "type": "roboflow_core/bounding_box_visualization@v1",
            "name": "visualization",
            "image": "$inputs.image",
            "predictions": "$steps.model.predictions"
        }
    ],
    "outputs": [
        {
            "type": "JsonField",
            "name": "predictions",
            "selector": "$steps.model.predictions"
        },
        {
            "type": "JsonField",
            "name": "count",
            "selector": "$steps.count.output"
        },
        {
            "type": "JsonField",
            "name": "output_image",
            "selector": "$steps.visualization.image"
        }
    ]
};

/**
 * Update status display
 */
function setStatus(text: string) {
    statusEl.textContent = text;
    console.log("[Status]", text);
}

/**
 * Add a result to the results list
 */
function addResult(data: WebRTCOutputData) {
    const item = document.createElement("div");
    item.className = "result-item";

    const frameId = data.video_metadata?.frame_id ?? "?";
    const count = (data.serialized_output_data?.count as number) ?? 0;

    item.textContent = `#${frameId} - ${count} object(s)`;

    // Add newest at the top
    resultsList.prepend(item);

    // Limit results shown
    while (resultsList.children.length > 50) {
        resultsList.removeChild(resultsList.lastChild!);
    }
}

/**
 * Clear results
 */
function clearResults() {
    resultsList.innerHTML = "";
}

/**
 * Start RTSP stream connection
 */
async function startConnection() {
    const rtspUrl = rtspUrlInput.value.trim();
    if (!rtspUrl) {
        alert("Please enter an RTSP URL");
        rtspUrlInput.focus();
        return;
    }

    // Validate URL format
    if (!rtspUrl.startsWith("rtsp://") && !rtspUrl.startsWith("rtsps://")) {
        alert("Invalid RTSP URL: must start with rtsp:// or rtsps://");
        rtspUrlInput.focus();
        return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Please enter your Roboflow API key");
        apiKeyInput.focus();
        return;
    }

    // Reset UI
    connectBtn.disabled = true;
    stopBtn.disabled = false;
    resultsContainer.style.display = "block";
    clearResults();
    setStatus("Connecting...");

    try {
        const serverUrl = serverUrlInput.value.trim();
        const connectorOptions = serverUrl ? { serverUrl } : {};
        const connector = connectors.withApiKey(apiKey, connectorOptions);

        let framesReceived = 0;

        activeConnection = await webrtc.useRtspStream({
            rtspUrl,
            connector,
            wrtcParams: {
                workflowSpec: WORKFLOW_SPEC,
                imageInputName: "image",
                streamOutputNames: ["output_image"],
                dataOutputNames: ["predictions", "count"],
                requestedPlan: "webrtc-gpu-medium"
            },
            onData: (data) => {
                framesReceived++;
                console.log("[Data]", data);
                addResult(data);
                setStatus(`Streaming... (${framesReceived} frames received)`);
            }
        });

        setStatus("Connected to RTSP stream");

        // Show video container and attach remote stream
        videoContainer.style.display = "block";
        const remoteStream = await activeConnection.remoteStream();
        remoteVideo.srcObject = remoteStream;

    } catch (err) {
        console.error("[Error]", err);
        setStatus(`Error: ${(err as Error).message}`);
        cleanup();
    }
}

/**
 * Stop streaming
 */
async function stopStreaming() {
    setStatus("Stopping...");
    await cleanup();
    setStatus("Stopped");
}

/**
 * Cleanup connection and reset UI
 */
async function cleanup() {
    if (activeConnection) {
        try {
            await activeConnection.cleanup();
        } catch (err) {
            console.error("[Cleanup error]", err);
        }
        activeConnection = null;
    }

    // Clear video
    remoteVideo.srcObject = null;
    videoContainer.style.display = "none";

    connectBtn.disabled = false;
    stopBtn.disabled = true;
}

// Attach event listeners
connectBtn.addEventListener("click", startConnection);
stopBtn.addEventListener("click", stopStreaming);

// Cleanup on page unload
window.addEventListener("pagehide", cleanup);
window.addEventListener("beforeunload", cleanup);

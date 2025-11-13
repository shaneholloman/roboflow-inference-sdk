# @roboflow/inference-sdk

Lightweight client package for Roboflow inference via WebRTC streaming and hosted API.

This package provides WebRTC streaming capabilities and hosted inference API access without bundling TensorFlow or local inference models, making it ideal for production applications.

## Installation

```bash
npm install @roboflow/inference-sdk
```

## Quick Start

### Basic WebRTC Streaming Example

```typescript
import { useStream } from '@roboflow/inference-sdk/webrtc';
import { connectors } from '@roboflow/inference-sdk/api';
import { useCamera } from '@roboflow/inference-sdk/streams';

// Create connector (use proxy for production!)
const connector = connectors.withApiKey("your-api-key");

// Get camera stream
const stream = await useCamera({
  video: {
    facingMode: { ideal: "environment" }
  }
});

// Start WebRTC connection
const connection = await useStream({
  source: stream,
  connector,
  wrtcParams: {
    workflowSpec: {
      // Your workflow specification
      version: "1.0",
      inputs: [{ type: "InferenceImage", name: "image" }],
      steps: [/* ... */],
      outputs: [/* ... */]
    },
    imageInputName: "image",
    streamOutputNames: ["output"],
    dataOutputNames: ["predictions"]
  },
  onData: (data) => {
    // Receive real-time inference results
    console.log("Inference results:", data);
  }
});

// Display processed video
const remoteStream = await connection.remoteStream();
videoElement.srcObject = remoteStream;

// Clean up when done
await connection.cleanup();
```

## Security Best Practices

### ⚠️ API Key Security

**NEVER expose your API key in frontend code for production applications.**

The `connectors.withApiKey()` method is convenient for demos and testing, but it exposes your API key in the browser. For production applications, always use a backend proxy:

### Using a Backend Proxy (Recommended)

**Frontend:**
```typescript
import { useStream } from '@roboflow/inference-sdk/webrtc';
import { connectors } from '@roboflow/inference-sdk/api';

// Use proxy endpoint instead of direct API key
const connector = connectors.withProxyUrl('/api/init-webrtc');

const connection = await useStream({
  source: stream,
  connector,
  wrtcParams: {
    workflowSpec: { /* ... */ },
    imageInputName: "image",
    streamOutputNames: ["output"]
  }
});
```

**Backend (Express example):**
```typescript
import { InferenceHTTPClient } from '@roboflow/inference-sdk/api';

app.post('/api/init-webrtc', async (req, res) => {
  const { offer, wrtcParams } = req.body;

  // API key stays secure on the server
  const client = InferenceHTTPClient.init({
    apiKey: process.env.ROBOFLOW_API_KEY
  });

  const answer = await client.initializeWebrtcWorker({
    offer,
    workflowSpec: wrtcParams.workflowSpec,
    workspaceName: wrtcParams.workspaceName,
    workflowId: wrtcParams.workflowId,
    config: {
      imageInputName: wrtcParams.imageInputName,
      streamOutputNames: wrtcParams.streamOutputNames,
      dataOutputNames: wrtcParams.dataOutputNames,
      threadPoolWorkers: wrtcParams.threadPoolWorkers
    }
  });

  res.json(answer);
});
```

## API Reference

### WebRTC Functions

#### `useStream(params)`

Establishes a WebRTC connection for real-time video inference.

**Parameters:**
- `source: MediaStream` - Input video stream (from camera or other source)
- `connector: Connector` - Connection method (withApiKey or withProxyUrl)
- `wrtcParams: WebRTCParams` - Workflow configuration
  - `workflowSpec?: WorkflowSpec` - Workflow specification object
  - `workspaceName?: string` - Workspace name (alternative to workflowSpec)
  - `workflowId?: string` - Workflow ID (alternative to workflowSpec)
  - `imageInputName?: string` - Input image name (default: "image")
  - `streamOutputNames?: string[]` - Output stream names
  - `dataOutputNames?: string[]` - Output data names
  - `threadPoolWorkers?: number` - Thread pool workers (default: 4)
- `onData?: (data: any) => void` - Callback for data output
- `options?: UseStreamOptions` - Additional options

**Returns:** `Promise<RFWebRTCConnection>`

### Connection Methods

#### `connection.remoteStream()`

Get the processed video stream from Roboflow.

**Returns:** `Promise<MediaStream>`

#### `connection.localStream()`

Get the local input video stream.

**Returns:** `MediaStream`

#### `connection.cleanup()`

Close the connection and clean up resources.

**Returns:** `Promise<void>`

#### `connection.reconfigureOutputs(config)`

Dynamically change stream and data outputs at runtime without restarting the connection.

**Parameters:**
- `config.streamOutput?: string[] | null` - Stream output names
  - `undefined` or not provided: Unchanged
  - `[]`: Auto-detect first valid image output
  - `["output_name"]`: Use specified output
  - `null`: Unchanged
- `config.dataOutput?: string[] | null` - Data output names
  - `undefined` or not provided: Unchanged
  - `[]`: Disable all data outputs
  - `["output_name"]`: Use specified outputs
  - `null`: Enable all data outputs

**Examples:**
```typescript
// Change to different stream output
connection.reconfigureOutputs({
  streamOutput: ["annotated_image"]
});

// Enable all data outputs
connection.reconfigureOutputs({
  dataOutput: null
});

// Disable all data outputs
connection.reconfigureOutputs({
  dataOutput: []
});

// Change both at once
connection.reconfigureOutputs({
  streamOutput: ["visualization"],
  dataOutput: ["predictions", "metadata"]
});
```

### Camera Functions

#### `useCamera(constraints)`

Access device camera with specified constraints.

**Parameters:**
- `constraints: MediaStreamConstraints` - Media constraints

**Returns:** `Promise<MediaStream>`

#### `stopStream(stream)`

Stop a media stream and release camera.

**Parameters:**
- `stream: MediaStream` - Stream to stop

## When to Use This Package

### Use `@roboflow/inference-sdk` when:
- Building production web applications
- You need WebRTC streaming inference
- You want a smaller bundle size
- You're deploying to browsers

### Use the full `inferencejs` package when:
- You need local inference with TensorFlow.js
- You want to run models offline in the browser
- You need both local and hosted inference options

## Resources

- [Roboflow Documentation](https://docs.roboflow.com/)
- [API Authentication Guide](https://docs.roboflow.com/api-reference/authentication)
- [Workflows Documentation](https://docs.roboflow.com/workflows)
- [GitHub Repository](https://github.com/roboflow/inferencejs)

## License

See the main repository for license information.

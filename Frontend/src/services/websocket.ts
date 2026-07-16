import { toast } from "sonner";

type WebSocketCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: { [event: string]: Set<WebSocketCallback> } = {};
  private reconnectTimeout: any = null;
  private token: string | null = null;
  private isManualDisconnect = false;

  private getWebSocketUrl(token: string): string {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL ?? "";
    
    let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsHost = window.location.host;
    let wsPath = "/api/v1/ws";
    
    if (apiBaseUrl) {
      try {
        // Handle absolute or relative URLs
        const absoluteUrl = apiBaseUrl.startsWith("http") 
          ? apiBaseUrl 
          : `${window.location.origin}${apiBaseUrl.startsWith("/") ? "" : "/"}${apiBaseUrl}`;
        const url = new URL(absoluteUrl);
        wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
        wsHost = url.host;
        
        // Extract base path, e.g. /api/v1 or /api or /
        let basePath = url.pathname;
        if (basePath.endsWith("/")) {
          basePath = basePath.slice(0, -1);
        }
        
        if (basePath.endsWith("/api/v1") || basePath.endsWith("/api")) {
          wsPath = `${basePath}/ws`;
        } else {
          wsPath = `${basePath}/api/v1/ws`;
        }
      } catch (e) {
        console.error("Failed to parse API base URL for WebSocket", e);
      }
    }
    
    // Normalize multiple slashes (excluding protocol)
    wsPath = wsPath.replace(/\/+/g, "/");
    
    return `${wsProtocol}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;
  }

  connect(token: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.isManualDisconnect = false;
    const url = this.getWebSocketUrl(token);

    console.log("[WS] Connecting to:", url.split("?")[0]);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("[WS] Connected successfully.");
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventName = data.event;

        if (eventName) {
          // Trigger callbacks for this specific event type
          if (this.listeners[eventName]) {
            this.listeners[eventName].forEach((callback) => callback(data));
          }

          // Handle global toast notifications
          if (eventName === "notification") {
            const title = data.title || "Notification received";
            const type = data.type || "info";
            
            if (type === "success") {
              toast.success(title);
            } else if (type === "error") {
              toast.error(title);
            } else {
              toast.info(title);
            }
          }
        }
      } catch (err) {
        console.error("[WS] Error parsing message:", err);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`[WS] Connection closed (code: ${event.code}).`);
      this.socket = null;

      // Attempt reconnection if not manually disconnected and token exists
      if (!this.isManualDisconnect && this.token) {
        console.log("[WS] Attempting reconnect in 3s...");
        this.reconnectTimeout = setTimeout(() => {
          if (this.token) this.connect(this.token);
        }, 3000);
      }
    };

    this.socket.onerror = (error) => {
      console.error("[WS] Connection error:", error);
    };
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.token = null;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    console.log("[WS] Manually disconnected.");
  }

  on(event: string, callback: WebSocketCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: WebSocketCallback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
      if (this.listeners[event].size === 0) {
        delete this.listeners[event];
      }
    }
  }
}

export const websocketService = new WebSocketService();
export default websocketService;

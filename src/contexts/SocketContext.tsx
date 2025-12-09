import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.233.159:5000";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection once
    if (!socketRef.current) {
      const socketInstance = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        forceNew: false,
        withCredentials: false,
      });

      socketRef.current = socketInstance;

      // Update state in a callback to avoid synchronous setState in effect
      // Use setTimeout to defer the state update
      setTimeout(() => {
        setSocket(socketInstance);
      }, 0);

      socketInstance.on("connect", () => {
        console.log("✅ Socket.IO connected at app level:", SOCKET_URL);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("❌ Socket.IO connection error:", {
          error: error.message,
          url: SOCKET_URL,
        });
      });

      socketInstance.on("error", (error) => {
        console.error("❌ Socket.IO error:", error);
      });
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // Only disconnect when app is fully closed
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}

"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

export default function SocketTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io({
      path: "/api/socket",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      setMessages(prev => [...prev, "Socket connected"]);
      
      // Join a test room
      socketInstance.emit("join", "test-agent");
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
      setMessages(prev => [...prev, "Socket disconnected"]);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
      setMessages(prev => [...prev, `Connection error: ${err.message}`]);
    });

    // Listen for test events
    socketInstance.on("test_event", (data) => {
      console.log("Received test event:", data);
      setMessages(prev => [...prev, `Received: ${JSON.stringify(data)}`]);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendTestEvent = () => {
    if (socket && isConnected) {
      const testData = {
        message: "Hello from client",
        timestamp: new Date().toISOString()
      };
      
      socket.emit("test_event", testData);
      setMessages(prev => [...prev, `Sent: ${JSON.stringify(testData)}`]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Socket.IO Test Page</h1>
      
      <div className="mb-4">
        <p>Connection Status: {isConnected ? 
          <span className="text-green-500 font-bold">Connected</span> : 
          <span className="text-red-500 font-bold">Disconnected</span>}
        </p>
      </div>
      
      <div className="mb-4">
        <Button 
          onClick={sendTestEvent}
          disabled={!isConnected}
        >
          Send Test Event
        </Button>
      </div>
      
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-4 h-80 overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Event Log:</h2>
        {messages.length === 0 ? (
          <p className="text-neutral-500">No events yet</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                {msg}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
